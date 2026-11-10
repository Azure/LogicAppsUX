using System.Text.Json;
using System.Text.Json.Serialization;
using BizTalk.DataMapper.Core;

namespace BizTalk.DataMapper.Worker;

internal static class Program
{
    private const int ProtocolVersion = 1;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static async Task<int> Main(string[] args)
    {
        if (!args.Contains("--worker", StringComparer.OrdinalIgnoreCase))
        {
            Console.Error.WriteLine("Use --worker to start the stdio protocol host.");
            return 1;
        }

        var transformService = new TransformService();
        await using var compilerService = new CompilerService();
        string? line;
        while ((line = await Console.In.ReadLineAsync()) is not null)
        {
            WorkerRequest? request = null;
            try
            {
                request = JsonSerializer.Deserialize<WorkerRequest>(line, JsonOptions)
                    ?? throw new InvalidDataException("Request is empty.");
                object result = await HandleRequest(request, transformService, compilerService);
                await WriteResponse(new WorkerResponse(request.Id, result, null));
                if (string.Equals(request.Method, "shutdown", StringComparison.OrdinalIgnoreCase))
                {
                    return 0;
                }
            }
            catch (WorkerOperationException exception)
            {
                await WriteResponse(new WorkerResponse(
                    request?.Id ?? 0,
                    null,
                    new WorkerError(exception.Code, exception.Message, exception.Details)));
            }
            catch (Exception exception)
            {
                await WriteResponse(new WorkerResponse(
                    request?.Id ?? 0,
                    null,
                    new WorkerError(
                        "WORKER_REQUEST_FAILED",
                        exception.Message,
                        exception.InnerException?.Message)));
            }
        }

        return 0;
    }

    private static async Task<object> HandleRequest(
        WorkerRequest request,
        TransformService transformService,
        CompilerService compilerService)
    {
        switch (request.Method)
        {
            case "initialize":
                CompilerInitialization initialization =
                    request.Params.Deserialize<CompilerInitialization>(JsonOptions)
                    ?? throw new InvalidDataException("initialize parameters are required.");
                if (initialization.ProtocolVersion != ProtocolVersion)
                {
                    throw new WorkerOperationException(
                        "PROTOCOL_VERSION_MISMATCH",
                        $"Protocol {initialization.ProtocolVersion} is unsupported; expected {ProtocolVersion}.",
                        null);
                }
                compilerService.Initialize(initialization);
                return new
                {
                    protocolVersion = ProtocolVersion,
                    workerVersion = typeof(Program).Assembly.GetName().Version?.ToString() ?? "1.0.0"
                };
            case "ping":
                return new { protocolVersion = ProtocolVersion };
            case "compileMap":
                try
                {
                    return await compilerService.CompileMapAsync(
                        request.Params,
                        TimeSpan.FromSeconds(110));
                }
                catch (TimeoutException exception)
                {
                    throw new WorkerOperationException(
                        "COMPILER_TIMEOUT",
                        exception.Message,
                        null);
                }
                catch (Exception exception)
                {
                    throw new WorkerOperationException(
                        "COMPILER_FAILED",
                        exception.Message,
                        exception.InnerException?.Message);
                }
            case "testMap":
                return TestMap(request.Params, transformService);
            case "shutdown":
                return new { stopped = true };
            default:
                throw new InvalidOperationException($"Unknown worker method '{request.Method}'.");
        }
    }

    private static object TestMap(JsonElement parameters, TransformService service)
    {
        TransformRequest request = parameters.Deserialize<TransformRequest>(JsonOptions)
            ?? throw new InvalidDataException("testMap parameters are required.");
        TransformResult result = service.Transform(request);
        if (!result.Success)
        {
            throw new WorkerOperationException(
                "TRANSFORM_FAILED",
                result.Error ?? "Transformation failed.",
                result.Diagnostics);
        }
        return new
        {
            outputXml = result.OutputXml,
            diagnostics = string.IsNullOrWhiteSpace(result.Diagnostics)
                ? Array.Empty<string>()
                : new[] { result.Diagnostics }
        };
    }

    private static async Task WriteResponse(WorkerResponse response)
    {
        string json = JsonSerializer.Serialize(response, JsonOptions);
        await Console.Out.WriteLineAsync(json);
        await Console.Out.FlushAsync();
    }

    private sealed record WorkerRequest(long Id, string Method, JsonElement Params);
    private sealed record WorkerResponse(long Id, object? Result, WorkerError? Error);
    private sealed record WorkerError(string Code, string Message, string? Details);

    private sealed class WorkerOperationException : Exception
    {
        public WorkerOperationException(string code, string message, string? details)
            : base(message)
        {
            Code = code;
            Details = details;
        }

        public string Code { get; }
        public string? Details { get; }
    }
}
