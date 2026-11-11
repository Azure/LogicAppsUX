using System.Text.Json.Serialization;

using SdkLspServer.Services.Connections;
using SdkLspServer.Services.Telemetry;

namespace SdkLspServer.Services.Api;

/// <summary>
/// Wrapper class for initialization options that contains configuration settings for API services, connections, and telemetry.
/// This class is used to deserialize JSON configuration data during application startup.
/// </summary>
public class InitializationOptionsWrapper
{
    [JsonPropertyName("apiConfig")]
    public ApiServiceConfig? ApiConfig { get; set; }

    [JsonPropertyName("connections")]
    public ConnectionsConfig? Connections { get; set; }

    [JsonPropertyName("telemetry")]
    public TelemetryConfig? Telemetry { get; set; }
}
