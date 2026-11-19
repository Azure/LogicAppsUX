using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace LogicAppsLanguageServer.Handlers;

/// <summary>
/// Contains data types and helper classes used by the HoverHandler.
/// </summary>
internal static class HoverHandlerTypes
{
    /// <summary>
    /// Represents the context of a parameter in a method call.
    /// </summary>
    internal class ParameterContext
    {
        public IMethodSymbol? Method { get; set; } = null;

        public IParameterSymbol? Parameter { get; set; } = null;

        public int ArgumentIndex { get; set; }

        public ArgumentSyntax ArgumentSyntax { get; set; } = null!;

        public string? ParameterName { get; set; } = null;

        public bool IsConnectionParameter { get; set; } = false;

        public string? ConnectionName { get; set; } = null;
    }

    /// <summary>
    /// Helper class to represent possible parameter values.
    /// </summary>
    internal class ParameterValue
    {
        public string Value { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response from Azure dynamicInvoke API.
    /// </summary>
    /// <typeparam name="T">The type of the response body.</typeparam>
    internal class DynamicInvokeResponse<T>
    {
        [System.Text.Json.Serialization.JsonPropertyName("response")]
        public DynamicInvokeResponseDetails<T>? Response { get; set; }
    }

    /// <summary>
    /// Response details from Azure dynamicInvoke API.
    /// </summary>
    /// <typeparam name="T">The type of the response body.</typeparam>
    internal class DynamicInvokeResponseDetails<T>
    {
        [System.Text.Json.Serialization.JsonPropertyName("statusCode")]
        public string? StatusCode { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("body")]
        public T? Body { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("headers")]
        public Dictionary<string, string>? Headers { get; set; }
    }

    /// <summary>
    /// Response type for Microsoft Forms ListForms operation.
    /// </summary>
    internal class ListFormsResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("value")]
        public List<FormItem>? Value { get; set; }
    }

    /// <summary>
    /// Form item in ListForms response.
    /// </summary>
    internal class FormItem
    {
        [System.Text.Json.Serialization.JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("title")]
        public string? Title { get; set; }
    }

    /// <summary>
    /// Response type for Teams GetAllTeams operation.
    /// NOTE: Currently using Pokemon API as placeholder.
    /// </summary>
    internal class TeamsListResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("results")] // Pokemon API placeholder
        public List<TeamItem>? Value { get; set; }
    }

    /// <summary>
    /// Team item in GetAllTeams response.
    /// NOTE: Currently using Pokemon API as placeholder.
    /// </summary>
    internal class TeamItem
    {
        [System.Text.Json.Serialization.JsonPropertyName("name")] // Pokemon API placeholder - name serves as both ID and display name
        public string Id { get; set; } = string.Empty;

        // DisplayName will be populated from Id in the fetch method
        [System.Text.Json.Serialization.JsonIgnore]
        public string? DisplayName { get; set; }
    }

    /// <summary>
    /// Response type for Teams GetChannelsForGroup operation.
    /// NOTE: Currently using Pokemon API as placeholder.
    /// </summary>
    internal class ChannelsListResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("results")] // Pokemon API placeholder
        public List<ChannelItem>? Value { get; set; }
    }

    /// <summary>
    /// Channel item in GetChannelsForGroup response.
    /// NOTE: Currently using Pokemon API as placeholder.
    /// </summary>
    internal class ChannelItem
    {
        [System.Text.Json.Serialization.JsonPropertyName("name")] // Pokemon API placeholder - name serves as both ID and display name
        public string Id { get; set; } = string.Empty;

        // DisplayName will be populated from Id in the fetch method
        [System.Text.Json.Serialization.JsonIgnore]
        public string? DisplayName { get; set; }
    }

    /// <summary>
    /// Payload for dynamicInvoke API calls containing operation details.
    /// </summary>
    internal class DynamicInvokePayload
    {
        [System.Text.Json.Serialization.JsonPropertyName("request")]
        public DynamicInvokeRequest Request { get; set; } = new();
    }

    /// <summary>
    /// Request details for dynamicInvoke API calls.
    /// </summary>
    internal class DynamicInvokeRequest
    {
        [System.Text.Json.Serialization.JsonPropertyName("method")]
        public string Method { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("path")]
        public string Path { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("queries")]
        public Dictionary<string, string>? Queries { get; set; }
    }
}
