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
    public const string PluginGuid = "hinata.s1speakernames.v8";
    public const string PluginName = "Hinata S1 Speaker Names V8";
    public const string PluginVersion = "1.0.0";

    private static ManualLogSource _log;
    private static Harmony _harmony;

    private static readonly Dictionary<string,string> Map = new(StringComparer.Ordinal)
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
        ["ソニア"] = "マナ",
        ["テスラ"] = "サリナ",
        ["クレオ"] = "ヒコロヒー",
        ["パーン"] = "コヤブ",
        ["テンガアール"] = "ヒヨリ",
        ["クライブ"] = "マナブ",
        ["ヨシュア"] = "ミツハル",
        ["チャンドラー"] = "オカダ",
        ["バルカス"] = "ダテ",
        ["シドニア"] = "トミザワ"
    };

    public override void Load()
    {
        _log = Log;
        _harmony = new Harmony(PluginGuid);
        try
        {
            var type = FindType("Share.UI.Window.UIMessageWindow") ?? FindTypeByName("UIMessageWindow");
            if (type == null)
            {
                _log.LogError("[SpeakerNamesV8] UIMessageWindow type not found.");
                return;
            }
            var target = type.GetMethods(BindingFlags.Instance|BindingFlags.Public|BindingFlags.NonPublic)
                .FirstOrDefault(m => m.Name == "AddNameText" && m.GetParameters().Length >= 1 && m.GetParameters()[0].ParameterType == typeof(string));
            if (target == null)
            {
                _log.LogError("[SpeakerNamesV8] AddNameText(string...) not found.");
                return;
            }
            var prefix = typeof(Plugin).GetMethod(nameof(AddNamePrefix), BindingFlags.Static|BindingFlags.NonPublic);
            _harmony.Patch(target, prefix: new HarmonyMethod(prefix));
            _log.LogInfo($"[SpeakerNamesV8] Ready. Patched {type.FullName}.{target.Name}; mappings={Map.Count}.");
        }
        catch (Exception ex)
        {
            _log.LogError($"[SpeakerNamesV8] Load failed safely: {ex}");
        }
    }

    private static void AddNamePrefix(ref string __0)
    {
        try
        {
            if (string.IsNullOrEmpty(__0) || !IsGsd1()) return;
            string raw = __0;
            string trimmed = raw.Trim();
            if (!Map.TryGetValue(trimmed, out string replacement)) return;
            int lead = 0; while (lead < raw.Length && char.IsWhiteSpace(raw[lead])) lead++;
            int trail = raw.Length; while (trail > lead && char.IsWhiteSpace(raw[trail-1])) trail--;
            __0 = raw.Substring(0, lead) + replacement + raw.Substring(trail);
        }
        catch (Exception ex)
        {
            _log?.LogWarning($"[SpeakerNamesV8] Prefix failed safely: {ex.Message}");
        }
    }

    private static bool IsGsd1()
    {
        try
        {
            var t = FindType("Suikoden_Fix.ModComponent");
            if (t != null)
            {
                object inst = GetStaticMember(t, "Instance");
                if (inst != null)
                {
                    string g = Convert.ToString(GetInstanceMember(inst, "ActiveGame"));
                    if (!string.IsNullOrEmpty(g)) return string.Equals(g, "GSD1", StringComparison.OrdinalIgnoreCase);
                }
            }
        }
        catch { }
        return false;
    }

    private static Type FindType(string fullName)
    {
        foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            try { var t = asm.GetType(fullName, false); if (t != null) return t; } catch { }
        }
        return null;
    }
    private static Type FindTypeByName(string name)
    {
        foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            try { var t = asm.GetTypes().FirstOrDefault(x => x.Name == name); if (t != null) return t; }
            catch (ReflectionTypeLoadException e) { var t=e.Types?.FirstOrDefault(x=>x!=null&&x.Name==name); if(t!=null)return t; }
            catch { }
        }
        return null;
    }
    private static object GetStaticMember(Type t, string name)
    {
        var f=BindingFlags.Static|BindingFlags.Public|BindingFlags.NonPublic;
        try { var p=t.GetProperty(name,f); if(p!=null)return p.GetValue(null); var q=t.GetField(name,f); if(q!=null)return q.GetValue(null); } catch { }
        return null;
    }
    private static object GetInstanceMember(object o, string name)
    {
        if(o==null)return null; var t=o.GetType(); var f=BindingFlags.Instance|BindingFlags.Public|BindingFlags.NonPublic;
        try { var p=t.GetProperty(name,f); if(p!=null)return p.GetValue(o); var q=t.GetField(name,f); if(q!=null)return q.GetValue(o); } catch { }
        return null;
    }
}
