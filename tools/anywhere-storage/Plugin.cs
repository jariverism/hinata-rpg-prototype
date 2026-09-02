using BepInEx;
using BepInEx.Logging;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using System;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;

namespace HinataS1AnywhereStorage;

[BepInPlugin(PluginGuid, PluginName, PluginVersion)]
[BepInDependency("faospark.pkcore", BepInDependency.DependencyFlags.HardDependency)]
public sealed class Plugin : BasePlugin
{
    public const string PluginGuid = "hinata.s1anywherestorage";
    public const string PluginName = "Hinata S1 Anywhere Storage";
    public const string PluginVersion = "0.5.0-canary";

    private const int VK_F8 = 0x77;
    private const int RocMemberId = 85;
    private const int MaxRunnerFrames = 36000;

    private static ManualLogSource _logger;
    private static Harmony _harmony;
    private static MethodInfo _warehouseEntry;
    private static object _currentDelegate;
    private static bool _runnerActive;
    private static bool _previousF8Down;
    private static int _frameCounter;
    private static int _runnerFrames;
    private static int _sameStateFrames;
    private static string _lastStateLabel = "";
    private static DateTime _lastAttemptUtc = DateTime.MinValue;

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    public override void Load()
    {
        _logger = base.Log;
        _harmony = new Harmony(PluginGuid);

        _logger.LogInfo($"[{PluginName}] Loading v{PluginVersion}");
        _logger.LogInfo("[AnywhereStorage] v0.5 uses the original public azukari_demo state-machine entry. It no longer calls azukari_start directly.");
        _logger.LogInfo("[AnywhereStorage] Safety: Roc recruited + Suikoden Fix GSD1 Map free-roam before starting.");

        try
        {
            var pkPlugin = FindType("PKCore.Plugin");
            var update = pkPlugin?.GetMethod("Update", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            var postfix = typeof(Plugin).GetMethod(nameof(FramePostfix), BindingFlags.Static | BindingFlags.NonPublic);
            if (update == null || postfix == null)
            {
                _logger.LogError("[AnywhereStorage] Could not hook PKCore update loop. Plugin disabled.");
                return;
            }

            _harmony.Patch(update, postfix: new HarmonyMethod(postfix));
            BindWarehouseEntry();
            _logger.LogInfo("[AnywhereStorage] Ready. Hotkey: F8");
        }
        catch (Exception ex)
        {
            _logger.LogError($"[AnywhereStorage] Load failed safely: {ex}");
        }
    }

    private static void FramePostfix()
    {
        try
        {
            _frameCounter++;
            if (_frameCounter == 60)
                _logger.LogInfo("[AnywhereStorage] Update hook active.");

            short state = GetAsyncKeyState(VK_F8);
            bool down = (state & 0x8000) != 0;
            bool pressedSinceLastPoll = (state & 0x0001) != 0;
            bool pressed = pressedSinceLastPoll || (down && !_previousF8Down);

            if (pressed)
            {
                _logger.LogInfo($"[AnywhereStorage] F8 detected (state=0x{((ushort)state):X4}).");
                OnHotkey();
            }
            _previousF8Down = down;

            if (_runnerActive)
                RunWarehouseStateMachineFrame();
        }
        catch (Exception ex)
        {
            _logger?.LogError($"[AnywhereStorage] Frame handler error: {ex}");
            StopRunner("frame handler exception");
        }
    }

    private static void BindWarehouseEntry()
    {
        if (_warehouseEntry != null)
            return;

        var type = FindType("GSD1.D_azukar_c") ?? FindTypeByName("D_azukar_c");
        if (type == null)
            return;

        var flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance;
        _warehouseEntry = type.GetMethods(flags)
            .FirstOrDefault(m => m.Name == "azukari_demo" && m.IsStatic && m.GetParameters().Length == 0);

        if (_warehouseEntry != null)
        {
            _logger.LogInfo($"[AnywhereStorage] Bound canonical warehouse entry: {_warehouseEntry.DeclaringType?.FullName}.{_warehouseEntry.Name}() -> {_warehouseEntry.ReturnType.Name}");
        }
        else
        {
            _logger.LogError("[AnywhereStorage] D_azukar_c.azukari_demo() not found. Plugin will not invoke warehouse code.");
        }
    }

    private static void OnHotkey()
    {
        if ((DateTime.UtcNow - _lastAttemptUtc).TotalMilliseconds < 600)
            return;
        _lastAttemptUtc = DateTime.UtcNow;

        if (_runnerActive)
        {
            _logger.LogInfo("[AnywhereStorage] F8 ignored: warehouse state-machine is already active.");
            return;
        }

        BindWarehouseEntry();
        if (_warehouseEntry == null)
        {
            _logger.LogWarning("[AnywhereStorage] F8 ignored: canonical warehouse entry is unavailable.");
            return;
        }

        if (!IsRocRecruited(out int rocFlag, out string unlockReason))
        {
            _logger.LogWarning($"[AnywhereStorage] F8 ignored: warehouse not unlocked in this save ({unlockReason}).");
            return;
        }
        _logger.LogInfo($"[AnywhereStorage] Roc recruitment confirmed: member_flag[85]={rocFlag}.");

        if (!IsSafeFreeRoam(out string safetyReason))
        {
            _logger.LogWarning($"[AnywhereStorage] F8 ignored for safety: {safetyReason}");
            return;
        }
        _logger.LogInfo($"[AnywhereStorage] Safety check passed: {safetyReason}.");

        try
        {
            LogCriticalWarehouseState("BEFORE");
            _logger.LogInfo("[AnywhereStorage] Starting original warehouse state-machine via azukari_demo().");
            object result = _warehouseEntry.Invoke(null, Array.Empty<object>());
            if (!AcceptStateResult(result, "azukari_demo", null))
            {
                LogCriticalWarehouseState("AFTER_ENTRY_NO_RUNNER");
                return;
            }
            LogCriticalWarehouseState("AFTER_ENTRY");
        }
        catch (TargetInvocationException tie)
        {
            _logger.LogError($"[AnywhereStorage] azukari_demo failed safely: {tie.InnerException ?? tie}");
            StopRunner("entry exception");
        }
        catch (Exception ex)
        {
            _logger.LogError($"[AnywhereStorage] azukari_demo failed safely: {ex}");
            StopRunner("entry exception");
        }
    }

    private static void RunWarehouseStateMachineFrame()
    {
        if (!_runnerActive || _currentDelegate == null)
        {
            StopRunner("no current delegate");
            return;
        }

        _runnerFrames++;
        if (_runnerFrames > MaxRunnerFrames)
        {
            _logger.LogError("[AnywhereStorage] State-machine safety timeout reached. Runner stopped; reload the game if a menu remains open.");
            StopRunner("safety timeout");
            return;
        }

        object current = _currentDelegate;
        string label = DescribeDelegate(current);

        try
        {
            MethodInfo invoke = FindZeroArgInvoke(current.GetType());
            if (invoke == null)
            {
                _logger.LogError($"[AnywhereStorage] Cannot invoke warehouse delegate type {current.GetType().FullName}: zero-argument Invoke() not found.");
                StopRunner("delegate Invoke unavailable");
                return;
            }

            object result = invoke.Invoke(current, Array.Empty<object>());
            AcceptStateResult(result, label, current);
        }
        catch (TargetInvocationException tie)
        {
            _logger.LogError($"[AnywhereStorage] Warehouse state '{label}' failed: {tie.InnerException ?? tie}");
            StopRunner("state exception");
        }
        catch (Exception ex)
        {
            _logger.LogError($"[AnywhereStorage] Warehouse state '{label}' failed: {ex}");
            StopRunner("state exception");
        }
    }

    private static bool AcceptStateResult(object result, string sourceLabel, object currentDelegate)
    {
        if (!TryReadStateTuple(result, out bool flag, out object nextDelegate))
        {
            _logger.LogError($"[AnywhereStorage] {sourceLabel} returned an unreadable state result ({DescribeObject(result)}). Runner stopped before guessing.");
            StopRunner("unreadable state result");
            return false;
        }

        string nextLabel = nextDelegate == null ? "<NULL>" : DescribeDelegate(nextDelegate);
        string stateKey = sourceLabel + "|" + flag + "|" + nextLabel;
        if (stateKey != _lastStateLabel)
        {
            _lastStateLabel = stateKey;
            _sameStateFrames = 0;
            _logger.LogInfo($"[AnywhereStorage][STATE] source={sourceLabel}, flag={flag}, next={nextLabel}");
        }
        else
        {
            _sameStateFrames++;
            if (_sameStateFrames > 0 && _sameStateFrames % 300 == 0)
                _logger.LogInfo($"[AnywhereStorage][STATE] still running {sourceLabel} for {_sameStateFrames} repeated frame(s), flag={flag}, next={nextLabel}");
        }

        if (nextDelegate != null)
        {
            _currentDelegate = nextDelegate;
            _runnerActive = true;
            return true;
        }

        // The game's SHIRO-style state functions expose (bool, nextDelegate).
        // A false flag with no next function is treated conservatively as "stay on current state".
        // A true flag with no next function is treated as completion. This avoids inventing a new transition.
        if (!flag && currentDelegate != null)
        {
            _currentDelegate = currentDelegate;
            _runnerActive = true;
            return true;
        }

        _logger.LogInfo($"[AnywhereStorage] Warehouse state-machine completed at {sourceLabel} (flag={flag}, next=NULL).");
        StopRunner("normal completion");
        LogCriticalWarehouseState("AFTER_COMPLETION");
        return false;
    }

    private static bool TryReadStateTuple(object result, out bool flag, out object nextDelegate)
    {
        flag = false;
        nextDelegate = null;
        if (result == null)
            return false;

        try
        {
            Type t = result.GetType();
            object item1 = GetInstanceMember(result, "Item1");
            object item2 = GetInstanceMember(result, "Item2");

            if (item1 == null)
            {
                var f1 = t.GetField("Item1", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (f1 != null) item1 = f1.GetValue(result);
            }
            if (item2 == null)
            {
                var f2 = t.GetField("Item2", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (f2 != null) item2 = f2.GetValue(result);
            }

            if (item1 == null)
                return false;

            flag = Convert.ToBoolean(item1);
            nextDelegate = item2;
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static MethodInfo FindZeroArgInvoke(Type type)
    {
        var flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        return type.GetMethods(flags)
            .Where(m => m.Name == "Invoke")
            .OrderBy(m => m.GetParameters().Length)
            .FirstOrDefault(m => m.GetParameters().Length == 0);
    }

    private static string DescribeDelegate(object del)
    {
        if (del == null) return "<NULL>";
        try
        {
            object methodObj = GetInstanceMember(del, "Method");
            object nameObj = methodObj == null ? null : GetInstanceMember(methodObj, "Name");
            if (nameObj != null)
                return Convert.ToString(nameObj) ?? del.GetType().Name;
        }
        catch { }
        return del.GetType().Name;
    }

    private static string DescribeObject(object value)
    {
        if (value == null) return "<NULL>";
        try { return value.GetType().FullName ?? value.GetType().Name; }
        catch { return "<non-null>"; }
    }

    private static void StopRunner(string reason)
    {
        if (_runnerActive || _currentDelegate != null)
            _logger.LogInfo($"[AnywhereStorage] State-machine runner stopped: {reason}.");
        _runnerActive = false;
        _currentDelegate = null;
        _runnerFrames = 0;
        _sameStateFrames = 0;
        _lastStateLabel = "";
    }

    private static void LogCriticalWarehouseState(string stage)
    {
        try
        {
            var type = FindType("GSD1.D_azukar_c") ?? FindTypeByName("D_azukar_c");
            if (type == null) return;
            string[] names = { "a_work", "azukari_work", "item_data_table", "machi_kaiwa", "prev_func", "step_func" };
            foreach (string name in names)
            {
                object value = GetStaticMember(type, name);
                _logger.LogInfo($"[AnywhereStorage][{stage}] {name}={DescribeObject(value)}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning($"[AnywhereStorage][{stage}] critical-state read failed: {ex.Message}");
        }
    }

    private static bool IsRocRecruited(out int flag, out string reason)
    {
        flag = 0;
        reason = "Roc recruitment flag unavailable";
        try
        {
            var oldSrcBase = FindType("GSD1.OldSrcBase") ?? FindTypeByName("OldSrcBase");
            if (oldSrcBase == null)
            {
                reason = "OldSrcBase type not found";
                return false;
            }

            object gameWork = GetStaticMember(oldSrcBase, "game_work");
            if (gameWork == null)
            {
                reason = "game_work is null";
                return false;
            }

            object flags = GetInstanceMember(gameWork, "member_flag");
            if (flags == null)
            {
                reason = "member_flag is null";
                return false;
            }

            object value = GetIndexedValue(flags, RocMemberId);
            if (value == null)
            {
                reason = "member_flag[85] unavailable";
                return false;
            }

            flag = Convert.ToInt32(value);
            bool recruited = (flag & 1) != 0;
            reason = recruited ? "Roc recruited" : $"member_flag[85]={flag}";
            return recruited;
        }
        catch (Exception ex)
        {
            reason = $"Roc flag check failed: {ex.Message}";
            return false;
        }
    }

    private static bool IsSafeFreeRoam(out string reason)
    {
        reason = "unknown game state";
        if (!TryReadSuikodenFixSafety(out bool available, out bool safe, out string fixReason) || !available)
        {
            reason = "Suikoden Fix state unavailable; canary refuses to guess";
            return false;
        }
        if (!safe)
        {
            reason = fixReason;
            return false;
        }
        if (IsStandardWindowOpen(out string windowReason))
        {
            reason = windowReason;
            return false;
        }
        reason = fixReason;
        return true;
    }

    private static bool TryReadSuikodenFixSafety(out bool available, out bool safe, out string reason)
    {
        available = false;
        safe = false;
        reason = "Suikoden Fix unavailable";
        try
        {
            var type = FindType("Suikoden_Fix.ModComponent");
            if (type == null) return true;
            object instance = GetStaticMember(type, "Instance");
            if (instance == null) return true;
            available = true;

            string activeGame = Convert.ToString(GetInstanceMember(instance, "ActiveGame"));
            if (!string.Equals(activeGame, "GSD1", StringComparison.OrdinalIgnoreCase))
            {
                reason = $"Suikoden Fix reports ActiveGame={activeGame}";
                return true;
            }

            var chapterField = type.GetField("_chapter", BindingFlags.Instance | BindingFlags.NonPublic);
            string chapter = chapterField == null ? null : Convert.ToString(chapterField.GetValue(instance));
            if (!string.Equals(chapter, "Map", StringComparison.OrdinalIgnoreCase))
            {
                reason = $"Suikoden Fix chapter={chapter ?? "<unavailable>"}";
                return true;
            }

            string[] boolMembers = { "IsMenuOpened", "IsMessageBoxOpened", "IsInSpecialMenu", "IsInGameEvent", "IsInDanceMinigame", "IsInMovieGallery", "GamePaused" };
            foreach (string member in boolMembers)
            {
                object value = GetInstanceMember(instance, member);
                if (value is bool b && b)
                {
                    reason = $"Suikoden Fix safety flag {member}=true";
                    return true;
                }
            }

            safe = true;
            reason = "Suikoden Fix confirms GSD1 Map free roam";
            return true;
        }
        catch (Exception ex)
        {
            available = true;
            safe = false;
            reason = $"Suikoden Fix safety check failed: {ex.Message}";
            return true;
        }
    }

    private static bool IsStandardWindowOpen(out string reason)
    {
        reason = "";
        try
        {
            var type = FindType("GSD1.WindowManager") ?? FindTypeByName("WindowManager");
            if (type == null) return false;
            object manager = GetStaticMember(type, "Instance");
            if (manager == null) return false;

            var getIsOpen = type.GetMethod("GetIsOpen", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (getIsOpen != null && getIsOpen.GetParameters().Length == 0)
            {
                object result = getIsOpen.Invoke(manager, Array.Empty<object>());
                if (result is bool b && b)
                {
                    reason = "message/window manager is open";
                    return true;
                }
            }

            var getMenu = type.GetMethod("GetMenuWindow", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (getMenu != null && getMenu.GetParameters().Length == 0)
            {
                object menu = getMenu.Invoke(manager, Array.Empty<object>());
                object open = menu == null ? null : GetInstanceMember(menu, "IsOpen");
                if (open is bool mb && mb)
                {
                    reason = "main menu is open";
                    return true;
                }
            }
        }
        catch (Exception ex)
        {
            reason = $"window safety check failed: {ex.Message}";
            return true;
        }
        return false;
    }

    private static object GetIndexedValue(object collection, int index)
    {
        if (collection == null) return null;
        var type = collection.GetType();
        var flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        try
        {
            var countProp = type.GetProperty("Count", flags);
            if (countProp != null)
            {
                int count = Convert.ToInt32(countProp.GetValue(collection));
                if (index < 0 || index >= count) return null;
            }
            var itemProp = type.GetProperties(flags).FirstOrDefault(p => p.Name == "Item" && p.GetIndexParameters().Length == 1);
            if (itemProp != null) return itemProp.GetValue(collection, new object[] { index });
            var getItem = type.GetMethods(flags).FirstOrDefault(m => (m.Name == "get_Item" || m.Name == "get_Item_Int32") && m.GetParameters().Length == 1);
            if (getItem != null) return getItem.Invoke(collection, new object[] { index });
        }
        catch { }
        return null;
    }

    private static Type FindType(string fullName)
    {
        foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            try
            {
                var type = asm.GetType(fullName, false);
                if (type != null) return type;
            }
            catch { }
        }
        return null;
    }

    private static Type FindTypeByName(string name)
    {
        foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            try
            {
                var type = asm.GetTypes().FirstOrDefault(t => t.Name == name);
                if (type != null) return type;
            }
            catch (ReflectionTypeLoadException rtl)
            {
                var type = rtl.Types?.FirstOrDefault(t => t != null && t.Name == name);
                if (type != null) return type;
            }
            catch { }
        }
        return null;
    }

    private static object GetStaticMember(Type type, string name)
    {
        var flags = BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;
        try
        {
            var prop = type.GetProperty(name, flags);
            if (prop != null && prop.GetIndexParameters().Length == 0) return prop.GetValue(null);
            var field = type.GetField(name, flags);
            if (field != null) return field.GetValue(null);
        }
        catch { }
        return null;
    }

    private static object GetInstanceMember(object instance, string name)
    {
        if (instance == null) return null;
        var flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        Type type = instance.GetType();
        try
        {
            var prop = type.GetProperty(name, flags);
            if (prop != null && prop.GetIndexParameters().Length == 0) return prop.GetValue(instance);
            var field = type.GetField(name, flags);
            if (field != null) return field.GetValue(instance);
        }
        catch { }
        return null;
    }
}
