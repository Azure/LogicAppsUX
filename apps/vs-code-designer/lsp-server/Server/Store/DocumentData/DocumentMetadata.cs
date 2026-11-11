namespace SdkLspServer.Store.DocumentData
{
    /// <summary>
    /// Document metadata.
    /// </summary>
    public class DocumentMetadata
    {
        public string Uri { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public DateTime LastModified { get; set; }

        public int Version { get; set; }
    }
}
