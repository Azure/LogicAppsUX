using LogicAppsLanguageServer;

namespace LogicAppsLanguageServer.Tests;

public class DocumentBufferStoreTests
{
    [Fact]
    public void RemoveBuffer_ExistingDocument_RemovesUnsavedContent()
    {
        const string documentUri = "file:///test/workflow.cs";
        var documentBufferStore = new DocumentBufferStore();
        documentBufferStore.UpdateBuffer(documentUri, "unsaved");

        bool removed = documentBufferStore.RemoveBuffer(documentUri);

        Assert.True(removed);
        Assert.Null(documentBufferStore.GetBuffer(documentUri));
    }
}
