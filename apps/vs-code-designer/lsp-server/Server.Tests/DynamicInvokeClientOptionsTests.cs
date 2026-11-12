using System.Text.Json;

using LogicAppsLanguageServer.Services.DynamicInvoke;

namespace LogicAppsLanguageServer.Tests;

public class DynamicInvokeClientOptionsTests
{
    [Fact]
    public void Deserialize_ResourceGroupName_UsesStringContract()
    {
        DynamicInvokeClientOptions? config = JsonSerializer.Deserialize<DynamicInvokeClientOptions>(
            """{"subscriptionId":"subscription-id","resourceGroup":"resource-group"}""");

        Assert.NotNull(config);
        Assert.Equal("resource-group", config.ResourceGroup);
    }

    [Fact]
    public void UpdateFrom_BearerTokenOmitted_PreservesExistingToken()
    {
        var config = new DynamicInvokeClientOptions
        {
            BearerToken = "existing-token",
            SubscriptionId = "old-subscription",
        };

        config.UpdateFrom(new DynamicInvokeClientOptions
        {
            SubscriptionId = "new-subscription",
        });

        Assert.Equal("new-subscription", config.SubscriptionId);
        Assert.Equal("existing-token", config.BearerToken);
    }
}
