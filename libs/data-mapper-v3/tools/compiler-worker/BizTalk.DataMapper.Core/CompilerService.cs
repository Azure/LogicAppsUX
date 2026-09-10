using System.Diagnostics;
using System.Text.Json;

namespace BizTalk.DataMapper.Core;

public sealed record CompilerInitialization(
    int ProtocolVersion,
    string NodeExecutable,
    string CompilerHostPath);

public sealed class CompilerService : IAsyncDisposable
{
    private readonly SemaphoreSlim gate = new(1, 1);
    private Process? process;
    private CompilerInitialization? initialization;
    private long requestId;

    public void Initialize(CompilerInitialization options)
    {
        if (!File.Exists(options.NodeExecutable))
        {
            throw new FileNotFoundException("The compiler Node executable was not found.", options.NodeExecutable);
        }
        if (!File.Exists(options.CompilerHostPath))
        {
            throw new FileNotFoundException("The compiler host bundle was not found.", options.CompilerHostPath);
        }
        initialization = options;
    }

    public async Task<JsonElement> CompileMapAsync(
        JsonElement parameters,
        TimeSpan timeout,
        CancellationToken cancellationToken = default)
    {
        await gate.WaitAsync(cancellationToken);
        try
        {
            EnsureStarted();
            Process activeProcess = process!;
            long id = ++requestId;
            string request = JsonSerializer.Serialize(new
            {
                id,
                map = parameters.GetProperty("map"),
                sourceSchema = GetOptionalProperty(parameters, "sourceSchema"),
                targetSchema = GetOptionalProperty(parameters, "targetSchema")
            });

            await activeProcess.StandardInput.WriteLineAsync(request);
            await activeProcess.StandardInput.FlushAsync();

            using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutSource.CancelAfter(timeout);
            string? responseLine;
            try
            {
                responseLine = await activeProcess.StandardOutput.ReadLineAsync()
                    .WaitAsync(timeoutSource.Token);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                StopProcess();
                throw new TimeoutException($"Compiler request timed out after {timeout.TotalSeconds:0} seconds.");
            }

            if (responseLine is null)
            {
                int? exitCode = activeProcess.HasExited ? activeProcess.ExitCode : null;
                StopProcess();
                throw new InvalidOperationException(
                    $"Compiler host exited without a response (exit code {exitCode?.ToString() ?? "unknown"}).");
            }

            using JsonDocument response = JsonDocument.Parse(responseLine);
            JsonElement root = response.RootElement;
            if (!root.TryGetProperty("id", out JsonElement responseId) ||
                responseId.GetInt64() != id)
            {
                StopProcess();
                throw new InvalidDataException("Compiler host returned a mismatched response ID.");
            }
            if (root.TryGetProperty("error", out JsonElement error))
            {
                throw new InvalidOperationException(error.GetString() ?? "Compiler host failed.");
            }
            if (!root.TryGetProperty("result", out JsonElement result))
            {
                throw new InvalidDataException("Compiler host response did not contain a result.");
            }
            return result.Clone();
        }
        catch
        {
            if (process?.HasExited == true)
            {
                StopProcess();
            }
            throw;
        }
        finally
        {
            gate.Release();
        }
    }

    public ValueTask DisposeAsync()
    {
        StopProcess();
        gate.Dispose();
        return ValueTask.CompletedTask;
    }

    private void EnsureStarted()
    {
        if (process is { HasExited: false })
        {
            return;
        }
        CompilerInitialization options = initialization
            ?? throw new InvalidOperationException("Compiler service has not been initialized.");
        var startInfo = new ProcessStartInfo
        {
            FileName = options.NodeExecutable,
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(options.CompilerHostPath)
                ?? Environment.CurrentDirectory
        };
        string? inspectPort = Environment.GetEnvironmentVariable(
            "BIZTALK_DATAMAPPER_COMPILER_INSPECT_PORT");
        if (int.TryParse(inspectPort, out int port) && port is >= 1024 and <= 65535)
        {
            startInfo.ArgumentList.Add($"--inspect-brk=127.0.0.1:{port}");
        }
        startInfo.ArgumentList.Add(options.CompilerHostPath);
        startInfo.Environment["ELECTRON_RUN_AS_NODE"] = "1";

        process = new Process { StartInfo = startInfo, EnableRaisingEvents = true };
        process.ErrorDataReceived += (_, eventArgs) =>
        {
            if (!string.IsNullOrWhiteSpace(eventArgs.Data))
            {
                Console.Error.WriteLine($"Compiler host: {eventArgs.Data}");
            }
        };
        if (!process.Start())
        {
            process.Dispose();
            process = null;
            throw new InvalidOperationException("Failed to start compiler host.");
        }
        process.BeginErrorReadLine();
    }

    private void StopProcess()
    {
        Process? activeProcess = process;
        process = null;
        if (activeProcess is null)
        {
            return;
        }
        try
        {
            if (!activeProcess.HasExited)
            {
                activeProcess.Kill(entireProcessTree: true);
                activeProcess.WaitForExit(5_000);
            }
        }
        finally
        {
            activeProcess.Dispose();
        }
    }

    private static JsonElement? GetOptionalProperty(JsonElement value, string name)
    {
        return value.TryGetProperty(name, out JsonElement property) &&
            property.ValueKind is not JsonValueKind.Null and not JsonValueKind.Undefined
            ? property
            : null;
    }
}
