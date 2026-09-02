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
    public const string PluginVersion = "0.2.0";

    private const int VK_F8 = 0x77;
    private const int RocMemberId = 85;

    private static ManualLogSource _logger;
    private static Harmony _harmony;
    private static MethodInfo _storageStart;
    private static MethodInfo _storageEnd;
    private static bool _storageOpen;
    private static bool _invokingFromHotkey;
    private static bool _previousF8Down;
    private static int _frameCounter;
    private static DateTime _lastAttemptUtc = DateTime.MinValue;

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    public override void Load()
    {
        _logger = base.Log;
        _harmony = new Harmony(PluginGuid);

        _logger.LogInfo($"[{PluginName}] Loading v{PluginVersion}");
        _logger.LogInfo("[AnywhereStorage] Unlock rule: Roc recruited in current Suikoden I save (member_flag[85]). No need to visit the castle after installing.");
        _logger.LogInfo("[AnywhereStorage] Safety: map/field only; blocked during menus, messages, events, battles and special menus.");

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
            TryBindStorageMethods();
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

            if (_storageStart == null && _frameCounter % 120 == 0)
                TryBindStorageMethods();

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
        }
        catch (Exception ex)
        {
            _logger?.LogError($"[AnywhereStorage] Frame handler error: {ex}");
        }
    }

    private static void TryBindStorageMethods()
    {
        if (_storageStart != null)
            return;

        try
        {
            var storageType = FindType("GSD1.D_azukar_c") ?? FindTypeByName("D_azukar_c");
            if (storageType == null)
                return;

            var flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance;
            _storageStart = storageType.GetMethods(flags)
                .Where(m => m.Name == "azukari_start")
                .OrderBy(m => m.GetParameters().Length)
                .FirstOrDefault();
            _storageEnd = storageType.GetMethods(flags)
                .Where(m => m.Name == "azukari_owari")
                .OrderBy(m => m.GetParameters().Length)
                .FirstOrDefault();

            if (_storageStart == null)
            {
                _logger.LogWarning("[AnywhereStorage] D_azukar_c found, but azukari_start was not found.");
                return;
            }

            var startPatch = typeof(Plugin).GetMethod(nameof(StorageStartPrefix), BindingFlags.Static | BindingFlags.NonPublic);
            _harmony.Patch(_storageStart, prefix: new HarmonyMethod(startPatch));

            if (_storageEnd != null)
            {
                var endPatch = typeof(Plugin).GetMethod(nameof(StorageEndPostfix), BindingFlags.Static | BindingFlags.NonPublic);
                _harmony.Patch(_storageEnd, postfix: new HarmonyMethod(endPatch));
            }

            string signature = string.Join(", ", _storageStart.GetParameters().Select(p => p.ParameterType.Name + " " + p.Name));
            _logger.LogInfo($"[AnywhereStorage] Bound storage entry: {_storageStart.DeclaringType?.FullName}.{_storageStart.Name}({signature}), static={_storageStart.IsStatic}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"[AnywhereStorage] Binding storage methods failed safely: {ex}");
            _storageStart = null;
        }
    }

    private static void StorageStartPrefix()
    {
        _storageOpen = true;
    }

    private static void StorageEndPostfix()
    {
        _storageOpen = false;
    }

    private static void OnHotkey()
    {
        if ((DateTime.UtcNow - _lastAttemptUtc).TotalMilliseconds < 600)
            return;
        _lastAttemptUtc = DateTime.UtcNow;

        TryBindStorageMethods();

        if (_storageStart == null)
        {
            _logger.LogWarning("[AnywhereStorage] F8 ignored: original storage entry is not available.");
            return;
        }

        if (_storageStart.GetParameters().Length != 0 || !_storageStart.IsStatic)
        {
            _logger.LogWarning("[AnywhereStorage] F8 refused: storage entry shape changed; no unsafe argument/instance guessing performed.");
            return;
        }

        if (!IsRocRecruited(out int rocFlag, out string unlockReason))
        {
            _logger.LogWarning($"[AnywhereStorage] F8 ignored: warehouse not unlocked in this save ({unlockReason}).");
            return;
        }
        _logger.LogInfo($"[AnywhereStorage] Roc recruitment confirmed: member_flag[85]={rocFlag}.");

        if (_storageOpen)
        {
            _logger.LogInfo("[AnywhereStorage] F8 ignored: warehouse is already open.");
            return;
        }

        if (!IsSafeFreeRoam(out string reason))
        {
            _logger.LogWarning($"[AnywhereStorage] F8 ignored for safety: {reason}");
            return;
        }

        try
        {
            _logger.LogInfo("[AnywhereStorage] F8 -> invoking original Suikoden I warehouse entry.");
            _invokingFromHotkey = true;
            _storageStart.Invoke(null, Array.Empty<object>());
            _logger.LogInfo("[AnywhereStorage] Warehouse entry call completed.");
        }
        catch (TargetInvocationException tie)
        {
            _storageOpen = false;
            _logger.LogError($"[AnywhereStorage] Warehouse call failed safely: {tie.InnerException ?? tie}");
        }
        catch (Exception ex)
        {
            _storageOpen = false;
            _logger.LogError($"[AnywhereStorage] Warehouse call failed safely: {ex}");
        }
        finally
        {
            _invokingFromHotkey = false;
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

        if (!IsGsd1MapOrField(out reason))
            return false;

        if (TryReadSuikodenFixSafety(out bool fixAvailable, out bool safe, out string fixReason) && fixAvailable && !safe)
        {
            reason = fixReason;
            return false;
        }

        if (IsStandardWindowOpen(out string windowReason))
        {
            reason = windowReason;
            return false;
        }

        reason = "safe free roam";
        return true;
    }

    private static bool IsGsd1MapOrField(out string reason)
    {
        reason = "GSD1 chapter unavailable";
        try
        {
            var chapterManagerType = FindType("GSD1.ChapterManager") ?? FindTypeByName("ChapterManager");
            if (chapterManagerType == null)
            {
                reason = "ChapterManager type not found";
                return false;
            }

            object manager = GetStaticMember(chapterManagerType, "GR1Instance");
            if (manager == null)
            {
                reason = "GR1Instance unavailable";
                return false;
            }

            object chapter = GetInstanceMember(manager, "activeChapter");
            if (chapter == null)
            {
                reason = "activeChapter unavailable";
                return false;
            }

            string chapterName = chapter.GetType().Name;
            if (chapterName == "MapChapter" || chapterName == "FieldChapter")
            {
                reason = chapterName;
                return true;
            }

            reason = $"current chapter is {chapterName}";
            return false;
        }
        catch (Exception ex)
        {
            reason = $"chapter check failed: {ex.Message}";
            return false;
        }
    }

    private static bool TryReadSuikodenFixSafety(out bool available, out bool safe, out string reason)
    {
        available = false;
        safe = true;
        reason = "";
        try
        {
            var type = FindType("Suikoden_Fix.ModComponent");
            if (type == null)
                return true;

            object instance = GetStaticMember(type, "Instance");
            if (instance == null)
                return true;

            available = true;
            string activeGame = Convert.ToString(GetInstanceMember(instance, "ActiveGame"));
            if (!string.Equals(activeGame, "GSD1", StringComparison.OrdinalIgnoreCase))
            {
                safe = false;
                reason = $"Suikoden Fix reports ActiveGame={activeGame}";
                return true;
            }

            string[] boolMembers =
            {
                "IsMenuOpened", "IsMessageBoxOpened", "IsInSpecialMenu", "IsInGameEvent",
                "IsInDanceMinigame", "IsInMovieGallery", "GamePaused"
            };

            foreach (string member in boolMembers)
            {
                object value = GetInstanceMember(instance, member);
                if (value is bool b && b)
                {
                    safe = false;
                    reason = $"Suikoden Fix safety flag {member}=true";
                    return true;
                }
            }

            safe = true;
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
            if (type == null)
                return false;

            object manager = GetStaticMember(type, "Instance");
            if (manager == null)
                return false;

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
        if (collection == null)
            return null;

        var type = collection.GetType();
        var flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;

        try
        {
            var countProp = type.GetProperty("Count", flags);
            if (countProp != null)
            {
                int count = Convert.ToInt32(countProp.GetValue(collection));
                if (index < 0 || index >= count)
                    return null;
            }

            var itemProp = type.GetProperties(flags)
                .FirstOrDefault(p => p.Name == "Item" && p.GetIndexParameters().Length == 1 && p.GetIndexParameters()[0].ParameterType == typeof(int));
            if (itemProp != null)
                return itemProp.GetValue(collection, new object[] { index });

            var getItem = type.GetMethods(flags)
                .FirstOrDefault(m => (m.Name == "get_Item" || m.Name == "get_Item_Int32") && m.GetParameters().Length == 1);
            if (getItem != null)
                return getItem.Invoke(collection, new object[] { index });
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
                if (type != null)
                    return type;
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
                if (type != null)
                    return type;
            }
            catch (ReflectionTypeLoadException rtl)
            {
                var type = rtl.Types?.FirstOrDefault(t => t != null && t.Name == name);
                if (type != null)
                    return type;
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
            if (prop != null && prop.GetIndexParameters().Length == 0)
                return prop.GetValue(null);
            var field = type.GetField(name, flags);
            if (field != null)
                return field.GetValue(null);
        }
        catch { }
        return null;
    }

    private static object GetInstanceMember(object instance, string name)
    {
        if (instance == null)
            return null;
        var type = instance.GetType();
        var flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        try
        {
            var prop = type.GetProperty(name, flags);
            if (prop != null && prop.GetIndexParameters().Length == 0)
                return prop.GetValue(instance);
            var field = type.GetField(name, flags);
            if (field != null)
                return field.GetValue(instance);
        }
        catch { }
        return null;
    }
}
