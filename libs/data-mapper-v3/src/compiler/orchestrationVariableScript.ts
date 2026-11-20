export const orchestrationVariableScript = `
public string RetrieveOrchestrationVariable(string variableName)
{
    try
    {
        System.Type serviceType = null;
        foreach (System.Reflection.Assembly assembly in System.AppDomain.CurrentDomain.GetAssemblies())
        {
            serviceType = assembly.GetType("Microsoft.XLANGs.Core.Service", false);
            if (serviceType != null) break;
        }
        if (serviceType == null) return "";
        var flags = System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic;
        var rootProperty = serviceType.GetProperty("RootService", flags | System.Reflection.BindingFlags.Static);
        object root = rootProperty == null ? null : rootProperty.GetValue(null, null);
        if (root == null) return "";
        System.Reflection.FieldInfo managersField = null;
        for (System.Type type = root.GetType(); type != null && managersField == null; type = type.BaseType)
            managersField = type.GetField("_stateMgrs", flags | System.Reflection.BindingFlags.Instance);
        var managers = managersField == null ? null : managersField.GetValue(root) as System.Array;
        if (managers == null) return "";
        for (int index = managers.Length - 1; index >= 0; index--)
        {
            object context = managers.GetValue(index);
            if (context == null) continue;
            System.Type contextType = context.GetType();
            while (contextType != null && contextType.FullName != "Microsoft.XLANGs.Core.Context")
                contextType = contextType.BaseType;
            if (contextType == null) continue;
            foreach (System.Reflection.FieldInfo field in context.GetType().GetFields(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance))
            {
                foreach (object attribute in field.GetCustomAttributes(false))
                {
                    if (attribute.GetType().FullName != "Microsoft.XLANGs.Core.UserVariableAttribute") continue;
                    var nameProperty = attribute.GetType().GetProperty("Name");
                    string name = nameProperty == null ? null : nameProperty.GetValue(attribute, null) as string;
                    if (System.String.Equals(name, variableName, System.StringComparison.Ordinal))
                    {
                        object value = field.GetValue(context);
                        return value == null ? "" : value.ToString();
                    }
                }
            }
        }
    }
    catch
    {
        return "";
    }
    return "";
}
`;
