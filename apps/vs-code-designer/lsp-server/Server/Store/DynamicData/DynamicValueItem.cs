namespace SdkLspServer.Store.DynamicData;

/// <summary>
/// Represents a single dynamic value item (e.g., a form, a file, etc.)
/// </summary>
public class DynamicValueItem
{
    public DynamicValueItem()
    {
    }

    public DynamicValueItem(string value, string description)
    {
        Value = value;
        Description = description;
    }

    public string Value { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
}
