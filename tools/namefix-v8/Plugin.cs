using BepInEx;
using BepInEx.Logging;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace HinataS1SpeakerNames;

[BepInPlugin(PluginGuid, PluginName, PluginVersion)]
public sealed class Plugin : BasePlugin
{
    public const string PluginGuid = "hinata.s1speakernames.clean";
    public const string PluginName = "Hinata S1 Speaker Names Clean";
    public const string PluginVersion = "1.0.0";

    private static ManualLogSource _logger;
    private static Harmony _harmony;

    private static readonly Dictionary<string, string> NameMap = new(StringComparer.Ordinal)
    {
        ["グレミオ"] = "ミレイ",
        ["テッド"] = "ミク",
        ["レックナート"] = "ネル",
        ["マッシュ"] = "クミ",
        ["アップル"] = "コノカ",
        ["ハンフリー"] = "トシアキ",
        ["フッチ"] = "アカリ",
        ["オデッサ"] = "メミ",
        ["オデッサ・シルバーバーグ"] = "メミ・シルバーバーグ",
        ["ルック"] = "ユウカ",
        ["レオン"] = "マサヤス",
        ["レオン・シルバーバーグ"] = "マサヤス・シルバーバーグ",
        ["ビクトール"] = "キョウコ",
        ["カスミ"] = "メイ",
        ["バレリア"] = "ミホ",
        ["ビッキー"] = "ヒナ",
        ["ジーン"] = "マナモ",
        ["スタリオン"] = "ハルヨ",
        ["メグ"] = "ヒナノ",
        ["ミルイヒ"] = "マリィ",
        ["ロニー"] = "スズカ",
        ["ロニー・ベル"] = "スズカ・ベル",
        ["カミーユ"] = "アヤカ",
        ["マリー"] = "マオ",
        ["ガスパー"] = "イチロウタ",
        ["ヴァンサン"] = "タケシ",
        ["ヴァンサン・ド・ブール"] = "タケシ・ド・ブール",
        ["ヘリオン"] = "ラブ先生",
        ["フリック"] = "シホ",
        ["テスラ"] = "サリナ",
        ["クレオ"] = "ヒコロヒー",
        ["パーン"] = "コヤブ",
        ["ソニア"] = "マナ",
        ["ソニア・シューレン"] = "マナ・シューレン",
        ["テンガアール"] = "ヒヨリ",
        ["クライブ"] = "マナブ",
        ["ヨシュア"] = "ミツハル",
        ["チャンドラー"] = "オカダ",
        ["バルカス"] = "ダテ",
        ["シドニア"] = "トミザワ",
        ["タイ・ホー"] = "タイ・ホー",
        ["ヤム・クー"] = "ヤム・クー"
    };

    public override void Load()
    {
        _logger = base.Log;
        _harmony = new Harmony(PluginGuid);
        _logger.LogInfo($"[{PluginName}] Loading v{PluginVersion}");

        try
        {
            var targetType = FindType("Share.UI.Window.UIMessageWindow") ?? FindTypeByName("UIMessageWindow");
            if (targetType == null)
            {
                _logger.LogError("[SpeakerNames] UIMessageWindow type not found. No patch applied.");
                return;
            }

            var flags = BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;
            var targets = targetType.GetMethods(flags)
                .Where(m => m.Name == "AddNameText")
                .ToArray();

            if (targets.Length == 0)
            {
                _logger.LogError("[SpeakerNames] AddNameText method not found. No patch applied.");
                return;
            }

            var prefix = new HarmonyMethod(typeof(Plugin).GetMethod(nameof(AddNameTextPrefix), BindingFlags.Static | BindingFlags.NonPublic));
            foreach (var target in targets)
            {
                _harmony.Patch(target, prefix: prefix);
                _logger.LogInfo($"[SpeakerNames] Patched {target.DeclaringType?.FullName}.{target.Name}({string.Join(",", target.GetParameters().Select(p => p.ParameterType.Name))})");
            }

            _logger.LogInfo($"[SpeakerNames] Ready. Current cast entries: {NameMap.Count}.");
        }
        catch (Exception ex)
        {
            _logger.LogError($"[SpeakerNames] Load failed safely: {ex}");
        }
    }

    private static void AddNameTextPrefix(object[] __args)
    {
        try
        {
            if (!IsGsd1())
                return;

            if (__args == null)
                return;

            for (int i = 0; i < __args.Length; i++)
            {
                if (__args[i] is not string value)
                    continue;

                if (NameMap.TryGetValue(value, out string replacement) && replacement != value)
                {
                    __args[i] = replacement;
                    _logger?.LogDebug($"[SpeakerNames] {value} -> {replacement}");
                    return;
                }

                string trimmed = value.Trim();
                if (trimmed.Length != value.Length && NameMap.TryGetValue(trimmed, out replacement) && replacement != trimmed)
                {
                    int left = value.Length - value.TrimStart().Length;
                    int right = value.Length - value.TrimEnd().Length;
                    __args[i] = new string(' ', left) + replacement + new string(' ', right);
                    _logger?.LogDebug($"[SpeakerNames] {trimmed} -> {replacement} (preserved spaces)");
                    return;
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning($"[SpeakerNames] Prefix failed safely: {ex.Message}");
        }
    }

    private static bool IsGsd1()
    {
        try
        {
            var fixType = FindType("Suikoden_Fix.ModComponent");
            if (fixType != null)
            {
                object instance = GetStaticMember(fixType, "Instance");
                if (instance != null)
                {
                    string activeGame = Convert.ToString(GetInstanceMember(instance, "ActiveGame"));
                    if (!string.IsNullOrEmpty(activeGame))
                        return string.Equals(activeGame, "GSD1", StringComparison.OrdinalIgnoreCase);
                }
            }
        }
        catch { }

        // Fail closed: never rewrite names if GSD1 cannot be positively identified.
        return false;
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
        var type = instance.GetType();
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
