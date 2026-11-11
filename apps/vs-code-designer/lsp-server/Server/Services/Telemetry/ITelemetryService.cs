using Microsoft.ApplicationInsights.DataContracts;

namespace SdkLspServer.Services.Telemetry;

/// <summary>
/// Service for tracking telemetry events, metrics, and exceptions.
/// Provides a non-blocking interface to Application Insights.
/// </summary>
public interface ITelemetryService
{
    /// <summary>
    /// Initializes the telemetry service with the provided configuration.
    /// Must be called before tracking any telemetry.
    /// </summary>
    /// <param name="config">Telemetry configuration from initializationOptions.</param>
    void Initialize(TelemetryConfig? config);

    /// <summary>
    /// Tracks a custom event with optional properties and metrics.
    /// Non-blocking operation.
    /// </summary>
    /// <param name="eventName">Name of the event (e.g., "Hover_Request").</param>
    /// <param name="properties">Custom properties to attach to the event.</param>
    /// <param name="metrics">Custom metrics to attach to the event.</param>
    void TrackEvent(string eventName, IDictionary<string, string>? properties = null, IDictionary<string, double>? metrics = null);

    /// <summary>
    /// Tracks a custom metric value.
    /// Non-blocking operation.
    /// </summary>
    /// <param name="metricName">Name of the metric (e.g., "Hover_ResponseTime_Ms").</param>
    /// <param name="value">Numeric value of the metric.</param>
    /// <param name="properties">Custom properties to attach to the metric.</param>
    void TrackMetric(string metricName, double value, IDictionary<string, string>? properties = null);

    /// <summary>
    /// Tracks an exception with optional properties.
    /// Non-blocking operation.
    /// </summary>
    /// <param name="exception">The exception to track.</param>
    /// <param name="properties">Custom properties to attach to the exception.</param>
    void TrackException(Exception exception, IDictionary<string, string>? properties = null);

    /// <summary>
    /// Tracks a trace message with severity level.
    /// Non-blocking operation.
    /// </summary>
    /// <param name="message">Trace message.</param>
    /// <param name="severity">Severity level of the trace.</param>
    /// <param name="properties">Custom properties to attach to the trace.</param>
    void TrackTrace(string message, SeverityLevel severity = SeverityLevel.Information, IDictionary<string, string>? properties = null);

    /// <summary>
    /// Tracks a dependency call (e.g., API call, database query).
    /// Non-blocking operation.
    /// </summary>
    /// <param name="dependencyType">Type of dependency (e.g., "HTTP", "SQL").</param>
    /// <param name="target">Target of the dependency (e.g., hostname, database name).</param>
    /// <param name="name">Name of the operation (e.g., "GET /api/forms").</param>
    /// <param name="startTime">Start time of the operation.</param>
    /// <param name="duration">Duration of the operation.</param>
    /// <param name="success">Whether the operation succeeded.</param>
    void TrackDependency(string dependencyType, string target, string name, DateTimeOffset startTime, TimeSpan duration, bool success);

    /// <summary>
    /// Flushes the telemetry buffer, ensuring all pending telemetry is sent.
    /// Should be called on server shutdown.
    /// </summary>
    void Flush();
}
