using SdkLspServer;

namespace Server.Tests;

public class BufferManagerTests
{
    [Fact]
    public void RemoveBuffer_ExistingDocument_RemovesUnsavedContent()
    {
        const string documentUri = "file:///test/workflow.cs";
        var bufferManager = new BufferManager();
        bufferManager.UpdateBuffer(documentUri, "unsaved");

        bool removed = bufferManager.RemoveBuffer(documentUri);

        Assert.True(removed);
        Assert.Null(bufferManager.GetBuffer(documentUri));
    }
}
