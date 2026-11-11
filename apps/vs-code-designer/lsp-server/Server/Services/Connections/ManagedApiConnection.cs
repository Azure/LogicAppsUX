using System.Text.Json;
using System.Text.Json.Serialization;

namespace SdkLspServer.Services.Connections;

/// <summary>
/// Represents a single managed API connection configuration.
/// </summary>
public class ManagedApiConnection
{
    [JsonPropertyName("api")]
    public ApiInfo Api { get; set; } = new();

    [JsonPropertyName("connection")]
    public ConnectionInfo Connection { get; set; } = new();

    [JsonPropertyName("connectionRuntimeUrl")]
    public string ConnectionRuntimeUrl { get; set; } = string.Empty;

    [JsonPropertyName("authentication")]
    public JsonElement? Authentication { get; set; }
}
