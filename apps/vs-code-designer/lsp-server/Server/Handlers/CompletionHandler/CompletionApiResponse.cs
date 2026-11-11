namespace SdkLspServer.Handlers.CompletionHandler;

/// <summary>
/// Response model for dynamic completion API calls.
/// </summary>
internal class CompletionApiResponse
{
    public List<CompletionSuggestion>? Suggestions { get; set; }
}
