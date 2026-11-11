using System.Reflection;

using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.ApplicationInsights.Extensibility;

namespace SdkLspServer.Services.Telemetry;

/// <summary>
/// Implementation of telemetry service using Application Insights SDK.
/// Provides non-blocking telemetry tracking with graceful error handling.
/// </summary>
public class TelemetryService : ITelemetryService, IDisposable
{
    private TelemetryClient? client;
    private TelemetryConfiguration? configuration;
    private bool isEnabled;
    private bool isDebugMode;
    private string? sessionId;
    private bool disposed;

    /// <summary>
    /// Initializes the telemetry service with the provided configuration.
    /// </summary>
    /// <param name="config">The telemetry configuration containing connection string and settings. Can be null to disable telemetry.</param>
    public void Initialize(TelemetryConfig? config)
    {
        if (config?.Enabled != true || string.IsNullOrEmpty(config.ConnectionString))
        {
            isEnabled = false;
            Console.Error.WriteLine("[Telemetry] Telemetry is disabled or not configured");
            return;
        }

        try
        {
            sessionId = config.SessionId ?? Guid.NewGuid().ToString();

            // Check if in debug mode (connection string = "debug")
            if (config.ConnectionString.Equals("debug", StringComparison.OrdinalIgnoreCase))
            {
                isDebugMode = true;
                isEnabled = true;
                Console.Error.WriteLine($"[Telemetry] ⚡ DEBUG MODE - Telemetry will be logged locally (SessionId: {sessionId})");
                return;
            }

            // Production mode - use Application Insights
            configuration = new TelemetryConfiguration
            {
                ConnectionString = config.ConnectionString,
            };

            client = new TelemetryClient(configuration);

            // Set common context properties
            client.Context.Session.Id = sessionId;
            client.Context.Component.Version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown";
            client.Context.Cloud.RoleName = "LSP-Server";

            isEnabled = true;
            Console.Error.WriteLine($"[Telemetry] Initialized successfully in PRODUCTION mode (SessionId: {sessionId})");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Telemetry] Failed to initialize: {ex.Message}");
            isEnabled = false;
        }
    }

    /// <summary>
    /// Tracks a custom event with optional properties and metrics.
    /// </summary>
    /// <param name="eventName">The name of the event to track.</param>
    /// <param name="properties">Optional dictionary of string properties to associate with the event.</param>
    /// <param name="metrics">Optional dictionary of numeric metrics to associate with the event.</param>
    public void TrackEvent(string eventName, IDictionary<string, string>? properties = null, IDictionary<string, double>? metrics = null)
    {
        if (!isEnabled)
        {
            return;
        }

        try
        {
            if (isDebugMode)
            {
                // Log locally in debug mode
                string propsStr = properties != null ? string.Join(", ", properties.Select(kvp => $"{kvp.Key}={kvp.Value}")) : "none";
                string metricsStr = metrics != null ? string.Join(", ", metrics.Select(kvp => $"{kvp.Key}={kvp.Value}")) : "none";
                Console.Error.WriteLine($"[Telemetry:Event] {eventName} | Properties: {propsStr} | Metrics: {metricsStr}");
            }
            else
            {
                // Send to Application Insights in production mode
                client?.TrackEvent(eventName, properties, metrics);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Telemetry] Failed to track event '{eventName}': {ex.Message}");
        }
    }

    /// <summary>
    /// Tracks a custom metric value.
    /// </summary>
    /// <param name="metricName">The name of the metric to track.</param>
    /// <param name="value">The numeric value of the metric.</param>
    /// <param name="properties">Optional dictionary of string properties to associate with the metric.</param>
    public void TrackMetric(string metricName, double value, IDictionary<string, string>? properties = null)
    {
        if (!isEnabled)
        {
            return;
        }

        try
        {
            if (isDebugMode)
            {
                // Log locally in debug mode
                string propsStr = properties != null ? string.Join(", ", properties.Select(kvp => $"{kvp.Key}={kvp.Value}")) : "none";
                Console.Error.WriteLine($"[Telemetry:Metric] {metricName}={value} | Properties: {propsStr}");
            }
            else if (client != null)
            {
                // Send to Application Insights in production mode
                var metric = new MetricTelemetry(metricName, value);
                if (properties != null)
                {
                    foreach (KeyValuePair<string, string> kvp in properties)
                    {
                        metric.Properties[kvp.Key] = kvp.Value;
                    }
                }

                client.TrackMetric(metric);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Telemetry] Failed to track metric '{metricName}': {ex.Message}");
        }
    }

    /// <summary>
    /// Tracks an exception with optional properties.
    /// </summary>
    /// <param name="exception">The exception to track.</param>
    /// <param name="properties">Optional dictionary of string properties to associate with the exception.</param>
    public void TrackException(Exception exception, IDictionary<string, string>? properties = null)
    {
        if (!isEnabled)
        {
            return;
        }

        try
        {
            if (isDebugMode)
            {
                // Log locally in debug mode
                string propsStr = properties != null ? string.Join(", ", properties.Select(kvp => $"{kvp.Key}={kvp.Value}")) : "none";
                Console.Error.WriteLine($"[Telemetry:Exception] {exception.GetType().Name}: {exception.Message} | Properties: {propsStr}");
                Console.Error.WriteLine($"[Telemetry:Exception] StackTrace: {exception.StackTrace}");
            }
            else
            {
                // Send to Application Insights in production mode
                client?.TrackException(exception, properties);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Telemetry] Failed to track exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Tracks a trace message with severity level.
    /// </summary>
    /// <param name="message">The trace message to track.</param>
    /// <param name="severity">The severity level of the trace message. Defaults to Information.</param>
    /// <param name="properties">Optional dictionary of string properties to associate with the trace.</param>
    public void TrackTrace(string message, SeverityLevel severity = SeverityLevel.Information, IDictionary<string, string>? properties = null)
    {
        if (!isEnabled)
        {
            return;
        }

        try
        {
            if (isDebugMode)
            {
                // Log locally in debug mode
                string propsStr = properties != null ? string.Join(", ", properties.Select(kvp => $"{kvp.Key}={kvp.Value}")) : "none";
                Console.Error.WriteLine($"[Telemetry:Trace:{severity}] {message} | Properties: {propsStr}");
            }
            else
            {
                // Send to Application Insights in production mode
                client?.TrackTrace(message, severity, properties);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Telemetry] Failed to track trace: {ex.Message}");
        }
    }

    /// <summary>
    /// Tracks a dependency call (e.g., API call, database query).
    /// </summary>
    /// <param name="dependencyType">The type of dependency (e.g., "HTTP", "SQL", "Azure").</param>
    /// <param name="target">The target of the dependency (e.g., server name, URL).</param>
    /// <param name="name">The name of the dependency operation.</param>
    /// <param name="startTime">The time when the dependency call started.</param>
    /// <param name="duration">The duration of the dependency call.</param>
    /// <param name="success">Whether the dependency call was successful.</param>
    public void TrackDependency(string dependencyType, string target, string name, DateTimeOffset startTime, TimeSpan duration, bool success)
    {
        if (!isEnabled)
        {
            return;
        }

        try
        {
            if (isDebugMode)
            {
                // Log locally in debug mode
                Console.Error.WriteLine($"[Telemetry:Dependency] {dependencyType} | Target: {target} | Name: {name} | Duration: {duration.TotalMilliseconds}ms | Success: {success}");
            }
            else
            {
                // Send to Application Insights in production mode
                client?.TrackDependency(dependencyType, target, name, startTime, duration, success);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Telemetry] Failed to track dependency: {ex.Message}");
        }
    }

    /// <summary>
    /// Flushes the telemetry buffer, ensuring all pending telemetry is sent.
    /// </summary>
    public void Flush()
    {
        if (!isEnabled)
        {
            return;
        }

        try
        {
            if (isDebugMode)
            {
                Console.Error.WriteLine("[Telemetry] Flush called (Debug mode - no remote flush needed)");
            }
            else
            {
                client?.Flush();
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Telemetry] Failed to flush: {ex.Message}");
        }
    }

    /// <summary>
    /// Disposes the telemetry service, flushing any remaining telemetry.
    /// </summary>
    public void Dispose()
    {
        if (disposed)
        {
            return;
        }

        Flush();
        configuration?.Dispose();
        disposed = true;

        GC.SuppressFinalize(this);
    }
}
