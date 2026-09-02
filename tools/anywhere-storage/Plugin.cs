using BepInEx;
using BepInEx.Logging;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using System;
using System.Diagnostics;
using System.IO;
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
    public const string PluginVersion = "0.1.0";

    private static ManualLogSource _logger;
    private static Harmony _harmony;
    private static MethodInfo _storageStart;
    private static MethodInfo _storageEnd;
    private static object _capturedStorageInstance;
    private static bool _storageOpen;
    private static bool _invokingFromHotkey;
    private static bool _previousF8;
    private static bool _storageUnlocked;
    private static int _frameCounter;
    private static DateTime _lastAttemptUtc = DateTime.MinValue;
    private static string _unlockMarkerPath;

    private const int VK_F8 = 0x77;

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    public override void Load()
    {
        _logger = base.Log;
        _harmony = new Harmony(PluginGuid);
        _unlockMarkerPath = Path.Combine(Paths.ConfigPath, "hinata.s1anywherestorage.unlocked");
        _storageUnlocked = File.Exists(_unlockMarkerPath);

        _logger.LogInfo($"[{PluginName}] Loading v{PluginVersion}");
        _logger.LogInfo("[AnywhereStorage] Safety policy: Suikoden I map/field only, no ordinary menu/message, no detected special menu/event.");
        _logger.LogInfo($"[AnywhereStorage] Persistent warehouse unlock marker: {(_storageUnlocked ? "YES" : "NO")}");

        if (!_storageUnlocked)
        {
            _logger.LogInfo("[AnywhereStorage] Open the normal warehouse once after installing. This records that the warehouse has legitimately been unlocked.");
        }

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
            if (_storageStart == null && _frameCounter % 120 == 0)
            {
                TryBindStorageMethods();
            }

            bool f8 = (GetAsyncKeyState(VK_F8) & 0x8000) != 0;
            if (f8 && !_previousF8)
            {
                OnHotkey();
            }
            _previousF8 = f8;
        }
        catch (Exception ex)
        {
            _logger?.LogError($"[AnywhereStorage] Frame handler error: {ex.Message}");
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
                _logger.LogWarning("[AnywhereStorage] GSD1.D_azukar_c found, but azukari_start was not found.");
                return;
            }

            MethodInfo startPatch = typeof(Plugin).GetMethod(
                _storageStart.IsStatic ? nameof(StorageStartStaticPrefix) : nameof(StorageStartInstancePrefix),
                BindingFlags.Static | BindingFlags.NonPublic);
            _harmony.Patch(_storageStart, prefix: new HarmonyMethod(startPatch));

            if (_storageEnd != null)
            {
                var endPatch = typeof(Plugin).GetMethod(nameof(StorageEndPostfix), BindingFlags.Static | BindingFlags.NonPublic);
                _harmony.Patch(_storageEnd, postfix: new HarmonyMethod(endPatch));
            }

            string signature = string.Join(", ", _storageStart.GetParameters().Select(p => p.ParameterType.Name + " " + p.Name));
            _logger.LogInfo($"[AnywhereStorage] Bound storage entry: {_storageStart.DeclaringType?.FullName}.{_storageStart.Name}({signature}), static={_storageStart.IsStatic}");
            if (_storageStart.GetParameters().Length != 0)
            {
                _logger.LogWarning("[AnywhereStorage] Storage entry has parameters. Canary will not guess arguments; F8 will refuse unless a zero-argument entry is available.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"[AnywhereStorage] Binding storage methods failed safely: {ex.Message}");
            _storageStart = null;
        }
    }

    private static void StorageStartStaticPrefix(MethodBase __originalMethod)
    {
        OnStorageStartObserved(null, __originalMethod);
    }

    private static void StorageStartInstancePrefix(object __instance, MethodBase __originalMethod)
    {
        OnStorageStartObserved(__instance, __originalMethod);
    }

    private static void OnStorageStartObserved(object instance, MethodBase original)
    {
        _storageOpen = true;
        if (instance != null)
            _capturedStorageInstance = instance;

        if (_invokingFromHotkey)
            return;

        if (!_storageUnlocked)
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(_unlockMarkerPath));
                File.WriteAllText(_unlockMarkerPath, "Warehouse legitimately opened in Suikoden I.\r\n");
                _storageUnlocked = true;
                _logger.LogInfo("[AnywhereStorage] Normal warehouse opening observed. Anywhere access is now unlocked for this installation.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"[AnywhereStorage] Could not write unlock marker: {ex.Message}");
            }
        }
        else
        {
            _logger.LogDebug($"[AnywhereStorage] Normal storage entry observed: {original?.Name}");
        }
    }

    private static void StorageEndPostfix()
    {
        _storageOpen = false;
    }

    private static void OnHotkey()
    {
        if (!IsGameForeground())
            return;

        if ((DateTime.UtcNow - _lastAttemptUtc).TotalMilliseconds < 750)
            return;
        _lastAttemptUtc = DateTime.UtcNow;

        TryBindStorageMethods();

        if (_storageStart == null)
        {
            _logger.LogWarning("[AnywhereStorage] F8 ignored: storage entry is not available yet.");
            return;
        }

        if (!_storageUnlocked)
        {
            _logger.LogWarning("[AnywhereStorage] F8 ignored: open the castle warehouse normally once first. Progression is not bypassed.");
            return;
        }

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

        if (_storageStart.GetParameters().Length != 0)
        {
            _logger.LogWarning("[AnywhereStorage] F8 refused: azukari_start is not zero-argument. No argument guessing performed.");
            return;
        }

        object target = null;
        if (!_storageStart.IsStatic)
        {
            target = ResolveStorageInstance(_storageStart.DeclaringType);
            if (target == null)
            {
                _logger.LogWarning("[AnywhereStorage] F8 cannot open yet: storage entry is instance-based and no safe live instance was found. Open the normal warehouse once in this game session, then try F8 again.");
                return;
            }
        }

        try
        {
            _logger.LogInfo("[AnywhereStorage] F8 -> invoking original Suikoden I warehouse entry.");
            _invokingFromHotkey = true;
            _storageStart.Invoke(target, Array.Empty<object>());
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

    private static object ResolveStorageInstance(Type storageType)
    {
        if (_capturedStorageInstance != null && storageType.IsInstanceOfType(_capturedStorageInstance))
            return _capturedStorageInstance;

        var flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static;
        string[] preferredNames = { "Instance", "instance", "m_Instance", "s_instance", "Singleton" };

        foreach (string name in preferredNames)
        {
            try
            {
                var prop = storageType.GetProperty(name, flags);
                if (prop != null && storageType.IsAssignableFrom(prop.PropertyType))
                {
                    var value = prop.GetValue(null);
                    if (value != null)
                        return value;
                }

                var field = storageType.GetField(name, flags);
                if (field != null && storageType.IsAssignableFrom(field.FieldType))
                {
                    var value = field.GetValue(null);
                    if (value != null)
                        return value;
                }
            }
            catch { }
        }

        try
        {
            foreach (var prop in storageType.GetProperties(flags))
            {
                if (storageType.IsAssignableFrom(prop.PropertyType) && prop.GetIndexParameters().Length == 0)
                {
                    var value = prop.GetValue(null);
                    if (value != null)
                        return value;
                }
            }
            foreach (var field in storageType.GetFields(flags))
            {
                if (storageType.IsAssignableFrom(field.FieldType))
                {
                    var value = field.GetValue(null);
                    if (value != null)
                        return value;
                }
            }
        }
        catch { }

        return null;
    }

    private static bool IsSafeFreeRoam(out string reason)
    {
        reason = "unknown game state";

        if (!IsGsd1MapOrField(out reason))
            return false;

        if (TryReadSuikodenFixSafety(out bool fixAvailable, out bool safe, out string fixReason) && fixAvailable)
        {
            if (!safe)
            {
                reason = fixReason;
                return false;
            }
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
            var chapterManagerType = FindType("GSD1.ChapterManager");
            if (chapterManagerType == null)
                return false;

            object manager = GetStaticMember(chapterManagerType, "GR1Instance");
            if (manager == null)
                return false;

            object chapter = GetInstanceMember(manager, "activeChapter");
            if (chapter == null)
                return false;

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

            var chapterField = type.GetField("_chapter", BindingFlags.Instance | BindingFlags.NonPublic);
            if (chapterField != null)
            {
                string chapter = Convert.ToString(chapterField.GetValue(instance));
                if (!string.Equals(chapter, "Map", StringComparison.OrdinalIgnoreCase))
                {
                    safe = false;
                    reason = $"Suikoden Fix chapter={chapter}";
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
            var type = FindType("GSD1.WindowManager");
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

    private static bool IsGameForeground()
    {
        try
        {
            IntPtr hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero)
                return false;
            GetWindowThreadProcessId(hwnd, out uint pid);
            return pid == (uint)Process.GetCurrentProcess().Id;
        }
        catch
        {
            return true;
        }
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
