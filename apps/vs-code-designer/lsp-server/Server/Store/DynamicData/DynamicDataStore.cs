using System.Collections.Concurrent;

namespace SdkLspServer.Store.DynamicData;

/// <summary>
/// Dynamic data slice of the LSP store.
/// Manages dynamic values across LSP handlers (HoverHandler, CompletionHandler).
/// This allows handlers to share fetched dynamic values without making duplicate API calls.
/// </summary>
public class DynamicDataStore
{
    /// <summary>
    /// Cache key format: "{connector}:{operation}:{connectionName}"
    /// Value: List of dynamic value items (with id, title, etc.)
    /// </summary>
    private readonly ConcurrentDictionary<string, DynamicValuesCacheEntry> cache = new();

    /// <summary>
    /// Stores dynamic values for a specific operation.
    /// </summary>
    /// <param name="connector">The connector identifier.</param>
    /// <param name="operation">The operation name.</param>
    /// <param name="connectionName">The connection name.</param>
    /// <param name="values">The list of dynamic value items to store.</param>
    public void Set(string connector, string operation, string connectionName, List<DynamicValueItem> values)
    {
        string key = BuildKey(connector, operation, connectionName);
        var entry = new DynamicValuesCacheEntry
        {
            Values = values,
            Timestamp = DateTime.UtcNow,
        };

        cache[key] = entry;
    }

    /// <summary>
    /// Retrieves dynamic values for a specific operation.
    /// </summary>
    /// <param name="connector">The connector identifier.</param>
    /// <param name="operation">The operation name.</param>
    /// <param name="connectionName">The connection name.</param>
    /// <returns>A list of dynamic value items if found and not expired; otherwise, null.</returns>
    public List<DynamicValueItem>? Get(string connector, string operation, string connectionName)
    {
        string key = BuildKey(connector, operation, connectionName);

        if (cache.TryGetValue(key, out DynamicValuesCacheEntry? entry))
        {
            // Check if entry is still fresh (e.g., less than 5 minutes old)
            TimeSpan age = DateTime.UtcNow - entry.Timestamp;
            if (age.TotalMinutes < 5)
            {
                return entry.Values;
            }
            else
            {
                cache.TryRemove(key, out _);
            }
        }

        return null;
    }

    /// <summary>
    /// Clears all cached dynamic values.
    /// </summary>
    public void Clear()
    {
        cache.Clear();
        Console.Error.WriteLine("[LSPStore.DynamicData] Cleared all cached values");
    }

    /// <summary>
    /// Clears cached values for a specific connector.
    /// </summary>
    /// <param name="connector">The connector identifier.</param>
    public void ClearConnector(string connector)
    {
        var keysToRemove = cache.Keys.Where(k => k.StartsWith($"{connector}:", StringComparison.OrdinalIgnoreCase)).ToList();
        foreach (string? key in keysToRemove)
        {
            cache.TryRemove(key, out _);
        }
    }

    private static string BuildKey(string connector, string operation, string connectionName)
    {
        return $"{connector.ToLowerInvariant()}:{operation.ToLowerInvariant()}:{connectionName}";
    }
}
