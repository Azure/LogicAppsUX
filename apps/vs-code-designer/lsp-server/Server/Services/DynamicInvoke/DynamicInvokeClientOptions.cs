using System.Text.Json.Serialization;

namespace LogicAppsLanguageServer.Services.DynamicInvoke;

/// <summary>
/// Options for Azure dynamic invoke requests.
/// </summary>
/// <remarks>
/// This class stores dynamic invoke configuration such as base URL,
/// subscription ID, resource group, bearer token, and API version. It supports JSON serialization
/// and provides a method to update configuration values from another instance.
/// </remarks>
public class DynamicInvokeClientOptions
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

    public void UpdateFrom(DynamicInvokeClientOptions? updateConfig)
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
