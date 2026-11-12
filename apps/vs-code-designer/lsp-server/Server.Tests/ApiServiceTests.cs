using System.Net;

using Microsoft.Extensions.DependencyInjection;

using SdkLspServer.Services.Api;

using ZiggyCreatures.Caching.Fusion;

namespace Server.Tests;

public class ApiServiceTests
{
    [Fact]
    public async Task GetAsync_ExpiredEntryAndHttpFailure_ReturnsStaleValue()
    {
        const string url = "https://example.test/data";
        var handler = new SequenceHttpMessageHandler(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("cached-value"),
            },
            new HttpResponseMessage(HttpStatusCode.InternalServerError));
        using ServiceProvider serviceProvider = CreateServiceProvider(handler);
        ApiService service = serviceProvider.GetRequiredService<ApiService>();
        IFusionCache cache = serviceProvider.GetRequiredService<IFusionCache>();

        Assert.Equal("cached-value", await service.GetAsync(url));
        await cache.ExpireAsync($"GET:{url}");

        Assert.Equal("cached-value", await service.GetAsync(url));
    }

    private static ServiceProvider CreateServiceProvider(HttpMessageHandler handler)
    {
        var services = new ServiceCollection();
        services.AddFusionCache();
        services.AddHttpClient("SdkLspClient")
            .ConfigurePrimaryHttpMessageHandler(() => handler);
        services.AddSingleton(new ApiServiceConfig());
        services.AddSingleton<ApiService>();
        return services.BuildServiceProvider();
    }

    private sealed class SequenceHttpMessageHandler(params HttpResponseMessage[] responses) : HttpMessageHandler
    {
        private readonly Queue<HttpResponseMessage> responses = new(responses);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(responses.Dequeue());
        }
    }
}
