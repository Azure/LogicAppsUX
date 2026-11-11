namespace SdkLspServer.Handlers.CompletionHandler;

/// <summary>
/// Individual completion suggestion from an external API.
/// </summary>
internal class CompletionSuggestion
{
    public string Label { get; set; } = string.Empty;

    public string? Kind { get; set; }

    public string? Detail { get; set; }

    public string? Documentation { get; set; }

    public string? InsertText { get; set; }
}
