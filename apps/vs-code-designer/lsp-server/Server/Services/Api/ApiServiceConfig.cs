using System.Text.Json.Serialization;

namespace SdkLspServer.Services.Api;

/// <summary>
/// Configuration class for API service settings, including Azure subscription details and authentication.
/// </summary>
/// <remarks>
/// This class is used to store and manage API service configuration such as base URL,
/// subscription ID, resource group, bearer token, and API version. It supports JSON serialization
/// and provides a method to update configuration values from another instance.
/// </remarks>
public class ApiServiceConfig
{
    [JsonPropertyName("baseUrl")]
    public string BaseUrl { get; set; } = string.Empty;

    [JsonPropertyName("subscriptionId")]
    public string SubscriptionId { get; set; } = string.Empty;

    [JsonPropertyName("resourceGroup")]
    public string ResourceGroup { get; set; } = string.Empty;

    [JsonPropertyName("bearerToken")]
    public string BearerToken { get; set; } = string.Empty;

    [JsonPropertyName("apiVersion")]
    public string ApiVersion { get; set; } = "2018-07-01-preview";

    public void UpdateFrom(ApiServiceConfig? updateConfig)
    {
        if (updateConfig == null)
        {
            return;
        }

        if (!string.IsNullOrEmpty(updateConfig.BaseUrl))
        {
            BaseUrl = updateConfig.BaseUrl;
        }

        if (!string.IsNullOrEmpty(updateConfig.SubscriptionId))
        {
            SubscriptionId = updateConfig.SubscriptionId;
        }

        if (!string.IsNullOrEmpty(updateConfig.ResourceGroup))
        {
            ResourceGroup = updateConfig.ResourceGroup;
        }

        if (!string.IsNullOrEmpty(updateConfig.BearerToken))
        {
            BearerToken = updateConfig.BearerToken;
        }
    }
}
