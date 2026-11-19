using System.IO.Compression;

using LogicAppsLanguageServer;

namespace LogicAppsLanguageServer.Tests;

public class WorkflowSdkMetadataIndexTests
{
    [Fact]
    public async Task Dispose_RemovesExtractedSdkDirectory()
    {
        string testRoot = Path.Combine(Path.GetTempPath(), $"sdk-index-{Guid.NewGuid():N}");
        string packagePath = Path.Combine(testRoot, "empty.nupkg");
        Directory.CreateDirectory(testRoot);

        try
        {
            using (ZipFile.Open(packagePath, ZipArchiveMode.Create))
            {
            }

            WorkflowSdkMetadataIndex? index = await WorkflowSdkMetadataIndex.TryCreateAsync(packagePath);
            Assert.NotNull(index);
            string extractRoot = index.ExtractRoot;
            Assert.True(Directory.Exists(extractRoot));

            index.Dispose();

            Assert.False(Directory.Exists(extractRoot));
        }
        finally
        {
            Directory.Delete(testRoot, recursive: true);
        }
    }

    [Fact]
    public async Task TryCreateAsync_InvalidPackage_RemovesFailedExtractionDirectory()
    {
        string testRoot = Path.Combine(Path.GetTempPath(), $"sdk-index-{Guid.NewGuid():N}");
        string packageName = $"invalid-{Guid.NewGuid():N}";
        string packagePath = Path.Combine(testRoot, $"{packageName}.nupkg");
        string extractionParent = Path.Combine(Path.GetTempPath(), "logic-apps-language-server");
        Directory.CreateDirectory(testRoot);
        await File.WriteAllTextAsync(packagePath, "not a zip");

        try
        {
            WorkflowSdkMetadataIndex? index = await WorkflowSdkMetadataIndex.TryCreateAsync(packagePath);

            Assert.Null(index);
            Assert.Empty(Directory.Exists(extractionParent)
                ? Directory.GetDirectories(extractionParent, $"{packageName}-*")
                : []);
        }
        finally
        {
            Directory.Delete(testRoot, recursive: true);
        }
    }
}
