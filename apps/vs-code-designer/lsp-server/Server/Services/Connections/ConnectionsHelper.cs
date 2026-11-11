using System.Text.Json;
using System.Text.RegularExpressions;

namespace SdkLspServer.Services.Connections;

/// <summary>
/// Helper class for extracting information from connection configurations.
/// </summary>
public static partial class ConnectionsHelper
{
    /// <summary>
    /// Gets the authentication representation from a managed connection.
    /// Returns either the string value (for string auth) or the object type value (for object auth).
    /// </summary>
    /// <param name="connection">The managed API connection.</param>
    /// <returns>The auth string/type when available; otherwise null.</returns>
    public static string? GetAuthenticationTypeOrValue(ManagedApiConnection? connection)
    {
        if (connection?.Authentication is not JsonElement auth)
        {
            return null;
        }

        if (auth.ValueKind == JsonValueKind.String)
        {
            return auth.GetString();
        }

        if (auth.ValueKind == JsonValueKind.Object &&
            auth.TryGetProperty("type", out JsonElement typeElement) &&
            typeElement.ValueKind == JsonValueKind.String)
        {
            return typeElement.GetString();
        }

        return null;
    }

    /// <summary>
    /// Returns true when authentication is configured as Managed Identity.
    /// Accepts both object-style and string-style forms.
    /// </summary>
    /// <param name="connection">The managed API connection.</param>
    /// <returns>True if the auth type is Managed Identity; otherwise false.</returns>
    public static bool IsManagedIdentityAuthentication(ManagedApiConnection? connection)
    {
        string? authType = GetAuthenticationTypeOrValue(connection);
        return string.Equals(authType, "ManagedServiceIdentity", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(authType, "ManagedIdentity", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Extracts the connector type from an API ID.
    /// Example: "/subscriptions/.../managedApis/office365" -> "office365".
    /// </summary>
    /// <param name="apiId">The API ID string to extract the connector type from.</param>
    /// <returns>The extracted connector type, or "unknown" if extraction fails.</returns>
    public static string ExtractConnectorType(string apiId)
    {
        if (string.IsNullOrEmpty(apiId))
        {
            return "unknown";
        }

        Match match = MyRegex().Match(apiId);
        return match.Success ? match.Groups[1].Value : "unknown";
    }

    /// <summary>
    /// Gets all unique connector types from the connections configuration.
    /// </summary>
    /// <param name="config">The connections configuration to extract connector types from.</param>
    /// <returns>An enumerable of unique connector types found in the configuration.</returns>
    public static IEnumerable<string> GetConnectorTypes(ConnectionsConfig? config)
    {
        return config?.ManagedApiConnections == null
            ? Enumerable.Empty<string>()
            : config.ManagedApiConnections.Values
            .Select(conn => ExtractConnectorType(conn.Api.Id))
            .Distinct()
            .Where(type => !string.Equals(type, "unknown", StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Gets all connection names for a specific connector type.
    /// </summary>
    /// <param name="config">The connections configuration to search in.</param>
    /// <param name="connectorType">The type of connector to filter by.</param>
    /// <returns>An enumerable of connection names for the specified connector type.</returns>
    public static IEnumerable<string> GetConnectionNamesForConnector(ConnectionsConfig? config, string connectorType)
    {
        return config?.ManagedApiConnections == null
            ? Enumerable.Empty<string>()
            : config.ManagedApiConnections
            .Where(kvp => string.Equals(ExtractConnectorType(kvp.Value.Api.Id), connectorType, StringComparison.OrdinalIgnoreCase))
            .Select(kvp => kvp.Key);
    }

    [GeneratedRegex(@"/managedApis/([^/]+)")]
    private static partial Regex MyRegex();
}
