using System.Text.Json.Serialization;

namespace SdkLspServer.Services.Telemetry;

/// <summary>
/// Configuration for Application Insights telemetry.
/// Provided by the client in initializationOptions to enable telemetry tracking.
/// </summary>
public class TelemetryConfig
{
    /// <summary>
    /// Gets or sets the Application Insights connection string.
    /// Format: "InstrumentationKey={key};IngestionEndpoint={endpoint};...".
    /// </summary>
    [JsonPropertyName("connectionString")]
    public string? ConnectionString { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether telemetry is enabled. Defaults to true.
    /// Allows users to opt-out of telemetry collection.
    /// </summary>
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Gets or sets the sampling rate percentage (0-100). Defaults to 100 (no sampling).
    /// Use lower values to reduce telemetry volume for high-frequency events.
    /// </summary>
    [JsonPropertyName("samplingRate")]
    public double SamplingRate { get; set; } = 100.0;

    /// <summary>
    /// Gets or sets the session ID for correlating telemetry with client session.
    /// If not provided, a new GUID will be generated.
    /// </summary>
    [JsonPropertyName("sessionId")]
    public string? SessionId { get; set; }
}
