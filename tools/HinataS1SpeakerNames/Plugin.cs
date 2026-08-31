using BepInEx;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using System;
using System.Collections.Generic;
using System.Reflection;

namespace HinataS1SpeakerNames;

[BepInPlugin("hinata.s1.speaker.names", "Hinata S1 Speaker Names", "0.2.0")]
public sealed class Plugin : BasePlugin
{
    public override void Load()
    {
        Harmony.CreateAndPatchAll(typeof(AddNameTextPatch));
        Log.LogInfo("Hinata S1 Speaker Names 0.2.0 loaded (world-name rules).");
    }
}

[HarmonyPatch]
internal static class AddNameTextPatch
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

    private static MethodBase TargetMethod()
    {
        var type = AccessTools.TypeByName("Share.UI.Window.UIMessageWindow")
            ?? throw new TypeLoadException("Share.UI.Window.UIMessageWindow was not found.");
        return AccessTools.Method(type, "AddNameText")
            ?? throw new MissingMethodException(type.FullName, "AddNameText");
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
            var type = AccessTools.TypeByName("PKCore.Patches.GameDetection");
            if (type == null)
                return false;

            var method = AccessTools.Method(type, "IsGSD1");
            if (method == null)
                return false;

            return method.Invoke(null, null) is bool value && value;
        }
        catch
        {
            return false;
        }
    }
}
