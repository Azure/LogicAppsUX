using System.Net.Http.Json;
using System.Text.Json;

using ZiggyCreatures.Caching.Fusion;

namespace SdkLspServer.Services.Api;

/// <summary>
/// Service for making dynamic API calls based on user input.
/// This can be used to fetch real-time data, SDK metadata, or other external resources
/// to enhance LSP features like completions, hover info, etc.
/// </summary>
public class ApiService
{
    public ApiServiceConfig Config;
    private readonly IHttpClientFactory httpClientFactory;
    private readonly JsonSerializerOptions jsonOptions;
    private readonly IFusionCache cache;

    public ApiService(IHttpClientFactory httpClientFactory, ApiServiceConfig config, IFusionCache fusionCache)
    {
        this.httpClientFactory = httpClientFactory;
        Config = config;
        cache = fusionCache;
        jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };
    }

    /// <summary>
    /// Makes a GET request to the specified URL and returns the response as a string.
    /// Cached for 5 minutes with fail-safe mode (serves stale data for up to 1 hour if API fails).
    /// </summary>
    /// <param name="url">The URL to request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The response content as a string, or null if the request fails.</returns>
    public async Task<string?> GetAsync(string url, CancellationToken cancellationToken = default)
    {
        string cacheKey = $"GET:{url}";

        return await cache.GetOrSetAsync<string?>(
            cacheKey,
            async (ctx, ct) =>
            {
                try
                {
                    HttpClient client = httpClientFactory.CreateClient("SdkLspClient");
                    HttpResponseMessage response = await client.GetAsync(url, ct);

                    return response.IsSuccessStatusCode ? await response.Content.ReadAsStringAsync(ct) : null;
                }
                catch (Exception ex)
                {
                    await Console.Error.WriteLineAsync($"[ApiService] GET {url} error: {ex.Message}");
                    return null;
                }
            },
            options => options
                .SetDuration(TimeSpan.FromMinutes(5))
                .SetFailSafe(true, TimeSpan.FromHours(1))
                .SetFactoryTimeouts(TimeSpan.FromSeconds(10), keepTimedOutFactoryResult: false),
            cancellationToken);
    }

    /// <summary>
    /// Makes a GET request and deserializes the JSON response to the specified type.
    /// Cached for 5 minutes with fail-safe mode (serves stale data for up to 1 hour if API fails).
    /// </summary>
    /// <typeparam name="T">The type to deserialize to.</typeparam>
    /// <param name="url">The URL to request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The deserialized object, or default if the request fails.</returns>
    public async Task<T?> GetJsonAsync<T>(string url, CancellationToken cancellationToken = default)
    {
        string cacheKey = $"GET_JSON:{typeof(T).FullName}:{url}";

        return await cache.GetOrSetAsync<T?>(
            cacheKey,
            async (ctx, ct) =>
            {
                try
                {
                    HttpClient client = httpClientFactory.CreateClient("SdkLspClient");

                    // Add Authorization header if bearer token is configured
                    if (!string.IsNullOrEmpty(Config.BearerToken))
                    {
                        // Remove "Bearer " prefix if it exists in the token
                        string token = Config.BearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                            ? Config.BearerToken[7..].Trim()
                            : Config.BearerToken;

                        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                    }

                    return await client.GetFromJsonAsync<T>(url, jsonOptions, ct);
                }
                catch (Exception ex)
                {
                    await Console.Error.WriteLineAsync($"[ApiService] GET JSON {url} error: {ex.Message}");
                    return default;
                }
            },
            options => options
                .SetDuration(TimeSpan.FromMinutes(5))
                .SetFailSafe(true, TimeSpan.FromHours(1))
                .SetFactoryTimeouts(TimeSpan.FromSeconds(10), keepTimedOutFactoryResult: false),
            cancellationToken);
    }

    /// <summary>
    /// Makes a POST request with JSON payload and returns the response as a string.
    /// Cached for 5 minutes with fail-safe mode (serves stale data for up to 1 hour if API fails).
    /// Cache key includes URL and payload hash for proper invalidation.
    /// </summary>
    /// <param name="url">The URL to request.</param>
    /// <param name="payload">The object to serialize and send as JSON.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The response content as a string, or null if the request fails.</returns>
    public async Task<string?> PostJsonAsync(string url, object payload, CancellationToken cancellationToken = default)
    {
        string payloadHash = JsonSerializer.Serialize(payload, jsonOptions).GetHashCode().ToString();
        string cacheKey = $"POST:{url}:{payloadHash}";

        return await cache.GetOrSetAsync<string?>(
            cacheKey,
            async (ctx, ct) =>
            {
                try
                {
                    HttpClient client = httpClientFactory.CreateClient("SdkLspClient");

                    // Add Authorization header if bearer token is configured
                    if (!string.IsNullOrEmpty(Config.BearerToken))
                    {
                        // Remove "Bearer " prefix if it exists in the token
                        string token = Config.BearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                            ? Config.BearerToken[7..].Trim()
                            : Config.BearerToken;

                        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                    }

                    HttpResponseMessage response = await client.PostAsJsonAsync(url, payload, jsonOptions, ct);

                    if (response.IsSuccessStatusCode)
                    {
                        return await response.Content.ReadAsStringAsync(ct);
                    }

                    string responseBody = await response.Content.ReadAsStringAsync(ct);
                    return null;
                }
                catch (Exception ex)
                {
                    await Console.Error.WriteLineAsync($"[ApiService] POST {url} error: {ex.Message}");
                    return null;
                }
            },
            options => options
                .SetDuration(TimeSpan.FromMinutes(5))
                .SetFailSafe(true, TimeSpan.FromHours(1))
                .SetFactoryTimeouts(TimeSpan.FromSeconds(10), keepTimedOutFactoryResult: false),
            cancellationToken);
    }

    /// <summary>
    /// Makes a POST request with JSON payload and deserializes the response to the specified type.
    /// Cached for 5 minutes with fail-safe mode (serves stale data for up to 1 hour if API fails).
    /// Cache key includes URL, payload hash, and response type for proper invalidation.
    /// </summary>
    /// <typeparam name="TResponse">The type to deserialize the response to.</typeparam>
    /// <param name="url">The URL to request.</param>
    /// <param name="payload">The object to serialize and send as JSON.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The deserialized response object, or default if the request fails.</returns>
    public async Task<TResponse?> PostJsonAsync<TResponse>(string url, object payload, CancellationToken cancellationToken = default)
    {
        string payloadHash = JsonSerializer.Serialize(payload, jsonOptions).GetHashCode().ToString();
        string cacheKey = $"POST_JSON:{typeof(TResponse).FullName}:{url}:{payloadHash}";

        return await cache.GetOrSetAsync<TResponse?>(
            cacheKey,
            async (ctx, ct) =>
            {
                try
                {
                    HttpClient client = httpClientFactory.CreateClient("SdkLspClient");

                    // Add Authorization header if bearer token is configured
                    if (!string.IsNullOrEmpty(Config.BearerToken))
                    {
                        // Remove "Bearer " prefix if it exists in the token
                        string token = Config.BearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                            ? Config.BearerToken[7..].Trim()
                            : Config.BearerToken;

                        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                    }

                    HttpResponseMessage response = await client.PostAsJsonAsync(url, payload, jsonOptions, ct);

                    if (response.IsSuccessStatusCode)
                    {
                        string successBody = await response.Content.ReadAsStringAsync(ct);

                        // Deserialize from the string
                        return JsonSerializer.Deserialize<TResponse>(successBody, jsonOptions);
                    }

                    string responseBody = await response.Content.ReadAsStringAsync(ct);
                    return default;
                }
                catch (Exception ex)
                {
                    await Console.Error.WriteLineAsync($"[ApiService] POST {url} error: {ex.Message}");
                    return default;
                }
            },
            options => options
                .SetDuration(TimeSpan.FromMinutes(5))
                .SetFailSafe(true, TimeSpan.FromHours(1))
                .SetFactoryTimeouts(TimeSpan.FromSeconds(10), keepTimedOutFactoryResult: false),
            cancellationToken);
    }
}
