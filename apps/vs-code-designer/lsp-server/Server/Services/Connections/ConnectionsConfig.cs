using System.Text.Json.Serialization;

namespace SdkLspServer.Services.Connections;

/// <summary>
/// Represents the structure of a connections.json file used in Azure Logic Apps workflows.
/// Contains configuration for managed API connections including authentication and runtime URLs.
/// </summary>
public class ConnectionsConfig
{
    [JsonPropertyName("managedApiConnections")]
    public Dictionary<string, ManagedApiConnection> ManagedApiConnections { get; set; } = [];
}
