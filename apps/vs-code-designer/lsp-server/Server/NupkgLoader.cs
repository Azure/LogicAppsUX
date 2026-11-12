using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;

namespace SdkLspServer;

/// <summary>
/// Utility for extracting a NuGet package (.nupkg) and finding assemblies
/// within it. NuGet packages are ZIP archives. Only DLL files are returned.
/// </summary>
public static class NupkgLoader
{
    /// <summary>
    /// Extracts the contents of the given .nupkg file into the specified
    /// extraction root and returns all discovered .dll file paths. The
    /// extraction is performed synchronously on a background thread via
    /// Task.Run to avoid blocking the caller's thread.
    /// </summary>
    /// <param name="nupkgPath">Absolute path to a .nupkg file.</param>
    /// <param name="extractRoot">Destination directory to extract to.</param>
    /// <returns>A list of absolute paths to DLLs found within the package.</returns>
    public static Task<List<string>> ExtractAndFindAssembliesAsync(string nupkgPath, string extractRoot)
    {
        return Task.Run(() =>
        {
            Directory.CreateDirectory(extractRoot);
            ZipFile.ExtractToDirectory(nupkgPath, extractRoot, overwriteFiles: true);

            var dlls = Directory.GetFiles(extractRoot, "*.dll", SearchOption.AllDirectories)
                .OrderBy(p => p, System.StringComparer.OrdinalIgnoreCase)
                .ToList();
            return dlls;
        });
    }
}
