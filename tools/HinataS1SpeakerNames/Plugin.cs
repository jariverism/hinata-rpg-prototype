using BepInEx;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace HinataS1SpeakerNames;

[BepInPlugin("hinata.s1.speaker.names", "Hinata S1 Speaker Names", "0.3.0")]
public sealed class Plugin : BasePlugin
{
    public override void Load()
    {
        var harmony = new Harmony("hinata.s1.speaker.names");
        harmony.PatchAll(typeof(AddNameTextPatch));
        harmony.PatchAll(typeof(UiStandaloneNamePatch));
        Log.LogInfo("Hinata S1 Speaker Names 0.3.0 loaded (speaker + standalone UI world-name rules).");
    }
}

internal static class TypeFinder
{
    public static Type? Find(string fullName)
    {
        foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            try
            {
                var type = asm.GetType(fullName, throwOnError: false, ignoreCase: false);
                if (type != null)
                    return type;
            }
            catch
            {
                // Some IL2CPP proxy assemblies contain unloadable metadata types.
                // GetType(fullName) is normally safe, but keep lookup non-fatal.
            }
        }
        return null;
    }
}

internal static class WorldNameAliases
{
    private static readonly Dictionary<string, string> Aliases = new(StringComparer.Ordinal)
    {
        ["グレミオ"] = "ミレイ",
        ["テッド"] = "ミク",
        ["レックナート"] = "ネル",
        ["マッシュ"] = "クミ",
        ["マッシュ・シルバーバーグ"] = "クミ・シルバーバーグ",
        ["アップル"] = "コノカ",
        ["ハンフリー"] = "トシアキ",
        ["ハンフリー・ミンツ"] = "トシアキ・ミンツ",
        ["フッチ"] = "アカリ",
        ["ルック"] = "ユウカ",
        ["レオン"] = "マサヤス",
        ["レオン・シルバーバーグ"] = "マサヤス・シルバーバーグ",
        ["ビクトール"] = "シホ",
        ["カスミ"] = "メイ",
        ["バレリア"] = "ミホ",
        ["オデッサ"] = "メミ",
        ["オデッサ・シルバーバーグ"] = "メミ・シルバーバーグ",
        ["ビッキー"] = "ヒナ",
        ["ジーン"] = "マナモ",
        ["スタリオン"] = "ハルヨ",
        ["ミルイヒ"] = "マリィ",
        ["ミルイヒ・オッペンハイマー"] = "マリィ・オッペンハイマー",
        ["ロニー"] = "スズカ",
        ["ロニー・ベル"] = "スズカ・ベル",
        ["カミーユ"] = "アヤカ",
        ["マリー"] = "マオ",
        ["ガスパー"] = "イチロウタ",
        ["ヴァンサン"] = "タケシ",
        ["ヴァンサン・ド・ブール"] = "タケシ・ド・ブール",
        ["ヘリオン"] = "ラブ先生",
        ["タイ・ホー"] = "マナブ",
        ["ヤム・クー"] = "ミツハル",
        ["フリック"] = "マナ",
        ["テスラ"] = "サリナ",
        ["クレオ"] = "ヒコロヒー",
        ["パーン"] = "コヤブ",
        ["ソニア"] = "キョウコ",
        ["ソニア・シューレン"] = "キョウコ・シューレン",
        ["テンガアール"] = "ヒヨリ"
    };

    public static bool TryReplace(string? source, out string replacement)
    {
        if (string.IsNullOrEmpty(source))
        {
            replacement = source ?? string.Empty;
            return false;
        }
        return Aliases.TryGetValue(source, out replacement!);
    }

    public static bool IsGsd1()
    {
        try
        {
            var type = TypeFinder.Find("PKCore.Patches.GameDetection");
            var method = type == null ? null : AccessTools.Method(type, "IsGSD1");
            return method?.Invoke(null, null) is bool value && value;
        }
        catch
        {
            return false;
        }
    }
}

[HarmonyPatch]
internal static class AddNameTextPatch
{
    private static MethodBase TargetMethod()
    {
        var type = TypeFinder.Find("Share.UI.Window.UIMessageWindow")
            ?? throw new TypeLoadException("Share.UI.Window.UIMessageWindow was not found.");
        return AccessTools.Method(type, "AddNameText")
            ?? throw new MissingMethodException(type.FullName, "AddNameText");
    }

    [HarmonyPrefix]
    [HarmonyPriority(Priority.Last)]
    private static void Prefix(ref string name)
    {
        if (!WorldNameAliases.IsGsd1())
            return;

        if (WorldNameAliases.TryReplace(name, out var replacement))
            name = replacement;
    }
}

// Battle status panels (and a few other UI panels) do not use AddNameText.
// They set the character name directly on a TextMeshPro/Unity UI text object.
// Patch only exact standalone strings, never substrings inside dialogue sentences.
[HarmonyPatch]
internal static class UiStandaloneNamePatch
{
    private static IEnumerable<MethodBase> TargetMethods()
    {
        var seen = new HashSet<MethodBase>();
        string[] typeNames =
        {
            "TMPro.TMP_Text",
            "TMPro.TextMeshProUGUI",
            "TMPro.TextMeshPro",
            "UnityEngine.UI.Text"
        };

        foreach (var typeName in typeNames)
        {
            var type = TypeFinder.Find(typeName);
            if (type == null)
                continue;

            var textProperty = type.GetProperty("text", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            var setter = textProperty?.GetSetMethod(nonPublic: true);
            if (setter != null && seen.Add(setter))
                yield return setter;

            foreach (var method in type.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic))
            {
                if (!string.Equals(method.Name, "SetText", StringComparison.Ordinal))
                    continue;

                var parameters = method.GetParameters();
                if (parameters.Length == 0 || parameters[0].ParameterType != typeof(string))
                    continue;

                if (seen.Add(method))
                    yield return method;
            }
        }
    }

    [HarmonyPrefix]
    [HarmonyPriority(Priority.Last)]
    private static void Prefix(ref string __0)
    {
        if (!WorldNameAliases.IsGsd1())
            return;

        if (WorldNameAliases.TryReplace(__0, out var replacement))
            __0 = replacement;
    }
}
