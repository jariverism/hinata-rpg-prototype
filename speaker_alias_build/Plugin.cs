using BepInEx;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using System;
using System.Collections.Generic;
using System.Reflection;

namespace HinataS1SpeakerNames;

[BepInPlugin("hinata.s1.speaker.names", "Hinata S1 Speaker Names", "0.1.0")]
public sealed class Plugin : BasePlugin
{
    public override void Load()
    {
        Harmony.CreateAndPatchAll(typeof(AddNameTextPatch));
        Log.LogInfo("Hinata S1 Speaker Names loaded.");
    }
}

[HarmonyPatch]
internal static class AddNameTextPatch
{
    private static readonly Dictionary<string, string> Aliases = new(StringComparer.Ordinal)
    {
        ["グレミオ"] = "美玲",
        ["テッド"] = "美玖",
        ["レックナート"] = "ねる",
        ["マッシュ"] = "久美",
        ["アップル"] = "好花",
        ["ハンフリー"] = "春日",
        ["フッチ"] = "丹生",
        ["ルック"] = "優佳",
        ["レオン・シルバーバーグ"] = "若林",
        ["ビクトール"] = "史帆",
        ["カスミ"] = "芽依",
        ["バレリア"] = "美穂",
        ["オデッサ"] = "芽実",
    };

    private static MethodBase? TargetMethod()
    {
        var type = AccessTools.TypeByName("Share.UI.Window.UIMessageWindow");
        return type == null ? null : AccessTools.Method(type, "AddNameText", new[] { typeof(string) });
    }

    [HarmonyPrefix]
    [HarmonyPriority(Priority.Last)]
    private static void Prefix(ref string name)
    {
        if (string.IsNullOrEmpty(name) || !IsGsd1())
            return;

        if (Aliases.TryGetValue(name, out var replacement))
            name = replacement;
    }

    private static bool IsGsd1()
    {
        try
        {
            var type = Type.GetType("PKCore.Patches.GameDetection, PKCore", throwOnError: false);
            var method = type?.GetMethod("IsGSD1", BindingFlags.Public | BindingFlags.Static);
            return method?.Invoke(null, null) is bool result && result;
        }
        catch
        {
            return false;
        }
    }
}
