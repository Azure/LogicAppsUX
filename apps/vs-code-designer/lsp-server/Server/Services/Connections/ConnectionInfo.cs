using System.Text.Json.Serialization;

namespace SdkLspServer.Services.Connections;

/// <summary>
/// Represents connection information for a managed API connection.
/// </summary>
public class ConnectionInfo
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
}
