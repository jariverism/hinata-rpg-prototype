using BepInEx;
using BepInEx.Logging;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using System;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;

namespace HinataS1AnywhereTeleport;

[BepInPlugin(PluginGuid, PluginName, PluginVersion)]
[BepInDependency("faospark.pkcore", BepInDependency.DependencyFlags.HardDependency)]
public sealed class Plugin : BasePlugin
{
    public const string PluginGuid = "hinata.s1anywhere.teleport";
    public const string PluginName = "Hinata S1 Anywhere Teleport";
    public const string PluginVersion = "0.2.0";

    private const int VK_F7 = 0x76;
    private const int MaxRunnerFrames = 36000;

    private static ManualLogSource _logger;
    private static Harmony _harmony;
    private static object _currentDelegate;
    private static bool _runnerActive;
    private static bool _previousF7Down;
    private static int _runnerFrames;
    private static string _lastStateLabel = "";
    private static DateTime _lastAttemptUtc = DateTime.MinValue;

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    public override void Load()
    {
        _logger = base.Log;
        _harmony = new Harmony(PluginGuid);
        _logger.LogInfo("[AnywhereTeleport] Loading v" + PluginVersion);
        _logger.LogInfo("[AnywhereTeleport] F7 opens the original Suikoden I teleport flow. No storage code is included in this DLL.");
        try
        {
            var pkPlugin = FindType("PKCore.Plugin");
            var update = pkPlugin == null ? null : pkPlugin.GetMethod("Update", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            var postfix = typeof(Plugin).GetMethod(nameof(FramePostfix), BindingFlags.Static | BindingFlags.NonPublic);
            if (update == null || postfix == null)
            {
                _logger.LogError("[AnywhereTeleport] Could not hook PKCore update loop. Plugin disabled.");
                return;
            }
            _harmony.Patch(update, postfix: new HarmonyMethod(postfix));
            _logger.LogInfo("[AnywhereTeleport] Ready. Hotkey: F7");
        }
        catch (Exception ex)
        {
            _logger.LogError("[AnywhereTeleport] Load failed safely: " + ex);
        }
    }

    private static void FramePostfix()
    {
        try
        {
            short state = GetAsyncKeyState(VK_F7);
            bool down = (state & 0x8000) != 0;
            bool pressedSinceLastPoll = (state & 0x0001) != 0;
            bool pressed = pressedSinceLastPoll || (down && !_previousF7Down);
            _previousF7Down = down;
            if (pressed) OnHotkey();
            if (_runnerActive) RunTeleportStateMachineFrame();
        }
        catch (Exception ex)
        {
            _logger?.LogError("[AnywhereTeleport] Frame handler error: " + ex);
            StopRunner("frame handler exception");
        }
    }

    private static void OnHotkey()
    {
        if ((DateTime.UtcNow - _lastAttemptUtc).TotalMilliseconds < 600) return;
        _lastAttemptUtc = DateTime.UtcNow;
        _logger.LogInfo("[AnywhereTeleport] F7 detected.");
        if (_runnerActive)
        {
            _logger.LogInfo("[AnywhereTeleport] F7 ignored: teleport is already active.");
            return;
        }
        if (!IsSafeFreeRoam(out string safetyReason))
        {
            _logger.LogWarning("[AnywhereTeleport] F7 ignored for safety: " + safetyReason);
            return;
        }
        TryStartOriginalTeleport();
    }

    private static void TryStartOriginalTeleport()
    {
        Type eventType = FindType("GSD1.Event_c") ?? FindTypeByName("Event_c");
        if (eventType == null)
        {
            _logger.LogError("[AnywhereTeleport] GSD1.Event_c was not found.");
            return;
        }
        BindingFlags flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance;
        MethodInfo[] candidates;
        try
        {
            candidates = eventType.GetMethods(flags)
                .Where(m => string.Equals(m.Name, "teleport", StringComparison.OrdinalIgnoreCase))
                .OrderBy(m => m.GetParameters().Length)
                .ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError("[AnywhereTeleport] Could not enumerate Event_c.teleport methods: " + ex);
            return;
        }
        _logger.LogInfo("[AnywhereTeleport] Event_c.teleport candidates=" + candidates.Length);
        foreach (MethodInfo candidate in candidates)
            _logger.LogDebug("[AnywhereTeleport] candidate: " + DescribeMethod(candidate));

        foreach (MethodInfo candidate in candidates)
        {
            object target = null;
            if (!candidate.IsStatic)
            {
                target = GetStaticMember(eventType, "Instance");
                if (target == null)
                {
                    _logger.LogDebug("[AnywhereTeleport] skip instance candidate without Event_c.Instance: " + DescribeMethod(candidate));
                    continue;
                }
            }
            if (!TryPrepareArguments(eventType, candidate, out object[] args, out string argReason))
            {
                _logger.LogDebug("[AnywhereTeleport] skip candidate: " + DescribeMethod(candidate) + " / " + argReason);
                continue;
            }
            try
            {
                _logger.LogInfo("[AnywhereTeleport] Invoking original entry: " + DescribeMethod(candidate) + " / " + argReason);
                object result = candidate.Invoke(target, args);
                if (HandleEntryResult(result, candidate.Name)) return;
            }
            catch (TargetInvocationException tie)
            {
                _logger.LogError("[AnywhereTeleport] teleport entry threw: " + (tie.InnerException ?? tie));
            }
            catch (Exception ex)
            {
                _logger.LogError("[AnywhereTeleport] teleport entry failed: " + ex);
            }
        }

        string[] fallbackNames = { "teleport_init", "teleport_start" };
        foreach (string fallbackName in fallbackNames)
        {
            MethodInfo fallback = eventType.GetMethods(flags)
                .Where(m => string.Equals(m.Name, fallbackName, StringComparison.OrdinalIgnoreCase))
                .OrderBy(m => m.GetParameters().Length)
                .FirstOrDefault(m => m.IsStatic && m.GetParameters().Length == 0);
            if (fallback == null) continue;
            try
            {
                _logger.LogWarning("[AnywhereTeleport] Falling back to " + DescribeMethod(fallback));
                object result = fallback.Invoke(null, Array.Empty<object>());
                if (HandleEntryResult(result, fallback.Name)) return;
            }
            catch (TargetInvocationException tie)
            {
                _logger.LogError("[AnywhereTeleport] fallback entry threw: " + (tie.InnerException ?? tie));
            }
            catch (Exception ex)
            {
                _logger.LogError("[AnywhereTeleport] fallback entry failed: " + ex);
            }
        }
        _logger.LogError("[AnywhereTeleport] No usable original teleport entry could be started.");
    }

    private static bool TryPrepareArguments(Type eventType, MethodInfo method, out object[] args, out string reason)
    {
        ParameterInfo[] parameters = method.GetParameters();
        args = null;
        reason = "unsupported parameters";
        if (parameters.Length == 0)
        {
            args = Array.Empty<object>();
            reason = "zero-argument entry";
            return true;
        }
        if (parameters.Length != 1)
        {
            reason = "parameter count=" + parameters.Length;
            return false;
        }
        Type parameterType = parameters[0].ParameterType;
        object value = ResolveCurrentValueForType(eventType, parameterType, out string source);
        if (value != null)
        {
            args = new object[] { value };
            reason = "argument from " + source + " (" + parameterType.FullName + ")";
            return true;
        }
        if (parameters[0].HasDefaultValue)
        {
            args = new object[] { parameters[0].DefaultValue };
            reason = "declared default argument";
            return true;
        }
        reason = "could not resolve current " + parameterType.FullName;
        return false;
    }

    private static object ResolveCurrentValueForType(Type eventType, Type wantedType, out string source)
    {
        source = "<none>";
        string[] preferredNames = { "v_work", "village_work", "V_WORK", "VillageWork", "work" };
        Type[] preferredTypes =
        {
            eventType,
            FindType("GSD1.OldSrcBase") ?? FindTypeByName("OldSrcBase"),
            FindType("GSD1.D_map_c") ?? FindTypeByName("D_map_c"),
            FindType("GSD1.Map_c") ?? FindTypeByName("Map_c"),
            FindType("GSD1.village_c") ?? FindTypeByName("village_c")
        };
        foreach (Type type in preferredTypes.Where(t => t != null))
        {
            foreach (string name in preferredNames)
            {
                object value = GetStaticMember(type, name);
                if (value != null && wantedType.IsInstanceOfType(value))
                {
                    source = type.FullName + "." + name;
                    return value;
                }
            }
        }
        foreach (Assembly asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            Type[] types;
            try { types = asm.GetTypes(); }
            catch (ReflectionTypeLoadException rtl) { types = rtl.Types == null ? Array.Empty<Type>() : rtl.Types.Where(t => t != null).ToArray(); }
            catch { continue; }
            foreach (Type type in types)
            {
                try
                {
                    foreach (FieldInfo field in type.GetFields(BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic))
                    {
                        if (!wantedType.IsAssignableFrom(field.FieldType)) continue;
                        object value = field.GetValue(null);
                        if (value == null) continue;
                        source = type.FullName + "." + field.Name;
                        return value;
                    }
                }
                catch { }
            }
        }
        return null;
    }

    private static bool HandleEntryResult(object result, string sourceLabel)
    {
        if (result == null)
        {
            _logger.LogInfo("[AnywhereTeleport] " + sourceLabel + " returned null/void. Assuming the original game owns the continuation.");
            return true;
        }
        if (TryReadStateTuple(result, out bool flag, out object nextDelegate))
        {
            _logger.LogInfo("[AnywhereTeleport] " + sourceLabel + " returned state tuple. Starting original state runner.");
            AcceptStateResult(flag, nextDelegate, sourceLabel, null);
            return true;
        }
        _logger.LogInfo("[AnywhereTeleport] " + sourceLabel + " returned " + result.GetType().FullName + " = " + SafeToString(result) + ". Assuming original game continuation.");
        return true;
    }

    private static void RunTeleportStateMachineFrame()
    {
        if (!_runnerActive || _currentDelegate == null)
        {
            StopRunner("no current delegate");
            return;
        }
        _runnerFrames++;
        if (_runnerFrames > MaxRunnerFrames)
        {
            _logger.LogError("[AnywhereTeleport] Safety timeout reached. Runner stopped; reload the game if a teleport menu remains open.");
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
                string invokes = string.Join(" | ", current.GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
                    .Where(m => m.Name == "Invoke").Select(DescribeMethod));
                _logger.LogError("[AnywhereTeleport] Cannot invoke teleport state " + label + ": zero-argument Invoke() not found. Candidates: " + invokes);
                StopRunner("delegate Invoke unavailable");
                return;
            }
            object result = invoke.Invoke(current, Array.Empty<object>());
            if (!TryReadStateTuple(result, out bool flag, out object nextDelegate))
            {
                _logger.LogError("[AnywhereTeleport] State " + label + " returned unreadable result type=" + (result == null ? "<null>" : result.GetType().FullName));
                StopRunner("unreadable state result");
                return;
            }
            AcceptStateResult(flag, nextDelegate, label, current);
        }
        catch (TargetInvocationException tie)
        {
            _logger.LogError("[AnywhereTeleport] Teleport state '" + label + "' failed: " + (tie.InnerException ?? tie));
            StopRunner("state exception");
        }
        catch (Exception ex)
        {
            _logger.LogError("[AnywhereTeleport] Teleport state '" + label + "' failed: " + ex);
            StopRunner("state exception");
        }
    }

    private static void AcceptStateResult(bool flag, object nextDelegate, string sourceLabel, object currentDelegate)
    {
        string nextLabel = nextDelegate == null ? "<NULL>" : DescribeDelegate(nextDelegate);
        string stateKey = sourceLabel + "|" + flag + "|" + nextLabel;
        if (stateKey != _lastStateLabel)
        {
            _lastStateLabel = stateKey;
            _logger.LogInfo("[AnywhereTeleport] State: " + sourceLabel + " -> " + nextLabel + " (flag=" + flag + ").");
        }
        if (nextDelegate != null)
        {
            _currentDelegate = nextDelegate;
            _runnerActive = true;
            return;
        }
        if (!flag && currentDelegate != null)
        {
            _currentDelegate = currentDelegate;
            _runnerActive = true;
            return;
        }
        _logger.LogInfo("[AnywhereTeleport] Teleport closed normally.");
        StopRunner("normal completion");
    }

    private static bool TryReadStateTuple(object result, out bool flag, out object nextDelegate)
    {
        flag = false;
        nextDelegate = null;
        if (result == null) return false;
        try
        {
            object item1 = GetInstanceMember(result, "Item1");
            object item2 = GetInstanceMember(result, "Item2");
            if (item1 == null)
            {
                FieldInfo f1 = result.GetType().GetField("Item1", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (f1 != null) item1 = f1.GetValue(result);
            }
            if (item2 == null)
            {
                FieldInfo f2 = result.GetType().GetField("Item2", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (f2 != null) item2 = f2.GetValue(result);
            }
            if (item1 == null) return false;
            flag = Convert.ToBoolean(item1);
            nextDelegate = item2;
            return true;
        }
        catch { return false; }
    }

    private static MethodInfo FindZeroArgInvoke(Type type)
    {
        try
        {
            return type.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
                .Where(m => m.Name == "Invoke")
                .OrderBy(m => m.GetParameters().Length)
                .FirstOrDefault(m => m.GetParameters().Length == 0);
        }
        catch { return null; }
    }

    private static string DescribeDelegate(object del)
    {
        if (del == null) return "<NULL>";
        try
        {
            object methodObj = GetInstanceMember(del, "Method");
            object nameObj = methodObj == null ? null : GetInstanceMember(methodObj, "Name");
            if (nameObj != null) return Convert.ToString(nameObj) ?? del.GetType().Name;
        }
        catch { }
        return del.GetType().Name;
    }

    private static string DescribeMethod(MethodInfo method)
    {
        if (method == null) return "<null>";
        try
        {
            string pars = string.Join(", ", method.GetParameters().Select(p => p.ParameterType.FullName + " " + p.Name));
            return (method.IsStatic ? "static " : "instance ") + method.ReturnType.FullName + " " + method.DeclaringType.FullName + "." + method.Name + "(" + pars + ")";
        }
        catch { return method.Name; }
    }

    private static string SafeToString(object value)
    {
        try { return Convert.ToString(value) ?? "<null>"; }
        catch { return "<unprintable>"; }
    }

    private static void StopRunner(string reason)
    {
        if (_runnerActive || _currentDelegate != null)
            _logger?.LogDebug("[AnywhereTeleport] State-machine runner stopped: " + reason + ".");
        _runnerActive = false;
        _currentDelegate = null;
        _runnerFrames = 0;
        _lastStateLabel = "";
    }

    private static bool IsSafeFreeRoam(out string reason)
    {
        reason = "unknown game state";
        if (!TryReadSuikodenFixSafety(out bool available, out bool safe, out string fixReason) || !available)
        {
            reason = "Suikoden Fix state unavailable";
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
            Type type = FindType("Suikoden_Fix.ModComponent");
            if (type == null) return true;
            object instance = GetStaticMember(type, "Instance");
            if (instance == null) return true;
            available = true;
            string activeGame = Convert.ToString(GetInstanceMember(instance, "ActiveGame"));
            if (!string.Equals(activeGame, "GSD1", StringComparison.OrdinalIgnoreCase))
            {
                reason = "Suikoden Fix reports ActiveGame=" + activeGame;
                return true;
            }
            FieldInfo chapterField = type.GetField("_chapter", BindingFlags.Instance | BindingFlags.NonPublic);
            string chapter = chapterField == null ? null : Convert.ToString(chapterField.GetValue(instance));
            if (!string.Equals(chapter, "Map", StringComparison.OrdinalIgnoreCase))
            {
                reason = "Suikoden Fix chapter=" + (chapter ?? "<unavailable>");
                return true;
            }
            string[] boolMembers = { "IsMenuOpened", "IsMessageBoxOpened", "IsInSpecialMenu", "IsInGameEvent", "IsInDanceMinigame", "IsInMovieGallery", "GamePaused" };
            foreach (string member in boolMembers)
            {
                object value = GetInstanceMember(instance, member);
                if (value is bool b && b)
                {
                    reason = "Suikoden Fix safety flag " + member + "=true";
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
            reason = "Suikoden Fix safety check failed: " + ex.Message;
            return true;
        }
    }

    private static bool IsStandardWindowOpen(out string reason)
    {
        reason = "";
        try
        {
            Type type = FindType("GSD1.WindowManager") ?? FindTypeByName("WindowManager");
            if (type == null) return false;
            object manager = GetStaticMember(type, "Instance");
            if (manager == null) return false;
            MethodInfo getIsOpen = type.GetMethod("GetIsOpen", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (getIsOpen != null && getIsOpen.GetParameters().Length == 0)
            {
                object result = getIsOpen.Invoke(manager, Array.Empty<object>());
                if (result is bool b && b)
                {
                    reason = "message/window manager is open";
                    return true;
                }
            }
            MethodInfo getMenu = type.GetMethod("GetMenuWindow", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
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
            reason = "window safety check failed: " + ex.Message;
            return true;
        }
        return false;
    }

    private static Type FindType(string fullName)
    {
        foreach (Assembly asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            try
            {
                Type type = asm.GetType(fullName, false);
                if (type != null) return type;
            }
            catch { }
        }
        return null;
    }

    private static Type FindTypeByName(string name)
    {
        foreach (Assembly asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            try
            {
                Type type = asm.GetTypes().FirstOrDefault(t => t.Name == name);
                if (type != null) return type;
            }
            catch (ReflectionTypeLoadException rtl)
            {
                Type type = rtl.Types == null ? null : rtl.Types.FirstOrDefault(t => t != null && t.Name == name);
                if (type != null) return type;
            }
            catch { }
        }
        return null;
    }

    private static object GetStaticMember(Type type, string name)
    {
        if (type == null) return null;
        BindingFlags flags = BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;
        try
        {
            PropertyInfo prop = type.GetProperty(name, flags);
            if (prop != null && prop.GetIndexParameters().Length == 0) return prop.GetValue(null);
            FieldInfo field = type.GetField(name, flags);
            if (field != null) return field.GetValue(null);
        }
        catch { }
        return null;
    }

    private static object GetInstanceMember(object instance, string name)
    {
        if (instance == null) return null;
        BindingFlags flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        Type type = instance.GetType();
        try
        {
            PropertyInfo prop = type.GetProperty(name, flags);
            if (prop != null && prop.GetIndexParameters().Length == 0) return prop.GetValue(instance);
            FieldInfo field = type.GetField(name, flags);
            if (field != null) return field.GetValue(instance);
        }
        catch { }
        return null;
    }
}
