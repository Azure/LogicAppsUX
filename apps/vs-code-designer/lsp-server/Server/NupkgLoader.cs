using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using ICSharpCode.SharpZipLib.Zip;

namespace SdkLspServer;

/// <summary>
/// Utility for extracting a NuGet package (.nupkg) and finding assemblies
/// within it. NuGet packages are simply ZIP archives; this class uses
/// SharpZipLib to perform extraction. Only DLL files are returned.
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
            using FileStream fs = File.OpenRead(nupkgPath);
            using var zip = new ZipFile(fs);
            foreach (ZipEntry entry in zip)
            {
                if (!entry.IsFile)
                {
                    continue;
                }

                string outPath = Path.Combine(extractRoot, entry.Name.Replace('/', Path.DirectorySeparatorChar));
                Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);
                using Stream input = zip.GetInputStream(entry);
                using FileStream output = File.Create(outPath);
                input.CopyTo(output);
            }

            var dlls = Directory.GetFiles(extractRoot, "*.dll", SearchOption.AllDirectories)
                .OrderBy(p => p, System.StringComparer.OrdinalIgnoreCase)
                .ToList();
            return dlls;
        });
    }
}
