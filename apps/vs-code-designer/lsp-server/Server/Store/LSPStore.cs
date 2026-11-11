using SdkLspServer.Store.DocumentData;
using SdkLspServer.Store.DynamicData;
using SdkLspServer.Store.SessionData;

namespace SdkLspServer.Store
{
    /// <summary>
    /// Centralized state management for the LSP server, similar to Redux architecture.
    /// Provides a single source of truth for shared data across all handlers.
    /// </summary>
    public class LSPStore
    {
        public LSPStore()
        {
            DynamicData = new DynamicDataStore();
            DocumentData = new DocumentDataSlice();
            SessionData = new SessionDataSlice();
        }

        /// <summary>
        /// Gets slice containing dynamic values data (API responses, cached suggestions, etc.)
        /// </summary>
        public DynamicDataStore DynamicData { get; }

        /// <summary>
        /// Gets slice containing document-related data.
        /// </summary>
        public DocumentDataSlice DocumentData { get; }

        /// <summary>
        /// Gets slice containing session-related data.
        /// </summary>
        public SessionDataSlice SessionData { get; }

        /// <summary>
        /// Clears all data in the store.
        /// </summary>
        public void ClearAll()
        {
            DynamicData.Clear();
            DocumentData.Clear();
            SessionData.Clear();
        }
    }
}
