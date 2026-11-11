using System.Collections.Concurrent;

namespace SdkLspServer.Store.SessionData
{
    /// <summary>
    /// Slice for session-related data.
    /// </summary>
    public class SessionDataSlice
    {
        private readonly ConcurrentDictionary<string, object> sessionData = new();

        /// <summary>
        /// Sets a session value.
        /// </summary>
        /// <typeparam name="T">The type of the session value to store.</typeparam>
        /// <param name="key">The key for the session value.</param>
        /// <param name="value">The value to store in the session.</param>
        public void Set<T>(string key, T value)
            where T : notnull
        {
            sessionData[key] = value;
        }

        /// <summary>
        /// Gets a session value.
        /// </summary>
        /// <typeparam name="T">The type of the session value to retrieve.</typeparam>
        /// <param name="key">The key for the session value.</param>
        /// <returns>The session value if found; otherwise, null.</returns>
        public T? Get<T>(string key)
            where T : class
        {
            return sessionData.TryGetValue(key, out object? value) ? value as T : null;
        }

        /// <summary>
        /// Clears all session data.
        /// </summary>
        public void Clear()
        {
            sessionData.Clear();
        }
    }
}
