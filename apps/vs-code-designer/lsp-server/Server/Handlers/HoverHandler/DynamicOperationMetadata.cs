using System.Collections.Generic;

namespace SdkLspServer.Handlers;

/// <summary>
/// Metadata for a dynamic operation including API path, method, and query parameters.
/// </summary>
internal class DynamicOperationMetadata
{
    public string Path { get; set; } = string.Empty;

    public string Method { get; set; } = string.Empty;

    public Dictionary<string, string> QueryParameters { get; set; } = [];
}
