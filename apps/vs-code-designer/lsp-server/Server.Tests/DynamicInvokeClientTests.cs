using System.Net;

using Microsoft.Extensions.DependencyInjection;

using LogicAppsLanguageServer.Services.DynamicInvoke;

using ZiggyCreatures.Caching.Fusion;

namespace LogicAppsLanguageServer.Tests;

public class DynamicInvokeClientTests
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
        DynamicInvokeClient service = serviceProvider.GetRequiredService<DynamicInvokeClient>();
        IFusionCache cache = serviceProvider.GetRequiredService<IFusionCache>();

        Assert.Equal("cached-value", await service.GetAsync(url));
        await cache.ExpireAsync($"GET:{url}");

        Assert.Equal("cached-value", await service.GetAsync(url));
    }

    private static ServiceProvider CreateServiceProvider(HttpMessageHandler handler)
    {
        var services = new ServiceCollection();
        services.AddFusionCache();
        services.AddHttpClient("DynamicInvokeClient")
            .ConfigurePrimaryHttpMessageHandler(() => handler);
        services.AddSingleton(new DynamicInvokeClientOptions());
        services.AddSingleton<DynamicInvokeClient>();
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
