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
/// Request parameters for custom/getWorkflowMetadata.
/// </summary>
public class GetWorkflowMetadataParams : IRequest<GetWorkflowMetadataResponse>
{
    /// <summary>
    /// Gets or sets uRI of the document containing the workflow code.
    /// </summary>
    public DocumentUri? DocumentUri { get; set; }

    /// <summary>
    /// Gets or sets alternative: URI as a string (for compatibility with client code).
    /// </summary>
    public string? Uri { get; set; }

    /// <summary>
    /// Gets or sets the workflow name to analyze when the document defines multiple workflows.
    /// </summary>
    public string? WorkflowName { get; set; }

    /// <summary>
    /// Gets or sets line number where the trigger or action is located (0-based).
    /// Optional - if not provided, will analyze the entire file.
    /// </summary>
    public int? Line { get; set; }

    /// <summary>
    /// Gets or sets character position on the line (0-based).
    /// Optional - if not provided, will analyze the entire file.
    /// </summary>
    public int? Character { get; set; }
}
