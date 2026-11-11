using System.Collections.Concurrent;

namespace SdkLspServer.Store.DocumentData
{
    /// <summary>
    /// Slice for document-related data.
    /// </summary>
    public class DocumentDataSlice
    {
        private readonly ConcurrentDictionary<string, DocumentMetadata> documents = new();

        /// <summary>
        /// Stores metadata about a document.
        /// </summary>
        /// <param name="uri">The URI of the document to store.</param>
        /// <param name="metadata">The metadata to associate with the document.</param>
        public void SetDocument(string uri, DocumentMetadata metadata)
        {
            documents[uri] = metadata;
        }

        /// <summary>
        /// Gets metadata for a document.
        /// </summary>
        /// <param name="uri">The URI of the document to retrieve.</param>
        /// <returns>The document metadata if found; otherwise, null.</returns>
        public DocumentMetadata? GetDocument(string uri)
        {
            return documents.TryGetValue(uri, out DocumentMetadata? metadata) ? metadata : null;
        }

        /// <summary>
        /// Removes a document from the store.
        /// </summary>
        /// <param name="uri">The URI of the document to remove.</param>
        public void RemoveDocument(string uri)
        {
            documents.TryRemove(uri, out _);
        }

        /// <summary>
        /// Clears all document data.
        /// </summary>
        public void Clear()
        {
            documents.Clear();
        }
    }
}
