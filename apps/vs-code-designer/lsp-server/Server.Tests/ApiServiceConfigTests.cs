using System.Text.Json;

using SdkLspServer.Services.Api;

namespace Server.Tests;

public class ApiServiceConfigTests
{
    [Fact]
    public void Deserialize_ResourceGroupName_UsesStringContract()
    {
        ApiServiceConfig? config = JsonSerializer.Deserialize<ApiServiceConfig>(
            """{"subscriptionId":"subscription-id","resourceGroup":"resource-group"}""");

        Assert.NotNull(config);
        Assert.Equal("resource-group", config.ResourceGroup);
    }

    [Fact]
    public void UpdateFrom_BearerTokenOmitted_PreservesExistingToken()
    {
        var config = new ApiServiceConfig
        {
            BearerToken = "existing-token",
            SubscriptionId = "old-subscription",
        };

        config.UpdateFrom(new ApiServiceConfig
        {
            SubscriptionId = "new-subscription",
        });

        Assert.Equal("new-subscription", config.SubscriptionId);
        Assert.Equal("existing-token", config.BearerToken);
    }
}
