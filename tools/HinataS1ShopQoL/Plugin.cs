using BepInEx;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text;

namespace HinataS1ShopQoL;

[BepInPlugin("hinata.s1.shop.qol", "Hinata S1 Shop QoL Diagnostics", "0.1.0")]
public sealed class Plugin : BasePlugin
{
    internal static BepInEx.Logging.ManualLogSource L = null!;

    public override void Load()
    {
        L = Log;
        Harmony.CreateAndPatchAll(typeof(ShopMainPatch));
        Harmony.CreateAndPatchAll(typeof(EquipMainPatch));
        Log.LogInfo("Hinata S1 Shop QoL Diagnostics 0.1.0 loaded.");
        Log.LogInfo("Open a Suikoden I armor/item shop and move the cursor across a few items/party members; then open Equipment and browse another member's bag.");
    }
}

internal static class RuntimeDump
{
    private static string _shopFingerprint = "";
    private static string _equipFingerprint = "";

    internal static void DumpShop()
    {
        var t = AccessTools.TypeByName("h_omise_c");
        if (t == null) return;
        var fingerprint = Fingerprint(t, new[] { "selected_command", "selected_player", "party_selected_player", "selected_item", "selected_item_id", "cur_soubi_kind" });
        if (fingerprint == _shopFingerprint) return;
        _shopFingerprint = fingerprint;
        Plugin.L.LogInfo("[HinataQoL-DIAG][SHOP] " + fingerprint);
        DumpStatics(t, "SHOP", new[] {
            "omise_work","omise_data","selected_player_data","selected_item_data","soubi_data","item_data","noryoku_data","player_soubi","soubi_message","selected_item_mokuhyo"
        });
    }

    internal static void DumpEquip()
    {
        var t = AccessTools.TypeByName("h_item_c");
        if (t == null) return;
        var fingerprint = Fingerprint(t, new[] { "selected_player", "party_selected_player", "selected_item", "selected_item_id", "cur_soubi_kind", "soubi_no", "target_soubi_no" });
        if (fingerprint == _equipFingerprint) return;
        _equipFingerprint = fingerprint;
        Plugin.L.LogInfo("[HinataQoL-DIAG][EQUIP] " + fingerprint);
        DumpStatics(t, "EQUIP", new[] {
            "selected_player_data","selected_item_data","soubi_data","item_data","noryoku_data","player_soubi","soubi_table","soubi_no_table","soubi_basyo_table"
        });
    }

    private static string Fingerprint(Type t, IEnumerable<string> names)
    {
        var sb = new StringBuilder();
        foreach (var name in names)
        {
            if (sb.Length > 0) sb.Append(" | ");
            sb.Append(name).Append('=').Append(SafeStatic(t, name));
        }
        return sb.ToString();
    }

    private static object? SafeStatic(Type t, string name)
    {
        try
        {
            var p = t.GetProperty(name, BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
            if (p != null && p.GetIndexParameters().Length == 0) return p.GetValue(null);
            var f = t.GetField(name, BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
            if (f != null) return f.GetValue(null);
        }
        catch (Exception e) { return "<err:" + e.GetType().Name + ">"; }
        return "<missing>";
    }

    private static void DumpStatics(Type t, string tag, IEnumerable<string> names)
    {
        foreach (var name in names)
        {
            try
            {
                var value = SafeStatic(t, name);
                Plugin.L.LogInfo($"[HinataQoL-DIAG][{tag}] {name} => {Describe(value)}");
            }
            catch (Exception e)
            {
                Plugin.L.LogWarning($"[HinataQoL-DIAG][{tag}] {name} dump failed: {e.GetType().Name}: {e.Message}");
            }
        }
    }

    private static string Describe(object? value)
    {
        if (value == null) return "<null>";
        var type = value.GetType();
        if (type.IsPrimitive || value is string || value is decimal || value is Enum)
            return $"{type.Name}({value})";

        var sb = new StringBuilder();
        sb.Append(type.FullName).Append(" {");
        int count = 0;
        foreach (var p in type.GetProperties(BindingFlags.Instance | BindingFlags.Public))
        {
            if (count >= 24) break;
            if (p.GetIndexParameters().Length != 0 || !p.CanRead) continue;
            try
            {
                var v = p.GetValue(value);
                if (!IsSimple(v)) continue;
                if (count++ > 0) sb.Append(", ");
                sb.Append(p.Name).Append('=').Append(v ?? "null");
            }
            catch { }
        }
        foreach (var f in type.GetFields(BindingFlags.Instance | BindingFlags.Public))
        {
            if (count >= 24) break;
            try
            {
                var v = f.GetValue(value);
                if (!IsSimple(v)) continue;
                if (count++ > 0) sb.Append(", ");
                sb.Append(f.Name).Append('=').Append(v ?? "null");
            }
            catch { }
        }
        sb.Append('}');
        return sb.ToString();
    }

    private static bool IsSimple(object? v)
    {
        if (v == null) return true;
        var t = v.GetType();
        return t.IsPrimitive || t.IsEnum || v is string || v is decimal;
    }
}

[HarmonyPatch]
internal static class ShopMainPatch
{
    private static MethodBase TargetMethod()
    {
        var type = AccessTools.TypeByName("h_omise_c") ?? throw new TypeLoadException("h_omise_c not found");
        return AccessTools.Method(type, "omise_main") ?? throw new MissingMethodException("h_omise_c.omise_main");
    }

    [HarmonyPostfix]
    private static void Postfix() => RuntimeDump.DumpShop();
}

[HarmonyPatch]
internal static class EquipMainPatch
{
    private static MethodBase TargetMethod()
    {
        var type = AccessTools.TypeByName("h_item_c") ?? throw new TypeLoadException("h_item_c not found");
        return AccessTools.Method(type, "item_main") ?? throw new MissingMethodException("h_item_c.item_main");
    }

    [HarmonyPostfix]
    private static void Postfix() => RuntimeDump.DumpEquip();
}
