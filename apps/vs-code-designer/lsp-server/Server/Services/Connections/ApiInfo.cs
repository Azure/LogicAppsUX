using System.Text.Json.Serialization;

namespace LogicAppsLanguageServer.Services.Connections;

/// <summary>
/// Represents API information for a managed API connection.
/// </summary>
public class ApiInfo
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
}
