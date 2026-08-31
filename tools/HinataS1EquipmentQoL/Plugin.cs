using BepInEx;
using BepInEx.Configuration;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace HinataS1EquipmentQoL;

[BepInPlugin("hinata.s1.equipment.qol", "Hinata S1 Equipment QoL", "0.1.0")]
public sealed class Plugin : BasePlugin
{
    internal static Plugin Instance = null!;
    internal static ConfigEntry<bool> ShowEquippedMarker = null!;
    internal static ConfigEntry<bool> AutoEquipPurchasedArmor = null!;
    internal static ConfigEntry<bool> EquipmentDiagnostics = null!;

    public override void Load()
    {
        Instance = this;
        ShowEquippedMarker = Config.Bind(
            "Shop",
            "ShowEquippedMarker",
            true,
            "Append E to equipment names currently equipped by the character selected in the shop.");
        AutoEquipPurchasedArmor = Config.Bind(
            "Shop",
            "AutoEquipPurchasedArmor",
            true,
            "After buying armor/equipment for a character, try to equip the newly purchased item immediately. The operation is rolled back unless the item inventory remains intact and the new item becomes equipped.");
        EquipmentDiagnostics = Config.Bind(
            "Equipment",
            "Diagnostics",
            true,
            "Write compact equipment-menu state changes to the BepInEx log. This is used to implement the virtual shared equipment list safely.");

        var harmony = new Harmony("hinata.s1.equipment.qol");
        harmony.PatchAll(typeof(ShopFramePatch));
        harmony.PatchAll(typeof(MessageIdPatch));
        harmony.PatchAll(typeof(StringDrawPatch));
        harmony.PatchAll(typeof(PurchasePatch));
        harmony.PatchAll(typeof(EquipmentStatePatch));
        harmony.PatchAll(typeof(MakeSortEquipmentPatch));

        Log.LogInfo("Hinata S1 Equipment QoL 0.1.0 loaded (shop E marker + safe auto-equip + shared-list diagnostics).");
    }
}

internal static class Runtime
{
    internal static int ShopDepth;
    [ThreadStatic] internal static int PendingMessageId;
    [ThreadStatic] internal static bool PendingMessageMarked;
    internal static readonly Dictionary<int, string> MessageText = new();
    internal static string LastDiagnostic = string.Empty;
    internal static string LastSortDiagnostic = string.Empty;

    private static Type? _shopType;
    private static Type? _commandType;

    internal static Type? ShopType => _shopType ??= AccessTools.TypeByName("h_omise_c");
    internal static Type? CommandType => _commandType ??= AccessTools.TypeByName("G_cmd_c");

    internal static void Info(string text) => Plugin.Instance.Log.LogInfo("[EquipQoL] " + text);
    internal static void Warn(string text) => Plugin.Instance.Log.LogWarning("[EquipQoL] " + text);

    internal static object? GetStatic(Type? type, string property)
    {
        if (type == null) return null;
        try { return AccessTools.Property(type, property)?.GetValue(null); }
        catch { return null; }
    }

    internal static object? Get(object? obj, string property)
    {
        if (obj == null) return null;
        try { return AccessTools.Property(obj.GetType(), property)?.GetValue(obj); }
        catch { return null; }
    }

    internal static int Int(object? obj, string property, int fallback = -1)
    {
        var value = Get(obj, property);
        if (value == null) return fallback;
        try { return Convert.ToInt32(value); }
        catch { return fallback; }
    }

    internal static int StaticInt(Type? type, string property, int fallback = -1)
    {
        var value = GetStatic(type, property);
        if (value == null) return fallback;
        try { return Convert.ToInt32(value); }
        catch { return fallback; }
    }

    internal static int ArrayLength(object? array)
    {
        if (array == null) return 0;
        try
        {
            var p = AccessTools.Property(array.GetType(), "Length");
            if (p != null) return Convert.ToInt32(p.GetValue(array));
            var m = AccessTools.Method(array.GetType(), "get_Length");
            if (m != null) return Convert.ToInt32(m.Invoke(array, null));
        }
        catch { }
        return 0;
    }

    internal static object? At(object? array, int index)
    {
        if (array == null || index < 0) return null;
        try
        {
            var p = array.GetType().GetProperties(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance)
                .FirstOrDefault(x => x.GetIndexParameters().Length == 1 && x.GetIndexParameters()[0].ParameterType == typeof(int));
            if (p != null) return p.GetValue(array, new object[] { index });
            var m = array.GetType().GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance)
                .FirstOrDefault(x => x.Name == "get_Item" && x.GetParameters().Length == 1);
            if (m != null) return m.Invoke(array, new object[] { index });
        }
        catch { }
        return null;
    }

    internal static bool Set(object? obj, string property, object value)
    {
        if (obj == null) return false;
        try
        {
            var p = AccessTools.Property(obj.GetType(), property);
            if (p == null || !p.CanWrite) return false;
            var converted = Convert.ChangeType(value, p.PropertyType);
            p.SetValue(obj, converted);
            return true;
        }
        catch
        {
            try
            {
                var p = AccessTools.Property(obj.GetType(), property);
                if (p == null || !p.CanWrite) return false;
                p.SetValue(obj, value);
                return true;
            }
            catch { return false; }
        }
    }

    internal static object? GetShopWork() => GetStatic(ShopType, "omise_work");

    internal static object? GetSelectedShopPlayer()
    {
        var work = GetShopWork();
        if (work == null) return null;
        var players = Get(work, "player_data");
        var index = Int(work, "selected_player", -1);
        if (index < 0 || index >= ArrayLength(players)) return null;
        return At(players, index);
    }

    internal static IEnumerable<object> EnumeratePlayerItems(object? player)
    {
        var playerBase = Get(player, "player_base");
        var items = Get(playerBase, "item");
        var length = ArrayLength(items);
        for (var i = 0; i < length; i++)
        {
            var item = At(items, i);
            if (item != null) yield return item;
        }
    }

    internal static HashSet<int> EquippedMessageIds()
    {
        var result = new HashSet<int>();
        if (!Plugin.ShowEquippedMarker.Value) return result;
        var player = GetSelectedShopPlayer();
        if (player == null) return result;
        var getName = ShopType == null ? null : AccessTools.Method(ShopType, "get_player_item_name");
        if (getName == null) return result;

        foreach (var item in EnumeratePlayerItems(player))
        {
            var itemId = Int(item, "item_id", 0);
            var equipped = Int(item, "soubi", 0);
            if (itemId == 0 || equipped == 0) continue;
            try
            {
                var message = Convert.ToInt32(getName.Invoke(null, new[] { item }));
                if (message > 0) result.Add(message);
            }
            catch { }
        }
        return result;
    }

    internal static bool IsEquippedMessageId(int messageId)
        => messageId > 0 && EquippedMessageIds().Contains(messageId);

    internal static HashSet<string> EquippedKnownTexts()
    {
        var ids = EquippedMessageIds();
        return new HashSet<string>(ids.Where(MessageText.ContainsKey).Select(x => MessageText[x]), StringComparer.Ordinal);
    }

    internal static bool IsArmorShop()
    {
        var work = GetShopWork();
        if (work == null) return false;
        var type = Int(work, "type", int.MinValue);
        var armorType = StaticInt(ShopType, "BOUGU_TYPE", int.MaxValue);
        return type == armorType;
    }

    internal sealed class Slot
    {
        internal int ItemId;
        internal int Equipped;
        internal int Data;
    }

    internal sealed class PlayerInventory
    {
        internal object Player = null!;
        internal List<Slot> Slots = new();
    }

    internal static List<PlayerInventory> CapturePartyInventory()
    {
        var list = new List<PlayerInventory>();
        var work = GetShopWork();
        var players = Get(work, "player_data");
        var count = ArrayLength(players);
        for (var p = 0; p < count; p++)
        {
            var player = At(players, p);
            if (player == null) continue;
            var snap = new PlayerInventory { Player = player };
            foreach (var item in EnumeratePlayerItems(player))
            {
                snap.Slots.Add(new Slot
                {
                    ItemId = Int(item, "item_id", 0),
                    Equipped = Int(item, "soubi", 0),
                    Data = Int(item, "data", 0)
                });
            }
            list.Add(snap);
        }
        return list;
    }

    private static Dictionary<int, int> Counts(PlayerInventory inventory)
    {
        var d = new Dictionary<int, int>();
        foreach (var s in inventory.Slots)
        {
            if (s.ItemId == 0) continue;
            d[s.ItemId] = d.TryGetValue(s.ItemId, out var n) ? n + 1 : 1;
        }
        return d;
    }

    internal static void DetectPurchaseAndAutoEquip(List<PlayerInventory>? before)
    {
        if (before == null || !Plugin.AutoEquipPurchasedArmor.Value || !IsArmorShop()) return;
        var after = CapturePartyInventory();
        foreach (var oldPlayer in before)
        {
            var now = after.FirstOrDefault(x => ReferenceEquals(x.Player, oldPlayer.Player));
            if (now == null) continue;
            var oldCounts = Counts(oldPlayer);
            var newCounts = Counts(now);
            var added = new List<int>();
            foreach (var kv in newCounts)
            {
                oldCounts.TryGetValue(kv.Key, out var oldCount);
                for (var n = oldCount; n < kv.Value; n++) added.Add(kv.Key);
            }
            if (added.Count != 1) continue;

            var newId = added[0];
            var candidate = FindNewSlot(oldPlayer, now, newId);
            if (candidate < 0) continue;
            TrySafeEquip(oldPlayer.Player, candidate, newId);
            return;
        }
    }

    private static int FindNewSlot(PlayerInventory before, PlayerInventory after, int itemId)
    {
        var max = Math.Min(before.Slots.Count, after.Slots.Count);
        for (var i = 0; i < max; i++)
        {
            if (after.Slots[i].ItemId == itemId && before.Slots[i].ItemId != itemId && after.Slots[i].Equipped == 0)
                return i;
        }
        for (var i = 0; i < after.Slots.Count; i++)
            if (after.Slots[i].ItemId == itemId && after.Slots[i].Equipped == 0)
                return i;
        return -1;
    }

    private static void RestorePlayer(object player, PlayerInventory snapshot)
    {
        var playerBase = Get(player, "player_base");
        var items = Get(playerBase, "item");
        var length = Math.Min(ArrayLength(items), snapshot.Slots.Count);
        for (var i = 0; i < length; i++)
        {
            var item = At(items, i);
            if (item == null) continue;
            Set(item, "item_id", snapshot.Slots[i].ItemId);
            Set(item, "soubi", snapshot.Slots[i].Equipped);
            Set(item, "data", snapshot.Slots[i].Data);
        }
    }

    private static bool SameItemMultiset(PlayerInventory a, PlayerInventory b)
    {
        var ca = Counts(a); var cb = Counts(b);
        return ca.Count == cb.Count && ca.All(kv => cb.TryGetValue(kv.Key, out var n) && n == kv.Value);
    }

    private static void TrySafeEquip(object player, int slotIndex, int itemId)
    {
        var beforeEquip = CaptureSingle(player);
        if (beforeEquip == null) return;
        try
        {
            var method = CommandType == null ? null : AccessTools.Method(CommandType, "player_soubi_change");
            if (method == null)
            {
                Warn("Auto-equip skipped: G_cmd_c.player_soubi_change was not found.");
                return;
            }
            var result = method.Invoke(null, new object[] { player, slotIndex });
            var afterEquip = CaptureSingle(player);
            if (afterEquip == null || !SameItemMultiset(beforeEquip, afterEquip))
            {
                RestorePlayer(player, beforeEquip);
                Warn($"Auto-equip rolled back for item {itemId}: inventory membership changed unexpectedly.");
                return;
            }
            var becameEquipped = afterEquip.Slots.Any(x => x.ItemId == itemId && x.Equipped != 0);
            if (!becameEquipped)
            {
                RestorePlayer(player, beforeEquip);
                Warn($"Auto-equip rolled back for item {itemId}: the selected item did not become equipped.");
                return;
            }
            Info($"Purchased equipment {itemId} auto-equipped safely (slot {slotIndex}, result={result ?? "null"}).");
        }
        catch (Exception ex)
        {
            RestorePlayer(player, beforeEquip);
            Warn("Auto-equip failed and was rolled back: " + ex.GetType().Name + ": " + ex.Message);
        }
    }

    private static PlayerInventory? CaptureSingle(object player)
    {
        var snap = new PlayerInventory { Player = player };
        foreach (var item in EnumeratePlayerItems(player))
        {
            snap.Slots.Add(new Slot
            {
                ItemId = Int(item, "item_id", 0),
                Equipped = Int(item, "soubi", 0),
                Data = Int(item, "data", 0)
            });
        }
        return snap;
    }

    internal static string IntArray(object? array, int max = 16)
    {
        var length = ArrayLength(array);
        var vals = new List<string>();
        for (var i = 0; i < Math.Min(length, max); i++)
        {
            var v = At(array, i);
            vals.Add(v == null ? "?" : Convert.ToString(v) ?? "?");
        }
        return $"[{string.Join(",", vals)}] len={length}";
    }

    internal static void LogEquipmentState(string origin)
    {
        if (!Plugin.EquipmentDiagnostics.Value) return;
        var work = GetStatic(CommandType, "command_work");
        if (work == null) return;
        var text = $"{origin} step={Int(work, "step")} selP={Int(work, "selected_player")} partyP={Int(work, "party_selected_player")} selI={Int(work, "selected_item")} selId={Int(work, "selected_item_id")} curKind={Int(work, "cur_soubi_kind")} targetId={Int(work, "target_item_id")} targetSoubi={Int(work, "target_soubi_no")} targetNo={Int(work, "target_item_no")} srcNo={Int(work, "src_item_no")} equip={IntArray(Get(work, "equipment"), 12)} soubi={IntArray(Get(work, "soubi_data"), 20)}";
        if (text == LastDiagnostic) return;
        LastDiagnostic = text;
        Info("EQUIPSTATE " + text);
    }
}

[HarmonyPatch]
internal static class ShopFramePatch
{
    private static MethodBase? TargetMethod()
    {
        var t = Runtime.ShopType;
        return t == null ? null : AccessTools.Method(t, "omise_main");
    }

    private static void Prefix() => Runtime.ShopDepth++;
    private static void Postfix() => Runtime.ShopDepth = Math.Max(0, Runtime.ShopDepth - 1);
}

[HarmonyPatch]
internal static class MessageIdPatch
{
    internal sealed class State { internal int Id; internal bool Marked; }

    private static IEnumerable<MethodBase> TargetMethods()
    {
        var t = AccessTools.TypeByName("Q_window_c");
        if (t == null) yield break;
        foreach (var m in t.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static))
        {
            if (!m.Name.StartsWith("QAddChrWindow", StringComparison.Ordinal)) continue;
            if (!m.GetParameters().Any(p => p.ParameterType == typeof(ushort))) continue;
            yield return m;
        }
    }

    private static void Prefix(object[] __args, out State __state)
    {
        __state = new State { Id = Runtime.PendingMessageId, Marked = Runtime.PendingMessageMarked };
        if (Runtime.ShopDepth <= 0) return;
        foreach (var arg in __args)
        {
            if (arg is ushort u)
            {
                Runtime.PendingMessageId = u;
                Runtime.PendingMessageMarked = false;
                return;
            }
        }
    }

    private static void Postfix(State __state)
    {
        Runtime.PendingMessageId = __state.Id;
        Runtime.PendingMessageMarked = __state.Marked;
    }
}

[HarmonyPatch]
internal static class StringDrawPatch
{
    private static IEnumerable<MethodBase> TargetMethods()
    {
        var t = AccessTools.TypeByName("Q_window_c");
        if (t == null) yield break;
        foreach (var m in t.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static))
        {
            if (!m.Name.StartsWith("QAddStrWindow", StringComparison.Ordinal)) continue;
            if (!m.GetParameters().Any(p => p.ParameterType == typeof(string))) continue;
            yield return m;
        }
    }

    private static void Prefix(object[] __args)
    {
        if (Runtime.ShopDepth <= 0 || !Plugin.ShowEquippedMarker.Value) return;
        for (var i = 0; i < __args.Length; i++)
        {
            if (__args[i] is not string text || string.IsNullOrEmpty(text)) continue;

            if (Runtime.PendingMessageId > 0)
                Runtime.MessageText[Runtime.PendingMessageId] = text;

            var equipped = false;
            if (!Runtime.PendingMessageMarked && Runtime.PendingMessageId > 0)
                equipped = Runtime.IsEquippedMessageId(Runtime.PendingMessageId);
            if (!equipped && Runtime.PendingMessageId <= 0)
                equipped = Runtime.EquippedKnownTexts().Contains(text);

            if (equipped && !text.EndsWith("  E", StringComparison.Ordinal))
            {
                __args[i] = text + "  E";
                Runtime.PendingMessageMarked = true;
            }
            return;
        }
    }
}

[HarmonyPatch]
internal static class PurchasePatch
{
    [ThreadStatic] private static int _depth;
    [ThreadStatic] private static List<Runtime.PlayerInventory>? _before;

    private static IEnumerable<MethodBase> TargetMethods()
    {
        var t = Runtime.ShopType;
        if (t == null) yield break;
        foreach (var name in new[] { "omise_kau", "omise_kau01", "omise_kau02", "omise_kau04", "omise_kau99" })
        {
            var m = AccessTools.Method(t, name);
            if (m != null) yield return m;
        }
    }

    private static void Prefix()
    {
        if (_depth++ == 0 && Plugin.AutoEquipPurchasedArmor.Value && Runtime.IsArmorShop())
            _before = Runtime.CapturePartyInventory();
    }

    private static void Postfix()
    {
        _depth = Math.Max(0, _depth - 1);
        if (_depth != 0) return;
        var before = _before;
        _before = null;
        Runtime.DetectPurchaseAndAutoEquip(before);
    }
}

[HarmonyPatch]
internal static class EquipmentStatePatch
{
    private static IEnumerable<MethodBase> TargetMethods()
    {
        var t = Runtime.CommandType;
        if (t == null) yield break;
        foreach (var name in new[] { "command_soubi00", "command_soubi01", "command_soubi02", "command_soubi03", "command_soubi99", "update_party_soubi_data", "update_party_selected_player" })
        {
            var m = AccessTools.Method(t, name);
            if (m != null) yield return m;
        }
    }

    private static void Postfix(MethodBase __originalMethod)
        => Runtime.LogEquipmentState(__originalMethod.Name);
}

[HarmonyPatch]
internal static class MakeSortEquipmentPatch
{
    private static MethodBase? TargetMethod()
    {
        var t = Runtime.CommandType;
        return t == null ? null : AccessTools.Method(t, "make_sort_soubi_data");
    }

    private static void Prefix(object[] __args)
    {
        if (!Plugin.EquipmentDiagnostics.Value) return;
        var text = "make_sort_soubi_data(" + string.Join(",", __args.Select(x => x == null ? "null" : Convert.ToString(x))) + ")";
        if (text == Runtime.LastSortDiagnostic) return;
        Runtime.LastSortDiagnostic = text;
        Runtime.Info("EQUIPSORT " + text);
    }
}
