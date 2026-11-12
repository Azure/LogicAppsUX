using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace SdkLspServer;

/// <summary>
/// Represents an indexed SDK extracted from a NuGet package. It holds lists of
/// assemblies and type names discovered in the package. The index is loaded
/// eagerly on startup to avoid reflection during request handling.
/// </summary>
public sealed class SdkIndex : IDisposable
{
    private bool disposed;

    /// <summary>Gets the source .nupkg path used to create this index.</summary>
    public string SourceNupkgPath { get; }

    /// <summary>Gets the root directory where the nupkg contents were extracted.</summary>
    public string ExtractRoot { get; }

    /// <summary>Gets list of discovered assembly DLL paths.</summary>
    public ImmutableArray<string> AssemblyPaths { get; }

    /// <summary>Gets list of fully-qualified type names found in those assemblies.</summary>
    public ImmutableArray<string> TypeNames { get; }

    /// <summary>Gets a human‑readable summary describing how many assemblies and types were loaded.</summary>
    public string Summary => $"{AssemblyPaths.Length} assemblies, {TypeNames.Length} types";

    private SdkIndex(string nupkg, string root, IEnumerable<string> assemblies, IEnumerable<string> types)
    {
        SourceNupkgPath = nupkg;
        ExtractRoot = root;
        AssemblyPaths = assemblies.ToImmutableArray();
        TypeNames = types.ToImmutableArray();
    }

    /// <summary>
    /// Attempts to create an index from the given .nupkg path. If the path
    /// is null or the file does not exist, this returns null. Extraction and
    /// reflection are performed in a separate thread to avoid blocking the
    /// calling thread.
    /// </summary>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public static async Task<SdkIndex?> TryCreateAsync(string? nupkgPath)
    {
        if (string.IsNullOrWhiteSpace(nupkgPath) || !File.Exists(nupkgPath))
        {
            return null;
        }

        // Generate a temporary directory to extract contents into.
        string extractRoot = Path.Combine(Path.GetTempPath(), "sdk-lsp-server", Path.GetFileNameWithoutExtension(nupkgPath) + "-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(extractRoot);

        try
        {
            List<string> assemblies = await NupkgLoader.ExtractAndFindAssembliesAsync(nupkgPath, extractRoot);

            // Load metadata and collect type names without executing code
            (List<string> types, List<(string Path, string Error)> failures) = MetadataReader.ReadTypeNames(assemblies);
            if (failures.Count > 0)
            {
                await Console.Error.WriteLineAsync("[SdkLspServer] Failed to read some assemblies:\n  " +
                    string.Join("\n  ", failures.Select(f => $"{f.Path}: {f.Error}")));
            }

            return new SdkIndex(nupkgPath, extractRoot, assemblies, types);
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[SdkLspServer] Indexing failed: {ex}");
            DeleteExtractedFiles(extractRoot);
            return null;
        }
    }

    public void Dispose()
    {
        if (disposed)
        {
            return;
        }

        disposed = true;
        DeleteExtractedFiles(ExtractRoot);
        GC.SuppressFinalize(this);
    }

    private static void DeleteExtractedFiles(string extractRoot)
    {
        try
        {
            if (Directory.Exists(extractRoot))
            {
                Directory.Delete(extractRoot, recursive: true);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SdkLspServer] Failed to clean extracted SDK directory '{extractRoot}': {ex.Message}");
        }
    }

    /// <summary>
    /// A helper for reading type names from a set of assemblies using a
    /// MetadataLoadContext. Reading types in this way avoids executing code
    /// from the assemblies. Failures are collected to report to stderr.
    /// </summary>
    private static class MetadataReader
    {
        public static (List<string> Types, List<(string Path, string Error)> Failures) ReadTypeNames(IEnumerable<string> assemblyPaths)
        {
            var types = new List<string>();
            var failures = new List<(string, string)>();

            try
            {
                // Include core framework assemblies to satisfy references. Prefer the runtime directory,
                // but fall back to the trusted platform assemblies list which works with self-contained builds.
                IEnumerable<string> core = Array.Empty<string>();

                try
                {
                    string coreDir = System.Runtime.InteropServices.RuntimeEnvironment.GetRuntimeDirectory();
                    if (!string.IsNullOrEmpty(coreDir) && Directory.Exists(coreDir))
                    {
                        core = Directory.GetFiles(coreDir, "*.dll", SearchOption.TopDirectoryOnly);
                    }
                }
                catch
                {
                    // Ignore and fall back to TPA probing below.
                }

                if (!core.Any())
                {
                    if (AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") is string tpaList)
                    {
                        core = tpaList.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
                                      .Where(p => string.Equals(Path.GetExtension(p), ".dll", StringComparison.OrdinalIgnoreCase));
                    }
                }

                using var resolver = new System.Reflection.MetadataLoadContext(
                    new System.Reflection.PathAssemblyResolver(core.Concat(assemblyPaths)));
                foreach (string asmPath in assemblyPaths)
                {
                    try
                    {
                        System.Reflection.Assembly asm = resolver.LoadFromAssemblyPath(asmPath);
                        foreach (Type t in asm.GetTypes())
                        {
                            if (!t.IsNested)
                            {
                                types.Add(t.FullName ?? t.Name);
                            }
                        }
                    }
                    catch (Exception e)
                    {
                        failures.Add((asmPath, e.Message));
                    }
                }
            }
            catch (Exception e)
            {
                failures.Add(("(resolver)", e.Message));
            }

            return (types, failures);
        }
    }
}
