namespace SdkLspServer.Handlers.HoverHandler;

/// <summary>
/// Registry for dynamic operations that discovers metadata from SDK assemblies via reflection.
/// Uses convention-based mapping to infer API paths from operation names.
/// </summary>
internal static class DynamicOperationsRegistry
{
    private static readonly object LockObject = new();
    private static SdkIndex? sdkIndex;
    private static Dictionary<string, DynamicOperationMetadata>? discoveredOperations;
    private static bool discoveryAttempted = false;

    /// <summary>
    /// Initialize the registry with the SDK index.
    /// This should be called once at startup.
    /// </summary>
    public static void Initialize(SdkIndex? index)
    {
        lock (LockObject)
        {
            sdkIndex = index;
            discoveryAttempted = false;
            discoveredOperations = null;

            // Also clear the discovery cache to force re-discovery
            SdkDynamicOperationsDiscovery.ClearCache();
        }
    }

    /// <summary>
    /// Get API details for a dynamic operation.
    /// Discovers from SDK using reflection and convention-based mapping.
    /// </summary>
    /// <param name="connectorName">The name of the connector.</param>
    /// <param name="operationName">The name of the operation.</param>
    /// <returns>The metadata for the operation if found; otherwise, null.</returns>
    public static DynamicOperationMetadata? GetOperationMetadata(string connectorName, string operationName)
    {
        string key = $"{connectorName.ToLowerInvariant()}:{operationName}";

        // Try SDK discovery (lazy initialization)
        if (!discoveryAttempted)
        {
            lock (LockObject)
            {
                if (!discoveryAttempted)
                {
                    discoveredOperations = SdkDynamicOperationsDiscovery.DiscoverOperations(sdkIndex);
                    discoveryAttempted = true;
                }
            }
        }

        // Check discovered operations
        return discoveredOperations?.TryGetValue(key, out DynamicOperationMetadata? discoveredMetadata) == true ? discoveredMetadata : null;
    }
}
