using System.Text.Json;

namespace LogicAppsLanguageServer.Services.Connections;

/// <summary>
/// Service for managing connections configuration with support for runtime updates.
/// Provides thread-safe access to connections data that can be updated via LSP notifications.
/// </summary>
public class ConnectionsService
{
    private readonly object lockObject = new();
    private ConnectionsConfig? connections;
    private ConnectionsConfig? runtimeConnections;
    private bool connectionsAreDiskBacked;
    private string? loadedConnectionsPath;
    private DateTime loadedConnectionsLastWriteUtc;
    private FileSystemWatcher? connectionsWatcher;

    public event Action? ConnectionsChanged;

    /// <summary>
    /// Gets the current connections configuration.
    /// </summary>
    /// <returns>The current connections configuration, or null if not set.</returns>
    public ConnectionsConfig? GetConnections()
    {
        lock (lockObject)
        {
            return connections;
        }
    }

    /// <summary>
    /// Updates the connections configuration.
    /// </summary>
    /// <param name="config">The new connections configuration, or null to clear.</param>
    public void UpdateConnections(ConnectionsConfig? config)
    {
        lock (lockObject)
        {
            runtimeConnections = config;
            connectionsAreDiskBacked = false;
        }

        SetActiveConnections(config);
    }

    private void UpdateConnectionsFromDisk(ConnectionsConfig? config)
    {
        lock (lockObject)
        {
            connectionsAreDiskBacked = true;
        }

        SetActiveConnections(config);
    }

    private void SetActiveConnections(ConnectionsConfig? config)
    {
        bool changed;
        lock (lockObject)
        {
            changed = !ReferenceEquals(connections, config);
            connections = config;
        }

        if (changed)
        {
            ConnectionsChanged?.Invoke();
        }
    }

    /// <summary>
    /// Gets the count of managed API connections.
    /// </summary>
    /// <returns>The number of managed API connections, or 0 if no connections are configured.</returns>
    public int GetConnectionCount()
    {
        lock (lockObject)
        {
            return connections?.ManagedApiConnections?.Count ?? 0;
        }
    }

    /// <summary>
    /// Ensures connections are loaded from the nearest connections.json for the given document path.
    /// If the file changes on disk, it will be reloaded automatically.
    /// </summary>
    public void EnsureConnectionsLoadedForDocument(string? documentFilePath)
    {
        if (string.IsNullOrWhiteSpace(documentFilePath))
        {
            return;
        }

        string? connectionsPath = FindNearestConnectionsFile(documentFilePath);
        if (string.IsNullOrWhiteSpace(connectionsPath) || !File.Exists(connectionsPath))
        {
            ClearMissingDiskConnections();
            return;
        }

        DateTime lastWrite = File.GetLastWriteTimeUtc(connectionsPath);
        bool shouldReload;

        lock (lockObject)
        {
            shouldReload = !string.Equals(loadedConnectionsPath, connectionsPath, StringComparison.OrdinalIgnoreCase)
                || lastWrite > loadedConnectionsLastWriteUtc;
        }

        if (!shouldReload)
        {
            return;
        }

        try
        {
            string json = File.ReadAllText(connectionsPath);
            ConnectionsConfig? config = JsonSerializer.Deserialize<ConnectionsConfig>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });

            lock (lockObject)
            {
                loadedConnectionsPath = connectionsPath;
                loadedConnectionsLastWriteUtc = lastWrite;
            }

            EnsureWatcher(connectionsPath);
            UpdateConnectionsFromDisk(config);
        }
        catch
        {
            // Best-effort load; ignore malformed or transient file IO issues.
        }
    }

    private static string? FindNearestConnectionsFile(string documentFilePath)
    {
        string? currentDirectory = File.Exists(documentFilePath)
            ? Path.GetDirectoryName(documentFilePath)
            : Directory.Exists(documentFilePath) ? documentFilePath : null;

        while (!string.IsNullOrEmpty(currentDirectory))
        {
            string candidate = Path.Combine(currentDirectory, "connections.json");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            DirectoryInfo? parent = Directory.GetParent(currentDirectory);
            currentDirectory = parent?.FullName;
        }

        return null;
    }

    private void EnsureWatcher(string connectionsPath)
    {
        lock (lockObject)
        {
            if (connectionsWatcher != null &&
                string.Equals(connectionsWatcher.Path, Path.GetDirectoryName(connectionsPath), StringComparison.OrdinalIgnoreCase) &&
                string.Equals(connectionsWatcher.Filter, Path.GetFileName(connectionsPath), StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            connectionsWatcher?.Dispose();

            connectionsWatcher = new FileSystemWatcher
            {
                Path = Path.GetDirectoryName(connectionsPath) ?? ".",
                Filter = Path.GetFileName(connectionsPath),
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size | NotifyFilters.CreationTime | NotifyFilters.FileName,
                EnableRaisingEvents = true,
            };

            connectionsWatcher.Changed += (_, _) => ReloadWatchedConnections();
            connectionsWatcher.Created += (_, _) => ReloadWatchedConnections();
            connectionsWatcher.Deleted += (_, _) => ReloadWatchedConnections();
            connectionsWatcher.Renamed += (_, _) => ReloadWatchedConnections();
        }
    }

    private void ReloadWatchedConnections()
    {
        string? path;
        lock (lockObject)
        {
            path = loadedConnectionsPath;
        }

        if (string.IsNullOrWhiteSpace(path))
        {
            return;
        }

        if (!File.Exists(path))
        {
            ClearMissingDiskConnections();
            return;
        }

        EnsureConnectionsLoadedForDocument(path);
    }

    private void ClearMissingDiskConnections()
    {
        ConnectionsConfig? fallbackConnections;
        lock (lockObject)
        {
            if (!connectionsAreDiskBacked ||
                string.IsNullOrWhiteSpace(loadedConnectionsPath) ||
                File.Exists(loadedConnectionsPath))
            {
                return;
            }

            connectionsAreDiskBacked = false;
            loadedConnectionsLastWriteUtc = default;
            fallbackConnections = runtimeConnections;
        }

        SetActiveConnections(fallbackConnections);
    }
}
