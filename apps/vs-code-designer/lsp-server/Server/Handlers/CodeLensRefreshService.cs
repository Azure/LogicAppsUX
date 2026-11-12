using OmniSharp.Extensions.LanguageServer.Protocol.Client.Capabilities;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;
using OmniSharp.Extensions.LanguageServer.Protocol.Server;
using OmniSharp.Extensions.LanguageServer.Protocol.Window;
using OmniSharp.Extensions.LanguageServer.Protocol.Workspace;

namespace SdkLspServer.Handlers;

internal static class CodeLensRefreshService
{
    public static bool IsSupported(ClientCapabilities? clientCapabilities)
    {
        return clientCapabilities.Workspace?.CodeLens.IsSupported == true &&
            clientCapabilities.Workspace.CodeLens.Value?.RefreshSupport == true;
    }

    public static void TryRequest(ILanguageServerFacade router, bool isSupported)
    {
        if (!isSupported)
        {
            return;
        }

        try
        {
            router.Workspace.SendCodeLensRefresh(new CodeLensRefreshParams());
        }
        catch (Exception ex)
        {
            router.Window.LogError($"[CodeLensRefreshService] Failed to request CodeLens refresh: {ex.Message}");
        }
    }
}
