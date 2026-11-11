using System.Collections.Concurrent;

namespace SdkLspServer.Store.DynamicData;

/// <summary>
/// Represents a cached entry in the dynamic values store.
/// </summary>
public class DynamicValuesCacheEntry
{
    public List<DynamicValueItem> Values { get; set; } = [];

    public DateTime Timestamp { get; set; }
}
