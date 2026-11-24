using System.IO.Compression;

using LogicAppsLanguageServer;

namespace LogicAppsLanguageServer.Tests;

public class NupkgLoaderTests
{
    [Fact]
    public async Task ExtractAndFindAssembliesAsync_EntryEscapesExtractionRoot_ThrowsWithoutWritingOutsideRoot()
    {
        string testRoot = Path.Combine(Path.GetTempPath(), $"nupkg-loader-{Guid.NewGuid():N}");
        string packagePath = Path.Combine(testRoot, "malicious.nupkg");
        string extractRoot = Path.Combine(testRoot, "extract");
        string escapedPath = Path.Combine(testRoot, "outside.dll");
        Directory.CreateDirectory(testRoot);

        try
        {
            using (ZipArchive archive = ZipFile.Open(packagePath, ZipArchiveMode.Create))
            {
                ZipArchiveEntry entry = archive.CreateEntry("../outside.dll");
                await using StreamWriter writer = new(entry.Open());
                await writer.WriteAsync("not an assembly");
            }

            await Assert.ThrowsAnyAsync<IOException>(() => NupkgLoader.ExtractAndFindAssembliesAsync(packagePath, extractRoot));
            Assert.False(File.Exists(escapedPath));
        }
        finally
        {
            Directory.Delete(testRoot, recursive: true);
        }
    }
}
