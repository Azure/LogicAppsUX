using OmniSharp.Extensions.LanguageServer.Protocol.Client.Capabilities;

using SdkLspServer.Handlers;

namespace Server.Tests;

public class CodeLensRefreshServiceTests
{
    [Fact]
    public void IsSupported_ClientAdvertisesRefresh_ReturnsTrue()
    {
        var capabilities = new ClientCapabilities
        {
            Workspace = new WorkspaceClientCapabilities
            {
                CodeLens = new CodeLensWorkspaceClientCapabilities
                {
                    RefreshSupport = true,
                },
            },
        };

        Assert.True(CodeLensRefreshService.IsSupported(capabilities));
    }

    [Fact]
    public void IsSupported_ClientDoesNotAdvertiseRefresh_ReturnsFalse()
    {
        Assert.False(CodeLensRefreshService.IsSupported(new ClientCapabilities()));
    }
}
