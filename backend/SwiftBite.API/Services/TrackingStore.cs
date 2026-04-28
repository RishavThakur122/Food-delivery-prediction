using System.Collections.Concurrent;
using SwiftBite.API.DTOs;

namespace SwiftBite.API.Services;

// Thread-safe in-memory store. Replace with Redis for multi-server setups.
public class TrackingStore
{
    private readonly ConcurrentDictionary<string, DeliverySnapshot> _data = new();

    public DeliverySnapshot? Get(string orderId) =>
        _data.TryGetValue(orderId, out var s) ? s : null;

    public IEnumerable<DeliverySnapshot> GetAll() => _data.Values;

    public void Upsert(DeliverySnapshot snapshot) =>
        _data[snapshot.OrderId] = snapshot;

    public void Remove(string orderId) =>
        _data.TryRemove(orderId, out _);
}
