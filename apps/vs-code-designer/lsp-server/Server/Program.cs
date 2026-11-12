using System.Diagnostics;

using Microsoft.Extensions.DependencyInjection;

using OmniSharp.Extensions.LanguageServer.Protocol.Window;
using OmniSharp.Extensions.LanguageServer.Server;
using OmniSharp.Extensions.LanguageServer.Protocol.Server;

using SdkLspServer.Handlers;
using SdkLspServer.Handlers.CompletionHandler;
using SdkLspServer.Handlers.HoverHandler;
using SdkLspServer.Services.Api;
using SdkLspServer.Services.Connections;
using SdkLspServer.Services.Telemetry;

using ZiggyCreatures.Caching.Fusion;

namespace SdkLspServer;

internal static class Program
{
    private static async Task Main(string[] args)
    {
        ITelemetryService? telemetryService = null;
        ILanguageServerFacade? initializedServer = null;
        SdkIndex? index = null;
        bool supportsCodeLensRefresh = false;

        try
        {
            // Support for debugger attachment at startup
            if (args.Contains("--wait-for-debugger"))
            {
                await Console.Error.WriteLineAsync($"[SdkLspServer] Waiting for debugger to attach... (PID: {Environment.ProcessId})");
                while (!Debugger.IsAttached)
                {
                    await Task.Delay(100);
                }

                await Console.Error.WriteLineAsync("[SdkLspServer] Debugger attached, continuing...");
            }

            // Determine the SDK path from command line, environment variable, or local SDK folder
            (string? sdkPath, string sdkSource) = ResolveSdkPath(args);

            // Index the provided NuGet package, if any. This happens on startup
            // so that handlers can supply information to clients.
            index = await SdkIndex.TryCreateAsync(sdkPath);
            if (index is null)
            {
                await Console.Error.WriteLineAsync($"[SdkLspServer] Could not load SDK from: {sdkPath ?? "(none)"}");
            }

            // Create config instance that will be populated from initializationOptions
            ApiServiceConfig apiConfig = new();

            // Create connections service for runtime updates
            ConnectionsService connectionsService = new();

            connectionsService.ConnectionsChanged += () =>
            {
                if (initializedServer != null)
                {
                    CodeLensRefreshService.TryRequest(initializedServer, supportsCodeLensRefresh);
                }
            };

            // Create buffer manager (will be registered as singleton)
            BufferManager bufferManager = new();

            LanguageServer server = await LanguageServer.From((options) =>
            {
                options
                    .WithInput(Console.OpenStandardInput())
                    .WithOutput(Console.OpenStandardOutput())
                    .WithServices(services =>
                    {
                        ConfigureServices(services);

                        // Make SdkIndex available for dependency injection
                        if (index != null)
                        {
                            services.AddSingleton(index);
                        }
                        else
                        {
                            services.AddSingleton(typeof(SdkIndex), provider => null!);
                        }

                        // Register ConnectionsService as singleton
                        services.AddSingleton(connectionsService);

                        // Register BufferManager as singleton (override the one from ConfigureServices)
                        services.AddSingleton(bufferManager);

                        // Make ApiServiceConfig available for dependency injection
                        services.AddSingleton(apiConfig);
                    })

                     // Register custom notification handler for API config updates
                     .OnNotification("custom/updateApiConfig", async (ApiServiceConfig? updateConfig) =>
                     {
                         try
                         {
                             apiConfig.UpdateFrom(updateConfig);
                         }
                         catch (Exception ex)
                         {
                             await Console.Error.WriteLineAsync($"[SdkLspServer] ❌ Failed to update apiConfig: {ex.Message}");
                         }
                     })

                     // Register custom notification handler for connections updates
                     .OnNotification("custom/updateConnections", async (ConnectionsConfig? updatedConnections) =>
                     {
                         try
                         {
                             connectionsService.UpdateConnections(updatedConnections);
                             int count = connectionsService.GetConnectionCount();
                             await Console.Error.WriteLineAsync($"[SdkLspServer] ✅ Connections updated via notification: {count} connection(s)");
                         }
                         catch (Exception ex)
                         {
                             await Console.Error.WriteLineAsync($"[SdkLspServer] ❌ Failed to update connections: {ex.Message}");
                         }
                     })

                     // Register custom request handler for workflow metadata using OnRequest pattern
                     .OnRequest("custom/getWorkflowMetadata", async (GetWorkflowMetadataParams request, CancellationToken ct) =>
                     {
                         await Console.Error.WriteLineAsync($"[SdkLspServer] ✅ Received custom/getWorkflowMetadata request via OnRequest");
                         await Console.Error.WriteLineAsync($"[SdkLspServer] Request params: Uri={request.Uri}, DocumentUri={request.DocumentUri}");

                         try
                         {
                             var handler = new GetWorkflowMetadataHandler(bufferManager, index);
                             var response = await handler.Handle(request, ct);

                             await Console.Error.WriteLineAsync($"[SdkLspServer] ✅ Response: WorkflowName={response.WorkflowName}, TriggerName={response.TriggerName}, Error={response.Error}");
                             return response;
                         }
                         catch (Exception ex)
                         {
                             await Console.Error.WriteLineAsync($"[SdkLspServer] ❌ Exception in getWorkflowMetadata: {ex.Message}");
                             await Console.Error.WriteLineAsync($"[SdkLspServer] StackTrace: {ex.StackTrace}");
                             return new GetWorkflowMetadataResponse
                             {
                                 Error = $"Internal error: {ex.Message}",
                             };
                         }
                     })

                    // Additional handlers for enhanced SDK support.
                    .OnInitialize(async (s, request, ct) =>
                    {
                        supportsCodeLensRefresh = CodeLensRefreshService.IsSupported(request.Capabilities);

                        // Get telemetry service from DI
                        var telemetryService = s.Services.GetService(typeof(ITelemetryService)) as ITelemetryService;

                        // 🎯 Parse initializationOptions
                        try
                        {
                            InitializationOptionsWrapper? initOptions = System.Text.Json.JsonSerializer.Deserialize<InitializationOptionsWrapper>(
                                request.InitializationOptions?.ToString() ?? "{}");

                            // Handle API Config
                            if (initOptions?.ApiConfig != null)
                            {
                                apiConfig.BaseUrl = initOptions.ApiConfig.BaseUrl;
                                apiConfig.SubscriptionId = initOptions.ApiConfig.SubscriptionId;
                                apiConfig.ResourceGroup = initOptions.ApiConfig.ResourceGroup;
                                apiConfig.BearerToken = initOptions.ApiConfig.BearerToken;
                            }

                            // Handle Connections Config
                            if (initOptions?.Connections != null)
                            {
                                connectionsService.UpdateConnections(initOptions.Connections);
                                int count = connectionsService.GetConnectionCount();
                                await Console.Error.WriteLineAsync($"[SdkLspServer] ✅ Connections loaded from initializationOptions: {count} connection(s)");
                                s.Window.LogInfo($"✅ Loaded {count} connection(s)");
                            }
                            else
                            {
                                await Console.Error.WriteLineAsync("[SdkLspServer] ⚠️  No connections provided in initializationOptions");
                            }

                            // Handle Telemetry Config
                            if (telemetryService != null && initOptions?.Telemetry != null)
                            {
                                telemetryService.Initialize(initOptions.Telemetry);

                                // Track initialization event
                                telemetryService.TrackEvent("LSP_Server_Initialized", new Dictionary<string, string>
                                {
                                { "SdkLoaded", (index != null).ToString() },
                                { "ConnectionsCount", connectionsService.GetConnectionCount().ToString() },
                                { "HasApiConfig", (initOptions.ApiConfig != null).ToString() },
                                });
                            }
                            else if (telemetryService != null)
                            {
                                await Console.Error.WriteLineAsync("[SdkLspServer] ⚠️  No telemetry config provided in initializationOptions");
                            }
                        }
                        catch (Exception ex)
                        {
                            telemetryService?.TrackException(ex, new Dictionary<string, string>
                            {
                            { "Phase", "Initialization" },
                            });
                        }

                        // Report whether the SDK index was loaded successfully.
                        if (index is null)
                        {
                            s.Window.ShowError($"SDK failed to load (source: {sdkSource}). Provide a .nupkg path via --sdk /path/file.nupkg");

                            telemetryService?.TrackEvent("SDK_Load_Failed", new Dictionary<string, string>
                            {
                            { "Source", sdkSource },
                            });
                        }
                        else
                        {
                            telemetryService?.TrackEvent("SDK_Load_Success", new Dictionary<string, string>
                            {
                            { "Source", sdkSource },
                            { "Summary", index.Summary ?? "unknown" },
                            });
                        }

                        s.Window.LogInfo($"Loaded SDK: {index?.Summary} (source: {sdkSource})");
                        initializedServer = s;
                    })
                    .WithHandler<TextDocumentSyncHandler>()
                    .WithHandler<HoverHandler>()
                    .WithHandler<CodeLensHandler>()
                    .WithHandler<CompletionHandler>()
                    .WithHandler<GetWorkflowMetadataHandler>();
            });

            // Register the custom request handler manually after server creation
            try
            {
                await Console.Error.WriteLineAsync("[SdkLspServer] Attempting to register GetWorkflowMetadataHandler...");
                server.Register(registry =>
                {
                    registry.AddHandler(new GetWorkflowMetadataHandler(bufferManager, index));
                    Console.Error.WriteLineAsync("[SdkLspServer] ✅ AddHandler called inside Register lambda").Wait();
                });
                await Console.Error.WriteLineAsync("[SdkLspServer] ✅ GetWorkflowMetadataHandler registered via server.Register()");
            }
            catch (Exception ex)
            {
                await Console.Error.WriteLineAsync($"[SdkLspServer] ❌ Failed to register handler: {ex.GetType().Name}: {ex.Message}");
                await Console.Error.WriteLineAsync($"[SdkLspServer] StackTrace: {ex.StackTrace}");
            }

            // Track server started event
            telemetryService = server.Services.GetService(typeof(ITelemetryService)) as ITelemetryService;
            telemetryService?.TrackEvent("LSP_Server_Started");

            await Console.Error.WriteLineAsync("[SdkLspServer] Server started successfully");

            // Wait for the server to exit. This call blocks until the client shuts
            // down the server.
            await server.WaitForExit;

            // Track server shutdown and flush telemetry
            telemetryService?.TrackEvent("LSP_Server_Shutdown");
            telemetryService?.Flush();
            await Task.Delay(1000); // Give telemetry time to flush

            await Console.Error.WriteLineAsync("[SdkLspServer] Server shutdown complete");
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[SdkLspServer] ❌ Fatal error: {ex.Message}");
            await Console.Error.WriteLineAsync($"[SdkLspServer] Stack trace: {ex.StackTrace}");

            telemetryService?.TrackException(ex, new Dictionary<string, string>
            {
                { "Phase", "Startup" },
                { "Fatal", "true" },
            });
            telemetryService?.Flush();

            throw;
        }
        finally
        {
            index?.Dispose();
        }
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        services.AddSingleton<BufferManager>();

        // Add HttpClient for making dynamic API calls
        services.AddHttpClient("SdkLspClient", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Add("User-Agent", "SdkLspServer/1.0");
        });

        // Register FusionCache with default options optimized for LSP scenarios
        services.AddFusionCache()
            .WithDefaultEntryOptions(options =>
            {
                // Default cache duration: 5 minutes
                options.Duration = TimeSpan.FromMinutes(5);

                // Enable fail-safe mode: serve stale data for up to 1 hour if API fails
                options.IsFailSafeEnabled = true;
                options.FailSafeMaxDuration = TimeSpan.FromHours(1);
                options.FailSafeThrottleDuration = TimeSpan.FromSeconds(30);

                // Factory timeouts: 10 seconds for API calls
                options.FactorySoftTimeout = TimeSpan.FromSeconds(10);
                options.FactoryHardTimeout = TimeSpan.FromSeconds(15);
                options.AllowTimedOutFactoryBackgroundCompletion = false;
            });

        // Register ApiService for handlers to use
        services.AddSingleton<ApiService>();

        // Register TelemetryService for telemetry tracking
        services.AddSingleton<ITelemetryService, TelemetryService>();

        // Register shared LSPStore for cross-handler communication (includes DynamicData slice)
        services.AddSingleton<Store.LSPStore>();
    }

    /// <summary>
    /// Parse command-line arguments or environment variables to determine
    /// the path to the SDK .nupkg file.
    /// </summary>
    private static (string? Path, string Source) ResolveSdkPath(string[] args)
    {
        // CLI: --sdk /path/to/sdk.nupkg or --sdk=/path/to/sdk.nupkg
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "--sdk" && i + 1 < args.Length)
            {
                return (args[i + 1], "arg");
            }

            if (args[i].StartsWith("--sdk="))
            {
                return (args[i]["--sdk=".Length..], "arg");
            }
        }

        // Fallback: search for a .nupkg inside an SDK folder up the tree
        string? candidate = TryFindNupkgInSdkFolder();
        return !string.IsNullOrWhiteSpace(candidate) ? ((string? Path, string Source))(candidate, "sdk-folder") : ((string? Path, string Source))(null, "none");
    }

    private static string? TryFindNupkgInSdkFolder()
    {
        try
        {
            // Start from current working directory and walk up to root
            var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (dir != null)
            {
                var sdkDir = new DirectoryInfo(Path.Combine(dir.FullName, "SDK"));
                if (sdkDir.Exists)
                {
                    FileInfo[] nupkgs =
                    [
                        .. sdkDir.GetFiles("*.nupkg", SearchOption.TopDirectoryOnly)
                                                .OrderByDescending(f => f.LastWriteTimeUtc),
                    ];
                    if (nupkgs.Length > 0)
                    {
                        return nupkgs[0].FullName;
                    }
                }

                dir = dir.Parent;
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

}
