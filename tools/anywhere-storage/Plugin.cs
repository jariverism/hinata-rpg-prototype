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
    public const string PluginVersion = "0.4.0-diag";

    private const int VK_F8 = 0x77;
    private static ManualLogSource _logger;
    private static Harmony _harmony;
    private static bool _previousF8Down;
    private static int _frameCounter;

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    public override void Load()
    {
        _logger = base.Log;
        _harmony = new Harmony(PluginGuid);
        _logger.LogInfo($"[{PluginName}] Loading v{PluginVersion}");
        _logger.LogInfo("[AnywhereStorage] Diagnostic build: F8 only inspects the original warehouse class. It does NOT invoke azukari_start.");

        try
        {
            var pkPlugin = FindType("PKCore.Plugin");
            var update = pkPlugin?.GetMethod("Update", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            var postfix = typeof(Plugin).GetMethod(nameof(FramePostfix), BindingFlags.Static | BindingFlags.NonPublic);
            if (update == null || postfix == null)
            {
                _logger.LogError("[AnywhereStorage] Could not hook PKCore update loop. Diagnostic disabled.");
                return;
            }
            _harmony.Patch(update, postfix: new HarmonyMethod(postfix));
            _logger.LogInfo("[AnywhereStorage] Diagnostic ready. Press F8 once while walking normally.");
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
                _logger.LogInfo($"[AnywhereStorage] F8 diagnostic triggered (state=0x{((ushort)state):X4}).");
                DumpStorageClass();
            }
            _previousF8Down = down;
        }
        catch (Exception ex)
        {
            _logger?.LogError($"[AnywhereStorage] Frame diagnostic error: {ex}");
        }
    }

    private static void DumpStorageClass()
    {
        try
        {
            var type = FindType("GSD1.D_azukar_c") ?? FindTypeByName("D_azukar_c");
            if (type == null)
            {
                _logger.LogError("[AnywhereStorage][DIAG] D_azukar_c type not found.");
                return;
            }

            var allFlags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance | BindingFlags.DeclaredOnly;
            _logger.LogInfo($"[AnywhereStorage][DIAG] TYPE {type.FullName}");

            var methods = type.GetMethods(allFlags)
                .OrderBy(m => m.IsStatic ? 0 : 1)
                .ThenBy(m => m.GetParameters().Length)
                .ThenBy(m => m.Name)
                .ToArray();
            _logger.LogInfo($"[AnywhereStorage][DIAG] METHODS count={methods.Length}");
            foreach (var m in methods)
            {
                string pars = string.Join(",", m.GetParameters().Select(p => p.ParameterType.Name));
                _logger.LogInfo($"[AnywhereStorage][DIAG][METHOD] {(m.IsStatic ? "static" : "instance")} {m.ReturnType.Name} {m.Name}({pars})");
            }

            var fields = type.GetFields(allFlags).OrderBy(f => f.Name).ToArray();
            _logger.LogInfo($"[AnywhereStorage][DIAG] FIELDS count={fields.Length}");
            foreach (var f in fields)
            {
                string valueText;
                if (!f.IsStatic)
                {
                    valueText = "<instance-field>";
                }
                else
                {
                    try
                    {
                        object value = f.GetValue(null);
                        valueText = DescribeValue(value);
                    }
                    catch (Exception ex)
                    {
                        valueText = $"<read-error:{ex.GetType().Name}>";
                    }
                }
                _logger.LogInfo($"[AnywhereStorage][DIAG][FIELD] {(f.IsStatic ? "static" : "instance")} {f.FieldType.Name} {f.Name} = {valueText}");
            }

            var props = type.GetProperties(allFlags).OrderBy(p => p.Name).ToArray();
            _logger.LogInfo($"[AnywhereStorage][DIAG] PROPERTIES count={props.Length}");
            foreach (var p in props)
            {
                string valueText = "<not-read>";
                var getter = p.GetGetMethod(true);
                if (getter != null && getter.IsStatic && p.GetIndexParameters().Length == 0)
                {
                    try
                    {
                        valueText = DescribeValue(p.GetValue(null));
                    }
                    catch (Exception ex)
                    {
                        valueText = $"<read-error:{ex.GetType().Name}>";
                    }
                }
                _logger.LogInfo($"[AnywhereStorage][DIAG][PROP] {(getter != null && getter.IsStatic ? "static" : "instance")} {p.PropertyType.Name} {p.Name} = {valueText}");
            }

            _logger.LogInfo("[AnywhereStorage][DIAG] END. No warehouse method was invoked.");
        }
        catch (Exception ex)
        {
            _logger.LogError($"[AnywhereStorage][DIAG] Dump failed safely: {ex}");
        }
    }

    private static string DescribeValue(object value)
    {
        if (value == null)
            return "<NULL>";
        try
        {
            Type t = value.GetType();
            if (t.IsPrimitive || value is string || value is decimal || value is Enum)
                return Convert.ToString(value) ?? "<null-string>";

            var count = t.GetProperty("Count", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (count != null)
            {
                try { return $"<{t.Name}; Count={count.GetValue(value)}>"; } catch { }
            }
            return $"<{t.Name}; non-null>";
        }
        catch
        {
            return "<non-null>";
        }
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
}
