using BepInEx;
using BepInEx.Logging;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace HinataS1TextRootFix;

[BepInPlugin(PluginGuid, PluginName, PluginVersion)]
[BepInDependency("faospark.pkcore", BepInDependency.DependencyFlags.HardDependency)]
public sealed class Plugin : BasePlugin
{
    public const string PluginGuid = "hinata.s1textrootfix";
    public const string PluginName = "Hinata S1 Text Root Fix";
    public const string PluginVersion = "1.0.0";

    private static ManualLogSource _log;
    private static Harmony _harmony;
    private static string _currentSpeakerCanonical;
    private static object _currentWindow;
    private static string _pending = "";
    private static bool _emitting;
    private static PropertyInfo _lastMessageIdProperty;
    private static readonly HashSet<string> _loggedSpeakerPairs = new(StringComparer.Ordinal);

    // All display names are intentionally the project's current in-game short labels.
    private static readonly Dictionary<string, string> NameMap = new(StringComparer.Ordinal)
    {
        ["バルカス"] = "ダテ",
        ["ロニー・ベル"] = "スズカ",
        ["クレオ"] = "ヒコロヒー",
        ["フリック"] = "シホ",
        ["フッチ"] = "アカリ",
        ["グレミオ"] = "ミレイ",
        ["ハンフリー"] = "トシアキ",
        ["ヘリオン"] = "ラブ先生",
        ["カミーユ"] = "アヤカ",
        ["カスミ"] = "メイ",
        ["クライブ"] = "マナブ",
        ["ルック"] = "ユウカ",
        ["メグ"] = "ヒナノ",
        ["ミルイヒ"] = "マリィ",
        ["ミルイヒ・オッペンハイマー"] = "マリィ",
        ["オデッサ"] = "メミ",
        ["パーン"] = "コヤブ",
        ["シドニア"] = "トミザワ",
        ["ソニア"] = "マナ",
        ["ソニア・シューレン"] = "マナ",
        ["スタリオン"] = "ハルヨ",
        ["テッド"] = "ミク",
        ["テンガアール"] = "ヒヨリ",
        ["ビクトール"] = "キョウコ",
        ["バレリア"] = "ミホ",
        ["マッシュ"] = "クミ",
        ["テスラ"] = "サリナ",
        ["マリー"] = "マオ",
        ["ヴァンサン"] = "タケシ",
        ["ヴァンサン・ド・ブール"] = "タケシ",
        ["アップル"] = "コノカ",
        ["ヨシュア"] = "ミツハル",
        ["ガスパー"] = "イチロウタ",
        ["ビッキー"] = "ヒナ",
        ["ジーン"] = "マナモ",
        ["チャンドラー"] = "オカダ",
        ["レオン"] = "マサヤス",
        ["レオン・シルバーバーグ"] = "マサヤス",
        ["レックナート"] = "ネル"
    };

    // Canonical original role for aliases and already-mapped names.
    private static readonly Dictionary<string, string> CanonicalSpeaker = BuildCanonicalSpeakerMap();

    // Original male roles currently represented by women. Only self-reference is normalized at render time.
    // This is deliberately speaker-scoped: unchanged male characters keep their original pronouns.
    private static readonly HashSet<string> FemaleRecastMaleRoles = new(StringComparer.Ordinal)
    {
        "フリック", "フッチ", "グレミオ", "ルック", "ミルイヒ",
        "スタリオン", "テッド", "ビクトール", "マッシュ", "テスラ"
    };

    // Longest forms first. The stream filter waits when a shorter token could grow into a longer token.
    private static readonly Dictionary<string, string> FirstPersonMap = new(StringComparer.Ordinal)
    {
        ["おれ様"] = "私",
        ["オレ様"] = "私",
        ["俺様"] = "私",
        ["おれ"] = "私",
        ["オレ"] = "私",
        ["俺"] = "私",
        ["ぼく"] = "私",
        ["僕"] = "私"
    };

    public override void Load()
    {
        _log = Log;
        _harmony = new Harmony(PluginGuid);

        try
        {
            var pkTextPatch = AccessTools.TypeByName("PKCore.Patches.TextDatabasePatch");
            _lastMessageIdProperty = pkTextPatch?.GetProperty("LastMessageTextId", BindingFlags.Public | BindingFlags.Static);

            var messageType = AccessTools.TypeByName("Share.UI.Window.UIMessageWindow");
            if (messageType == null)
            {
                _log.LogError("[TextRootFix] Share.UI.Window.UIMessageWindow not found. No patches applied.");
                return;
            }

            int nameCount = 0;
            int charCount = 0;
            var flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static;

            foreach (var method in messageType.GetMethods(flags))
            {
                var ps = method.GetParameters();
                if ((method.Name == "AddNameText" || method.Name == "SetMessageNameText") &&
                    ps.Length == 1 && ps[0].ParameterType == typeof(string))
                {
                    var hm = new HarmonyMethod(typeof(Plugin).GetMethod(nameof(NamePrefix), BindingFlags.NonPublic | BindingFlags.Static));
                    hm.priority = Priority.Last;
                    _harmony.Patch(method, prefix: hm);
                    nameCount++;
                }
                else if (method.Name == "AddMessageText" && ps.Length == 1 && ps[0].ParameterType == typeof(char))
                {
                    var hm = new HarmonyMethod(typeof(Plugin).GetMethod(nameof(MessageCharPrefix), BindingFlags.NonPublic | BindingFlags.Static));
                    hm.priority = Priority.Last;
                    _harmony.Patch(method, prefix: hm);
                    charCount++;
                }
            }

            _log.LogInfo($"[TextRootFix] Loaded v{PluginVersion}. Name hooks={nameCount}, character-stream hooks={charCount}.");
            _log.LogInfo("[TextRootFix] Speaker names use current cast. Female-recast male self-pronouns are normalized only for their own dialogue.");
        }
        catch (Exception ex)
        {
            _log.LogError($"[TextRootFix] Load failed safely: {ex}");
        }
    }

    private static Dictionary<string, string> BuildCanonicalSpeakerMap()
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var kv in NameMap)
        {
            string canonical = kv.Key switch
            {
                "ミルイヒ・オッペンハイマー" => "ミルイヒ",
                "ヴァンサン・ド・ブール" => "ヴァンサン",
                "レオン・シルバーバーグ" => "レオン",
                "ソニア・シューレン" => "ソニア",
                _ => kv.Key
            };
            result[kv.Key] = canonical;
            if (!result.ContainsKey(kv.Value))
                result[kv.Value] = canonical;
        }
        result["タイ・ホー"] = "タイ・ホー";
        result["ヤム・クー"] = "ヤム・クー";
        return result;
    }

    private static void NamePrefix(object __instance, ref string __0)
    {
        try
        {
            // No supported dialogue line ends with one of the buffered pronoun tokens; clearing here is a safe
            // boundary guard and prevents a previous message from leaking into the next one.
            if (_pending.Length != 0)
            {
                _log.LogWarning($"[TextRootFix] Dropping unexpected pending token at speaker boundary: '{_pending}'.");
                _pending = "";
            }

            _currentWindow = __instance;
            string originalName = __0 ?? "";
            _currentSpeakerCanonical = CanonicalSpeaker.TryGetValue(originalName, out var canonical) ? canonical : originalName;

            if (NameMap.TryGetValue(originalName, out string mapped))
                __0 = mapped;

            string id = GetLastMessageId();
            if (!string.IsNullOrEmpty(id) && !string.IsNullOrEmpty(originalName) && NameMap.ContainsKey(originalName))
            {
                string key = id + "|" + originalName;
                if (_loggedSpeakerPairs.Add(key))
                    _log.LogInfo($"[TextRootFix][Speaker] {id}: {originalName} -> {__0}");
            }
        }
        catch (Exception ex)
        {
            _log?.LogWarning($"[TextRootFix] Name normalization skipped safely: {ex.Message}");
        }
    }

    private static bool MessageCharPrefix(object __instance, char __0, MethodBase __originalMethod)
    {
        if (_emitting)
            return true;

        try
        {
            if (!FemaleRecastMaleRoles.Contains(_currentSpeakerCanonical ?? ""))
            {
                _pending = "";
                return true;
            }

            // Fast path: this character cannot begin a configured first-person token.
            if (_pending.Length == 0 && !CanStartToken(__0))
                return true;

            _currentWindow = __instance;
            _pending += __0;
            ProcessPending(__instance, (MethodInfo)__originalMethod);
            return false;
        }
        catch (Exception ex)
        {
            _pending = "";
            _log?.LogWarning($"[TextRootFix] Character-stream normalization skipped safely: {ex.Message}");
            return true;
        }
    }

    private static bool CanStartToken(char c)
    {
        foreach (string token in FirstPersonMap.Keys)
            if (token.Length > 0 && token[0] == c)
                return true;
        return false;
    }

    private static void ProcessPending(object instance, MethodInfo original)
    {
        while (_pending.Length > 0)
        {
            bool isPrefix = FirstPersonMap.Keys.Any(k => k.StartsWith(_pending, StringComparison.Ordinal));
            if (isPrefix)
            {
                bool exact = FirstPersonMap.TryGetValue(_pending, out string replacement);
                bool hasLonger = FirstPersonMap.Keys.Any(k => k.Length > _pending.Length && k.StartsWith(_pending, StringComparison.Ordinal));
                if (exact && !hasLonger)
                {
                    Emit(instance, original, replacement);
                    _pending = "";
                }
                // Otherwise wait for the next source character so longest-match wins.
                return;
            }

            // Buffer is no longer a prefix. If an exact token is at its start, emit its replacement.
            string exactPrefix = FirstPersonMap.Keys
                .Where(k => _pending.StartsWith(k, StringComparison.Ordinal))
                .OrderByDescending(k => k.Length)
                .FirstOrDefault();

            if (exactPrefix != null)
            {
                Emit(instance, original, FirstPersonMap[exactPrefix]);
                _pending = _pending.Substring(exactPrefix.Length);
                continue;
            }

            // No configured token: release the oldest buffered source character unchanged.
            Emit(instance, original, _pending.Substring(0, 1));
            _pending = _pending.Substring(1);
        }
    }

    private static void Emit(object instance, MethodInfo original, string text)
    {
        if (string.IsNullOrEmpty(text)) return;
        _emitting = true;
        try
        {
            foreach (char c in text)
                original.Invoke(instance, new object[] { c });
        }
        finally
        {
            _emitting = false;
        }
    }

    private static string GetLastMessageId()
    {
        try
        {
            return _lastMessageIdProperty?.GetValue(null) as string;
        }
        catch
        {
            return null;
        }
    }
}
