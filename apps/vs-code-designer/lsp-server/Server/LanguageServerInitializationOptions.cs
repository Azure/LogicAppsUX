using System.Text.Json.Serialization;

using LogicAppsLanguageServer.Services.Connections;
using LogicAppsLanguageServer.Services.DynamicInvoke;
using LogicAppsLanguageServer.Services.Telemetry;

namespace LogicAppsLanguageServer;

/// <summary>
/// Initialization options supplied by the VS Code language client.
/// </summary>
public class LanguageServerInitializationOptions
{
    [JsonPropertyName("apiConfig")]
    public DynamicInvokeClientOptions? DynamicInvokeOptions { get; set; }

    [JsonPropertyName("connections")]
    public ConnectionsConfig? Connections { get; set; }

    [JsonPropertyName("telemetry")]
    public TelemetryConfig? Telemetry { get; set; }
}
