using MediatR;

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

using OmniSharp.Extensions.JsonRpc;
using OmniSharp.Extensions.LanguageServer.Protocol;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;
using OmniSharp.Extensions.LanguageServer.Protocol.Server;

namespace SdkLspServer.Handlers;

/// <summary>
/// Response containing workflow metadata.
/// </summary>
public class GetWorkflowMetadataResponse
{
    /// <summary>
    /// Gets or sets workflow name (extracted from class name or Build method parameter).
    /// </summary>
    public string? WorkflowName { get; set; }

    /// <summary>
    /// Gets or sets trigger name (from WithName() or generated default).
    /// </summary>
    public string? TriggerName { get; set; }

    /// <summary>
    /// Gets or sets default name for the trigger or action if none is provided.
    /// </summary>
    public string? DefaultName { get; set; }

    /// <summary>
    /// Gets or sets type of the workflow element (e.g., "Trigger", "Action").
    /// </summary>
    public string? ElementType { get; set; }

    /// <summary>
    /// Gets or sets connector name (e.g., "Msnweather", "Microsoftforms").
    /// </summary>
    public string? ConnectorName { get; set; }

    /// <summary>
    /// Gets or sets method name (e.g., "OnCurrentWeatherChange", "GetFormResponseById").
    /// </summary>
    public string? MethodName { get; set; }

    /// <summary>
    /// Gets or sets connection ID if available.
    /// </summary>
    public string? ConnectionId { get; set; }

    /// <summary>
    /// Gets or sets error message if the request failed.
    /// </summary>
    public string? Error { get; set; }
}
