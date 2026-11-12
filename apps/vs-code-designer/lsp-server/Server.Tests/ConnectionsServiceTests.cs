using System.Text.Json;

using SdkLspServer.Services.Connections;

namespace Server.Tests;

public class ConnectionsServiceTests
{
    [Fact]
    public void EnsureConnectionsLoadedForDocument_FileDeletedAndRecreated_FallsBackThenReloads()
    {
        string testRoot = Path.Combine(Path.GetTempPath(), $"connections-service-{Guid.NewGuid():N}");
        string workflowPath = Path.Combine(testRoot, "workflow.cs");
        string connectionsPath = Path.Combine(testRoot, "connections.json");
        Directory.CreateDirectory(testRoot);
        File.WriteAllText(workflowPath, string.Empty);
        var service = new ConnectionsService();
        service.UpdateConnections(CreateConfig("initialized"));

        try
        {
            File.WriteAllText(connectionsPath, JsonSerializer.Serialize(CreateConfig("disk-one")));
            service.EnsureConnectionsLoadedForDocument(workflowPath);
            Assert.True(service.GetConnections()?.ManagedApiConnections.ContainsKey("disk-one"));

            File.Delete(connectionsPath);
            service.EnsureConnectionsLoadedForDocument(workflowPath);
            Assert.True(service.GetConnections()?.ManagedApiConnections.ContainsKey("initialized"));

            File.WriteAllText(connectionsPath, JsonSerializer.Serialize(CreateConfig("disk-two")));
            service.EnsureConnectionsLoadedForDocument(workflowPath);
            Assert.True(service.GetConnections()?.ManagedApiConnections.ContainsKey("disk-two"));
        }
        finally
        {
            Directory.Delete(testRoot, recursive: true);
        }
    }

    [Fact]
    public void EnsureConnectionsLoadedForDocument_NoDiskFile_PreservesInitializationConfiguration()
    {
        string testRoot = Path.Combine(Path.GetTempPath(), $"connections-service-{Guid.NewGuid():N}");
        string workflowPath = Path.Combine(testRoot, "workflow.cs");
        Directory.CreateDirectory(testRoot);
        File.WriteAllText(workflowPath, string.Empty);
        var service = new ConnectionsService();
        service.UpdateConnections(CreateConfig("initialized"));

        try
        {
            service.EnsureConnectionsLoadedForDocument(workflowPath);

            Assert.True(service.GetConnections()?.ManagedApiConnections.ContainsKey("initialized"));
        }
        finally
        {
            Directory.Delete(testRoot, recursive: true);
        }
    }

    private static ConnectionsConfig CreateConfig(string connectionName)
    {
        return new ConnectionsConfig
        {
            ManagedApiConnections = new Dictionary<string, ManagedApiConnection>
            {
                [connectionName] = new ManagedApiConnection(),
            },
        };
    }
}
