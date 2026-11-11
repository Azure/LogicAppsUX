using System.Collections.Concurrent;

public class BufferManager
{
    private readonly ConcurrentDictionary<string, string> buffers = new();

    public void UpdateBuffer(string documentPath, string str)
    {
        buffers.AddOrUpdate(documentPath, str, (k, v) => str);
    }

    public string? GetBuffer(string documentPath)
    {
        return buffers.TryGetValue(documentPath, out string? buffer) ? buffer : null;
    }
}
