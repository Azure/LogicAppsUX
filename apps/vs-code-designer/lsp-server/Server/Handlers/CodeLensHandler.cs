using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using System.Runtime.InteropServices;

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

using OmniSharp.Extensions.LanguageServer.Protocol;
using OmniSharp.Extensions.LanguageServer.Protocol.Client.Capabilities;
using OmniSharp.Extensions.LanguageServer.Protocol.Document;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;

using LogicAppsLanguageServer.Services.Connections;
using LogicAppsLanguageServer.Services.Telemetry;

namespace LogicAppsLanguageServer.Handlers;

/// <summary>
/// Provides CodeLens information for text documents, offering actionable insights
/// for SDK methods and types. CodeLens items appear as clickable text above methods
/// and provide quick actions like documentation links and usage examples.
/// </summary>
public class CodeLensHandler(WorkflowSdkMetadataIndex? sdkMetadataIndex, DocumentBufferStore documentBufferStore, ITelemetryService telemetryService, ConnectionsService connectionsService) : CodeLensHandlerBase
{
    private readonly WorkflowSdkMetadataIndex? sdkMetadataIndex = sdkMetadataIndex;
    private readonly DocumentBufferStore documentBufferStore = documentBufferStore;
    private readonly ITelemetryService telemetry = telemetryService;
    private readonly ConnectionsService connectionsService = connectionsService;
    private int codeLensRequestCount = 0;

    // Concise short type format (e.g., string, int, List<T>) without namespaces
    public TextDocumentSelector DocumentSelector { get; } = new(
    new TextDocumentFilter()
    {
        Pattern = "**/*.cs",
    });

    public static TextDocumentAttributes GetTextDocumentAttributes(Uri uri)
    {
        return new TextDocumentAttributes(uri, "csharp");
    }

    /// <summary>
    /// Checks whether a connection with the given ID exists in the current connections configuration.
    /// </summary>
    private bool DoesConnectionExist(string? connectionId)
    {
        if (string.IsNullOrEmpty(connectionId))
        {
            return false;
        }

        Dictionary<string, ManagedApiConnection>? managedConnections = connectionsService.GetConnections()?.ManagedApiConnections;
        if (managedConnections == null || managedConnections.Count == 0)
        {
            return false;
        }

        string normalizedConnectionId = connectionId.Trim();

        // Fast path: direct key lookup for exact key matches.
        if (managedConnections.ContainsKey(normalizedConnectionId))
        {
            return true;
        }

        foreach (KeyValuePair<string, ManagedApiConnection> kvp in managedConnections)
        {
            if (string.Equals(kvp.Key, normalizedConnectionId, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            string? resourceId = kvp.Value.Connection?.Id;
            if (string.IsNullOrWhiteSpace(resourceId))
            {
                continue;
            }

            if (string.Equals(resourceId, normalizedConnectionId, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            string? connectionNameFromResourceId = TryExtractConnectionNameFromResourceId(resourceId);
            if (!string.IsNullOrWhiteSpace(connectionNameFromResourceId) &&
                string.Equals(connectionNameFromResourceId, normalizedConnectionId, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static string? TryExtractConnectionNameFromResourceId(string resourceId)
    {
        if (string.IsNullOrWhiteSpace(resourceId))
        {
            return null;
        }

        const string marker = "/connections/";
        int idx = resourceId.LastIndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
        {
            return null;
        }

        int start = idx + marker.Length;
        if (start >= resourceId.Length)
        {
            return null;
        }

        string tail = resourceId[start..];
        int slash = tail.IndexOf('/');
        return slash >= 0 ? tail[..slash] : tail;
    }

    private static string? GetTypedConstantDisplay(TypedConstant constant)
    {
        try
        {
            return constant.IsNull ? null : constant.Value?.ToString();
        }
        catch
        {
            return null;
        }
    }

    private static string? GetEnumConstantName(TypedConstant constant)
    {
        try
        {
            if (constant.IsNull)
            {
                return null;
            }

            if (constant.Type is INamedTypeSymbol enumType && enumType.TypeKind == TypeKind.Enum)
            {
                object? val = constant.Value;
                foreach (IFieldSymbol member in enumType.GetMembers().OfType<IFieldSymbol>())
                {
                    if (member.HasConstantValue && Equals(member.ConstantValue, val))
                    {
                        string memberName = member.Name;

                        // Check for EnumMember attribute to get API value
                        string? enumMemberValue = GetEnumMemberAttributeValueFromSymbol(member);

                        return !string.IsNullOrEmpty(enumMemberValue) ? $"{memberName} (API: \"{enumMemberValue}\")" : memberName;
                    }
                }
            }
        }
        catch
        {
            // ignore
        }

        return null;
    }

    private static string? GetEnumName(CustomAttributeTypedArgument arg)
    {
        try
        {
            Type t = arg.ArgumentType;
            if (t.IsEnum)
            {
                object? val = arg.Value;
                if (val is null)
                {
                    return null;
                }

                // If the value is not of enum type, convert
                if (val.GetType() != t)
                {
                    val = Enum.ToObject(t, val);
                }

                return Enum.GetName(t, val);
            }
        }
        catch
        {
            // ignore
        }

        return null;
    }

    private static string? GetEnumNameFromAttributeMember(Type attributeType, string memberName, CustomAttributeTypedArgument arg)
    {
        try
        {
            MemberInfo? member = (MemberInfo?)attributeType.GetProperty(memberName) ?? attributeType.GetField(memberName);
            Type? enumType = member switch
            {
                PropertyInfo pi => pi.PropertyType,
                FieldInfo fi => fi.FieldType,
                _ => null,
            };
            if (enumType?.IsEnum == true)
            {
                object? val = arg.Value;
                if (val is null)
                {
                    return null;
                }

                if (val.GetType() != enumType)
                {
                    try
                    {
                        val = Enum.ToObject(enumType, val);
                    }
                    catch
                    {
                    }
                }

                return Enum.GetName(enumType, val!);
            }
        }
        catch
        {
            // ignore
        }

        return null;
    }

    private static string? GetEnumNameFromParameter(ParameterInfo parameter, CustomAttributeTypedArgument arg)
    {
        try
        {
            Type enumType = parameter.ParameterType;
            if (enumType.IsEnum)
            {
                object? val = arg.Value;
                if (val is null)
                {
                    return null;
                }

                if (val.GetType() != enumType)
                {
                    try
                    {
                        val = Enum.ToObject(enumType, val);
                    }
                    catch
                    {
                    }
                }

                return Enum.GetName(enumType, val!);
            }
        }
        catch
        {
            // ignore
        }

        return null;
    }

    private static string? GetEnumNameOrValue(TypedConstant constant)
    {
        // Prefer a friendly enum name if possible; otherwise fall back to raw value
        string? name = GetEnumConstantName(constant);
        return !string.IsNullOrWhiteSpace(name) ? name : GetTypedConstantDisplay(constant);
    }

    private static string? BuildReflectionFullTypeName(INamedTypeSymbol type)
    {
        try
        {
            // Build namespace
            string ns = type.ContainingNamespace?.ToDisplayString() ?? string.Empty;

            // Build nested type chain with generic arity notation using backticks
            var parts = new List<string>();
            INamedTypeSymbol? current = type;
            while (current is not null)
            {
                string name = current.Name;
                if (current.Arity > 0)
                {
                    name += "`" + current.Arity.ToString();
                }

                parts.Insert(0, name);
                current = current.ContainingType;
            }

            string nested = string.Join('+', parts);
            return !string.IsNullOrEmpty(ns) ? ns + "." + nested : nested;
        }
        catch
        {
            return null;
        }
    }

    private static bool IsConnectionNeeded(IMethodSymbol method)
    {
        // Primary signal: ConnectorOperation attribute on the method
        bool hasConnectorOperation = method
            .GetAttributes()
            .Any(a => string.Equals(a.AttributeClass?.Name, "ConnectorOperationAttribute", StringComparison.Ordinal)
                   || string.Equals(a.AttributeClass?.Name, "ConnectorOperation", StringComparison.Ordinal));

        if (hasConnectorOperation)
        {
            return true;
        }

        // Secondary signal: any parameter annotated with ConnectionName
        return method.Parameters.Any(p =>
            p.GetAttributes().Any(a => string.Equals(a.AttributeClass?.Name, "ConnectionNameAttribute", StringComparison.Ordinal)
                                     || string.Equals(a.AttributeClass?.Name, "ConnectionName", StringComparison.Ordinal)));
    }

    /// <summary>
    /// Checks if a property has the [Agent] attribute, indicating it's an agent connection property.
    /// </summary>
    private static bool IsAgentConnectionProperty(IPropertySymbol property)
    {
        return property.GetAttributes().Any(a =>
            string.Equals(a.AttributeClass?.Name, "AgentAttribute", StringComparison.Ordinal) ||
            string.Equals(a.AttributeClass?.Name, "Agent", StringComparison.Ordinal));
    }

    private bool IsAgentFactoryInvocation(InvocationExpressionSyntax invocation, SemanticModel semanticModel)
    {
        if (invocation.Expression is MemberAccessExpressionSyntax memberAccess &&
            IsAgentFactoryName(memberAccess.Name.Identifier.ValueText) &&
            memberAccess.Expression is MemberAccessExpressionSyntax builtInAccess &&
            string.Equals(builtInAccess.Name.Identifier.ValueText, "BuiltIn", StringComparison.Ordinal) &&
            string.Equals(GetInvokedSimpleName(builtInAccess.Expression), "WorkflowActions", StringComparison.Ordinal))
        {
            return true;
        }

        SymbolInfo symbolInfo = semanticModel.GetSymbolInfo(invocation);
        IEnumerable<IMethodSymbol> methods = symbolInfo.Symbol is IMethodSymbol directMethod
            ? new[] { directMethod }
            : symbolInfo.CandidateSymbols.OfType<IMethodSymbol>();

        return methods.Any(IsAgentFactoryMethod);
    }

    private static bool IsAgentFactoryName(string name) =>
        string.Equals(name, "Agent", StringComparison.Ordinal);

    private bool IsAgentFactoryMethod(IMethodSymbol method)
    {
        if (!IsAgentFactoryName(method.Name) || !IsSymbolFromSdk(method))
        {
            return false;
        }

        return string.Equals(method.ContainingType?.Name, "WorkflowBuiltInActions", StringComparison.Ordinal) ||
               string.Equals(method.ReturnType.Name, "AgentAction", StringComparison.Ordinal);
    }

    private static ArgumentSyntax? FindAgentConnectionNameArgument(InvocationExpressionSyntax invocation, IMethodSymbol? method)
    {
        ArgumentSyntax? namedArgument = invocation.ArgumentList.Arguments.FirstOrDefault(argument =>
            string.Equals(argument.NameColon?.Name.Identifier.ValueText, "connectionName", StringComparison.Ordinal));
        if (namedArgument != null)
        {
            return namedArgument;
        }

        IParameterSymbol? connectionParameter = method?.Parameters.FirstOrDefault(parameter =>
            string.Equals(parameter.Name, "connectionName", StringComparison.Ordinal));
        if (connectionParameter != null && connectionParameter.Ordinal < invocation.ArgumentList.Arguments.Count)
        {
            return invocation.ArgumentList.Arguments[connectionParameter.Ordinal];
        }

        const int connectionNameParameterIndex = 3;
        return invocation.ArgumentList.Arguments.Count > connectionNameParameterIndex
            ? invocation.ArgumentList.Arguments[connectionNameParameterIndex]
            : null;
    }

    private static void AddCoreReferences(List<MetadataReference> references, HashSet<string> seenPaths)
    {
        TryAddReference(references, seenPaths, typeof(string).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(object).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(Console).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(Enumerable).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(Task).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(System.Linq.Expressions.Expression).Assembly.Location);

        TryAddTrustedReference(references, seenPaths, "netstandard.dll");
        TryAddTrustedReference(references, seenPaths, "System.Runtime.dll");
        TryAddTrustedReference(references, seenPaths, "System.Collections.dll");
        TryAddTrustedReference(references, seenPaths, "System.Linq.Expressions.dll");
        TryAddTrustedReference(references, seenPaths, "Newtonsoft.Json.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.Abstractions.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.Primitives.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.Configuration.Abstractions.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.DependencyInjection.Abstractions.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.Logging.Abstractions.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.Options.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.Hosting.Abstractions.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.Hosting.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.DependencyInjection.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.Configuration.dll");
        TryAddTrustedReference(references, seenPaths, "Microsoft.Extensions.Logging.dll");
    }

    private static string? TryGetTrustedAssemblyPath(string assemblyFile)
    {
        if (string.IsNullOrWhiteSpace(assemblyFile))
        {
            return null;
        }

        if (AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") is string tpaList)
        {
            foreach (string candidate in tpaList.Split(Path.PathSeparator))
            {
                try
                {
                    if (string.Equals(Path.GetFileName(candidate), assemblyFile, StringComparison.OrdinalIgnoreCase))
                    {
                        return candidate;
                    }
                }
                catch
                {
                    // Ignore malformed entries.
                }
            }
        }

        try
        {
            string runtimeDir = RuntimeEnvironment.GetRuntimeDirectory();
            if (!string.IsNullOrEmpty(runtimeDir))
            {
                string candidate = Path.Combine(runtimeDir, assemblyFile);
                if (File.Exists(candidate))
                {
                    return candidate;
                }
            }
        }
        catch
        {
        }

        try
        {
            string coreLibPath = typeof(object).Assembly.Location;
            if (!string.IsNullOrEmpty(coreLibPath))
            {
                string? directory = Path.GetDirectoryName(coreLibPath);
                if (!string.IsNullOrEmpty(directory))
                {
                    string candidate = Path.Combine(directory, assemblyFile);
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                }
            }
        }
        catch
        {
        }

        return null;
    }

    private static void TryAddReference(List<MetadataReference> references, HashSet<string> seenPaths, string? assemblyPath)
    {
        if (string.IsNullOrWhiteSpace(assemblyPath))
        {
            return;
        }

        string normalized = Path.GetFullPath(assemblyPath);
        if (!File.Exists(normalized) || !seenPaths.Add(normalized))
        {
            return;
        }

        try
        {
            references.Add(MetadataReference.CreateFromFile(normalized));
        }
        catch
        {
            // Skip references that cannot be loaded.
        }
    }

    /// <summary>
    /// Known member names that indicate a BuiltIn (non-connector) access chain.
    /// If any member in the chain matches, the invocation is not a managed connector.
    /// </summary>
    private static readonly HashSet<string> BuiltInMemberNames = new(StringComparer.Ordinal)
    {
        "BuiltIn",
    };

    /// <summary>
    /// Known type names for BuiltIn classes that should never be treated as connectors.
    /// </summary>
    private static readonly HashSet<string> BuiltInTypeNames = new(StringComparer.Ordinal)
    {
        "WorkflowBuiltInActions",
        "WorkflowBuiltInTriggers",
    };

    /// <summary>
    /// Returns true when the name matches a managed connector container property
    /// (Managed).
    /// </summary>
    private static bool IsManagedConnectorContainerName(string name) =>
        string.Equals(name, "Managed", StringComparison.Ordinal);

    private static string? TryInferConnectorName(InvocationExpressionSyntax invocation)
    {
        if (invocation.Expression is not MemberAccessExpressionSyntax memberAccess)
        {
            return null;
        }

        // Early exit: if any member in the access chain is a BuiltIn member, this is not a connector
        if (IsBuiltInAccessChain(memberAccess))
        {
            return null;
        }

        foreach (MemberAccessExpressionSyntax access in GetMemberAccessChain(memberAccess))
        {
            // Pattern 1: WorkflowTriggers.Managed.ConnectorName() or WorkflowActions.Managed.ConnectorName()
            // Also check in parent chain for: Msnweather("conn").OnCurrentWeatherChange(...)
            if (access.Expression is InvocationExpressionSyntax connectorInvocation)
            {
                // This could be the connector invocation (e.g., Msnweather("msnweather"))
                // Check if it follows the pattern: ...Managed.ConnectorName(...)
                if (connectorInvocation.Expression is MemberAccessExpressionSyntax connectorAccess)
                {
                    string connectorName = GetInvokedSimpleName(connectorInvocation.Expression);

                    // Walk up to check if parent is "Managed"
                    if (connectorAccess.Expression is MemberAccessExpressionSyntax managedAccess &&
                        IsManagedConnectorContainerName(managedAccess.Name.ToString()))
                    {
                        // Check if grandparent is WorkflowTriggers or WorkflowActions
                        string grandparentName = GetInvokedSimpleName(managedAccess.Expression);

                        if (string.Equals(grandparentName, "WorkflowTriggers", StringComparison.Ordinal) ||
                            string.Equals(grandparentName, "WorkflowActions", StringComparison.Ordinal))
                        {
                            return string.IsNullOrWhiteSpace(connectorName) ? null : connectorName;
                        }
                    }

                    // Pattern 2b: WorkflowActions.BuiltIn.ServiceProviders.ConnectorName("conn")
                    // Chain: ServiceProviders.ConnectorName("conn") where ServiceProviders parent is BuiltIn
                    if (connectorAccess.Expression is MemberAccessExpressionSyntax serviceProvidersAccess &&
                        string.Equals(serviceProvidersAccess.Name.ToString(), "ServiceProviders", StringComparison.Ordinal) &&
                        serviceProvidersAccess.Expression is MemberAccessExpressionSyntax builtInAccess &&
                        string.Equals(builtInAccess.Name.ToString(), "BuiltIn", StringComparison.Ordinal))
                    {
                        string rootName = GetInvokedSimpleName(builtInAccess.Expression);
                        if (string.Equals(rootName, "WorkflowTriggers", StringComparison.Ordinal) ||
                            string.Equals(rootName, "WorkflowActions", StringComparison.Ordinal))
                        {
                            return string.IsNullOrWhiteSpace(connectorName) ? null : connectorName;
                        }
                    }
                }
            }

            // Pattern 2: WorkflowTriggers.Managed.ConnectorName(...) or WorkflowActions.Managed.ConnectorName(...)
            // This handles: Managed.Msnweather("conn").Method(...)
            if (access.Expression is InvocationExpressionSyntax managedConnectorInvocation &&
                managedConnectorInvocation.Expression is MemberAccessExpressionSyntax connectorMethodAccess &&
                connectorMethodAccess.Expression is MemberAccessExpressionSyntax managedConnectorsAccess &&
                IsManagedConnectorContainerName(managedConnectorsAccess.Name.ToString()))
            {
                // Get the connector name from the invoked method (e.g., "Msnweather" in Managed.Msnweather(...))
                string connectorName = connectorMethodAccess.Name.ToString();

                // Walk up to check if parent is WorkflowTriggers or WorkflowActions
                string parentName = GetInvokedSimpleName(managedConnectorsAccess.Expression);

                if (string.Equals(parentName, "WorkflowTriggers", StringComparison.Ordinal) ||
                    string.Equals(parentName, "WorkflowActions", StringComparison.Ordinal))
                {
                    return string.IsNullOrWhiteSpace(connectorName) ? null : connectorName;
                }
            }

            // Pattern 4: new ConnectorActions("conn").Operation(...)
            if (access.Expression is ObjectCreationExpressionSyntax objectCreation)
            {
                string? typeName = objectCreation.Type switch
                {
                    IdentifierNameSyntax identifier => identifier.Identifier.ValueText,
                    GenericNameSyntax generic => generic.Identifier.ValueText,
                    QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText,
                    AliasQualifiedNameSyntax aliasQualified => aliasQualified.Name.Identifier.ValueText,
                    _ => null,
                };

                string? connectorName = NormalizeConnectorNameFromTypeName(typeName);
                if (!string.IsNullOrWhiteSpace(connectorName))
                {
                    return connectorName;
                }
            }
        }

        return null;
    }

    private static string? NormalizeConnectorNameFromTypeName(string? typeName)
    {
        if (string.IsNullOrWhiteSpace(typeName))
        {
            return null;
        }

        // Reject known BuiltIn type names
        if (BuiltInTypeNames.Contains(typeName))
        {
            return null;
        }

        // Only treat types ending in "Actions" or "Triggers" as connector types
        string candidate = typeName;
        if (candidate.EndsWith("Actions", StringComparison.Ordinal))
        {
            candidate = candidate[..^"Actions".Length];
        }
        else if (candidate.EndsWith("Triggers", StringComparison.Ordinal))
        {
            candidate = candidate[..^"Triggers".Length];
        }
        else
        {
            // Not a connector type name pattern — reject
            return null;
        }

        return string.IsNullOrWhiteSpace(candidate) ? null : candidate;
    }

    /// <summary>
    /// Walks the full member access chain (including into invocation sub-expressions)
    /// and returns true if any member name is a known BuiltIn member, or any
    /// object creation type is a known BuiltIn type.
    /// Chains that pass through BuiltIn.ServiceProviders are NOT treated as pure
    /// built-in because service providers require connections.
    /// </summary>
    private static bool IsBuiltInAccessChain(MemberAccessExpressionSyntax memberAccess)
    {
        // If the chain contains BuiltIn.ServiceProviders, it is a connector chain, not pure built-in.
        SyntaxNode? probe = memberAccess;
        while (probe is MemberAccessExpressionSyntax ma)
        {
            if (string.Equals(ma.Name.Identifier.ValueText, "ServiceProviders", StringComparison.Ordinal))
            {
                return false;
            }

            probe = ma.Expression is InvocationExpressionSyntax inv ? inv.Expression : ma.Expression;
        }

        // Walk the chain checking member names and sub-expression types
        SyntaxNode? current = memberAccess;
        while (current != null)
        {
            if (current is MemberAccessExpressionSyntax access)
            {
                if (BuiltInMemberNames.Contains(access.Name.Identifier.ValueText))
                {
                    return true;
                }

                current = access.Expression;
            }
            else if (current is InvocationExpressionSyntax invocation)
            {
                current = invocation.Expression;
            }
            else if (current is ObjectCreationExpressionSyntax objectCreation)
            {
                string? typeName = objectCreation.Type switch
                {
                    IdentifierNameSyntax identifier => identifier.Identifier.ValueText,
                    GenericNameSyntax generic => generic.Identifier.ValueText,
                    QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText,
                    _ => null,
                };

                if (typeName != null && BuiltInTypeNames.Contains(typeName))
                {
                    return true;
                }

                break;
            }
            else
            {
                break;
            }
        }

        return false;
    }

    private static InvocationExpressionSyntax? FindConnectorInvocationInChain(InvocationExpressionSyntax invocation)
    {
        if (invocation.Expression is not MemberAccessExpressionSyntax memberAccess)
        {
            return null;
        }

        foreach (MemberAccessExpressionSyntax access in GetMemberAccessChain(memberAccess))
        {
            if (access.Expression is not InvocationExpressionSyntax candidateInvocation)
            {
                continue;
            }

            if (candidateInvocation.Expression is not MemberAccessExpressionSyntax candidateAccess)
            {
                continue;
            }

            if (candidateAccess.Expression is MemberAccessExpressionSyntax managedAccess &&
                IsManagedConnectorContainerName(managedAccess.Name.ToString()))
            {
                string parentName = GetInvokedSimpleName(managedAccess.Expression);
                if (string.Equals(parentName, "WorkflowTriggers", StringComparison.Ordinal) ||
                    string.Equals(parentName, "WorkflowActions", StringComparison.Ordinal))
                {
                    return candidateInvocation;
                }
            }

            // Pattern: WorkflowActions.BuiltIn.ServiceProviders.ConnectorName("conn")
            if (candidateAccess.Expression is MemberAccessExpressionSyntax spAccess &&
                string.Equals(spAccess.Name.ToString(), "ServiceProviders", StringComparison.Ordinal) &&
                spAccess.Expression is MemberAccessExpressionSyntax spBuiltInAccess &&
                string.Equals(spBuiltInAccess.Name.ToString(), "BuiltIn", StringComparison.Ordinal))
            {
                string rootName = GetInvokedSimpleName(spBuiltInAccess.Expression);
                if (string.Equals(rootName, "WorkflowTriggers", StringComparison.Ordinal) ||
                    string.Equals(rootName, "WorkflowActions", StringComparison.Ordinal))
                {
                    return candidateInvocation;
                }
            }
        }

        return null;
    }

    private static InvocationExpressionSyntax? FindConnectorInvocationFromVariableReceiver(InvocationExpressionSyntax invocation, SemanticModel semanticModel)
    {
        if (invocation.Expression is not MemberAccessExpressionSyntax memberAccess ||
            memberAccess.Expression is not IdentifierNameSyntax receiverIdentifier)
        {
            return null;
        }

        ISymbol? receiverSymbol = semanticModel.GetSymbolInfo(receiverIdentifier).Symbol;
        SyntaxReference? declarationRef = receiverSymbol switch
        {
            ILocalSymbol local => local.DeclaringSyntaxReferences.FirstOrDefault(),
            IFieldSymbol field => field.DeclaringSyntaxReferences.FirstOrDefault(),
            IPropertySymbol property => property.DeclaringSyntaxReferences.FirstOrDefault(),
            _ => null,
        };

        if (declarationRef?.GetSyntax() is not VariableDeclaratorSyntax declarator ||
            declarator.Initializer?.Value is not InvocationExpressionSyntax initializerInvocation)
        {
            return null;
        }

        InvocationExpressionSyntax? connectorInvocation = FindConnectorInvocationInChain(initializerInvocation);
        if (connectorInvocation != null)
        {
            return connectorInvocation;
        }

        // If the initializer itself is the connector factory invocation
        // (e.g. WorkflowActions.Managed.Msnweather("conn")), use it.
        return IsConnectorFactoryInvocation(initializerInvocation) ? initializerInvocation : null;
    }

    private static string? TryInferConnectorNameFromVariableReceiver(InvocationExpressionSyntax invocation, SemanticModel semanticModel)
    {
        InvocationExpressionSyntax? connectorInvocation = FindConnectorInvocationFromVariableReceiver(invocation, semanticModel);
        if (connectorInvocation?.Expression is not MemberAccessExpressionSyntax connectorAccess)
        {
            return null;
        }

        return connectorAccess.Name is SimpleNameSyntax simpleName
            ? simpleName.Identifier.ValueText
            : null;
    }

    private static bool IsConnectorFactoryInvocation(InvocationExpressionSyntax invocation)
    {
        if (invocation.Expression is not MemberAccessExpressionSyntax connectorAccess ||
            connectorAccess.Expression is not MemberAccessExpressionSyntax managedContainer)
        {
            return false;
        }

        // Managed pattern: WorkflowActions.Managed.Xyz("conn")
        if (IsManagedConnectorContainerName(managedContainer.Name.ToString()))
        {
            string parentName = GetInvokedSimpleName(managedContainer.Expression);
            return string.Equals(parentName, "WorkflowActions", StringComparison.Ordinal) ||
                   string.Equals(parentName, "WorkflowTriggers", StringComparison.Ordinal);
        }

        // ServiceProviders pattern: WorkflowActions.BuiltIn.ServiceProviders.Xyz("conn")
        if (string.Equals(managedContainer.Name.ToString(), "ServiceProviders", StringComparison.Ordinal) &&
            managedContainer.Expression is MemberAccessExpressionSyntax builtInAccess &&
            string.Equals(builtInAccess.Name.ToString(), "BuiltIn", StringComparison.Ordinal))
        {
            string rootName = GetInvokedSimpleName(builtInAccess.Expression);
            return string.Equals(rootName, "WorkflowActions", StringComparison.Ordinal) ||
                   string.Equals(rootName, "WorkflowTriggers", StringComparison.Ordinal);
        }

        return false;
    }

    private static string? TryGetInvocationMethodName(InvocationExpressionSyntax invocation)
    {
        if (invocation.Expression is MemberAccessExpressionSyntax memberAccess && memberAccess.Name is SimpleNameSyntax simple)
        {
            string candidate = simple.Identifier.ValueText;
            return string.IsNullOrWhiteSpace(candidate) ? null : candidate;
        }

        return null;
    }

    private static IEnumerable<MemberAccessExpressionSyntax> GetMemberAccessChain(MemberAccessExpressionSyntax memberAccess)
    {
        MemberAccessExpressionSyntax? current = memberAccess;
        while (current != null)
        {
            yield return current;
            current = current.Expression as MemberAccessExpressionSyntax;
        }
    }

    private static string GetInvokedSimpleName(ExpressionSyntax expression)
    {
        return expression switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText,
            MemberAccessExpressionSyntax member when member.Name is SimpleNameSyntax simple => simple.Identifier.ValueText,
            _ => string.Empty,
        };
    }

    private static OmniSharp.Extensions.LanguageServer.Protocol.Models.Range GetRangeFromSyntaxNode(SyntaxNode node, SyntaxTree tree)
    {
        Microsoft.CodeAnalysis.Text.TextSpan span = node.Span;
        FileLinePositionSpan lineSpan = tree.GetLineSpan(span);

        return new OmniSharp.Extensions.LanguageServer.Protocol.Models.Range
        {
            Start = new Position(lineSpan.StartLinePosition.Line, lineSpan.StartLinePosition.Character),
            End = new Position(lineSpan.EndLinePosition.Line, lineSpan.EndLinePosition.Character),
        };
    }

    private static void TryAddTrustedReference(List<MetadataReference> references, HashSet<string> seenPaths, string assemblyFile)
    {
        string? path = TryGetTrustedAssemblyPath(assemblyFile);
        TryAddReference(references, seenPaths, path);
    }

    private static OmniSharp.Extensions.LanguageServer.Protocol.Models.Range GetFirstParameterLocation(InvocationExpressionSyntax invocation, SemanticModel semanticModel)
    {
        SyntaxTree tree = semanticModel.SyntaxTree;
        InvocationExpressionSyntax? connectorInvocationInChain = FindConnectorInvocationInChain(invocation);
        connectorInvocationInChain ??= FindConnectorInvocationFromVariableReceiver(invocation, semanticModel);
        if (connectorInvocationInChain != null)
        {
            if (connectorInvocationInChain.ArgumentList?.Arguments.Count > 0)
            {
                return GetRangeFromSyntaxNode(connectorInvocationInChain.ArgumentList.Arguments[0], tree);
            }

            // Insert into empty connector argument list (e.g., Msnweather())
            // so connection creation updates the connector call site, not operation arguments.
            return GetEmptyArgumentInsertionRange(connectorInvocationInChain, tree);
        }

        // The goal is to find the connector constructor invocation (e.g., Msnweather("msnweather"))
        // in the chain: WorkflowActions.Managed.Msnweather("msnweather").CurrentWeather(...)
        // We need to traverse the member access chain to find the invocation that contains the connection ID
        if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
        {
            // Walk up the member access chain to find connector invocations
            foreach (MemberAccessExpressionSyntax access in GetMemberAccessChain(memberAccess))
            {
                // Check if the expression is an invocation (e.g., Msnweather("connectionId"))
                if (access.Expression is InvocationExpressionSyntax connectorInvocation)
                {
                    // This is likely the connector constructor - get its first argument
                    ArgumentListSyntax? argumentList = connectorInvocation.ArgumentList;

                    if (argumentList?.Arguments.Count > 0)
                    {
                        // Return the range of the first argument (the connection ID)
                        ArgumentSyntax firstArgument = argumentList.Arguments[0];
                        return GetRangeFromSyntaxNode(firstArgument, tree);
                    }

                    // If the connector invocation has no arguments, insert inside parentheses.
                    return GetEmptyArgumentInsertionRange(connectorInvocation, tree);
                }
            }
        }

        // Fallback: If we can't find a connector invocation in the chain,
        // return the range of the current invocation's first argument (old behavior)
        ArgumentListSyntax? fallbackArgumentList = invocation.ArgumentList;

        if (fallbackArgumentList?.Arguments.Count > 0)
        {
            ArgumentSyntax firstArgument = fallbackArgumentList.Arguments[0];
            return GetRangeFromSyntaxNode(firstArgument, tree);
        }

        // Last resort: return the range of the invocation itself
        return GetRangeFromSyntaxNode(invocation, tree);
    }

    private static OmniSharp.Extensions.LanguageServer.Protocol.Models.Range GetEmptyArgumentInsertionRange(InvocationExpressionSyntax invocation, SyntaxTree tree)
    {
        ArgumentListSyntax? argumentList = invocation.ArgumentList;
        if (argumentList == null)
        {
            return GetRangeFromSyntaxNode(invocation, tree);
        }

        int position = argumentList.OpenParenToken.Span.End;
        FileLinePositionSpan lineSpan = tree.GetLineSpan(new Microsoft.CodeAnalysis.Text.TextSpan(position, 0));

        return new OmniSharp.Extensions.LanguageServer.Protocol.Models.Range
        {
            Start = new Position(lineSpan.StartLinePosition.Line, lineSpan.StartLinePosition.Character),
            End = new Position(lineSpan.EndLinePosition.Line, lineSpan.EndLinePosition.Character),
        };
    }

    /// <summary>
    /// Extracts the connection ID from the invocation by looking for the parameter with [ConnectionName] attribute.
    /// Returns the string literal value of the connection parameter if found.
    /// </summary>
    private static string? ExtractConnectionIdFromInvocation(InvocationExpressionSyntax invocation, IMethodSymbol? method, SemanticModel semanticModel)
    {
        InvocationExpressionSyntax? connectorInvocationInChain = FindConnectorInvocationInChain(invocation);
        connectorInvocationInChain ??= FindConnectorInvocationFromVariableReceiver(invocation, semanticModel);
        if (connectorInvocationInChain != null)
        {
            if (connectorInvocationInChain.ArgumentList?.Arguments.Count > 0)
            {
                foreach (ArgumentSyntax arg in connectorInvocationInChain.ArgumentList.Arguments)
                {
                    string? value = ExtractStringLiteralFromArgument(arg);
                    if (!string.IsNullOrEmpty(value))
                    {
                        return value;
                    }
                }
            }

            // The connection id belongs to the connector invocation. If there are no
            // connector arguments, do not infer from operation arguments such as location.
            return null;
        }

        ArgumentListSyntax? argumentList = invocation.ArgumentList;
        if (argumentList == null || argumentList.Arguments.Count == 0)
        {
            return null;
        }

        // If we have the method symbol, use it to find the connection parameter
        if (method != null)
        {
            // Find the parameter with [ConnectionName] attribute
            IParameterSymbol? connectionParameter = method.Parameters.FirstOrDefault(p =>
                p.GetAttributes().Any(a =>
                    string.Equals(a.AttributeClass?.Name, "ConnectionNameAttribute", StringComparison.Ordinal) ||
                    string.Equals(a.AttributeClass?.Name, "ConnectionName", StringComparison.Ordinal)));

            if (connectionParameter != null)
            {
                int connectionParameterIndex = connectionParameter.Ordinal;
                if (connectionParameterIndex < argumentList.Arguments.Count)
                {
                    ArgumentSyntax connectionArgument = argumentList.Arguments[connectionParameterIndex];
                    return ExtractStringLiteralFromArgument(connectionArgument);
                }
            }
        }

        // Fallback: Look for the first string literal (likely the connection name)
        foreach (ArgumentSyntax arg in argumentList.Arguments)
        {
            string? value = ExtractStringLiteralFromArgument(arg);
            if (!string.IsNullOrEmpty(value))
            {
                return value;
            }
        }

        return null;
    }

    /// <summary>
    /// Extracts a string literal value from an argument expression.
    /// Handles direct string literals and simple identifier references.
    /// </summary>
    private static string? ExtractStringLiteralFromArgument(ArgumentSyntax argument)
    {
        // Direct string literal: "connectionName"
        if (argument.Expression is LiteralExpressionSyntax literal &&
            literal.Token.IsKind(SyntaxKind.StringLiteralToken))
        {
            return literal.Token.ValueText;
        }

        // Could add more cases here if needed (e.g., const references, variable lookups)
        return null;
    }

    [RequiresAssemblyFiles]
    public override async Task<CodeLensContainer?> Handle(CodeLensParams request, CancellationToken cancellationToken)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        // Sample codelens requests at 25%
        bool shouldTrack = (++codeLensRequestCount % 4) == 0;

        if (shouldTrack)
        {
            telemetry.TrackEvent("CodeLens_Request");
        }

        try
        {
            string documentPath = request.TextDocument.Uri.ToString();

            if (request.TextDocument.Uri.Scheme == "file")
            {
                try
                {
                    connectionsService.EnsureConnectionsLoadedForDocument(request.TextDocument.Uri.GetFileSystemPath());
                }
                catch
                {
                    // Best-effort lookup from local connections.json.
                }
            }

            // Get the document content from DocumentBufferStore
            string? documentText = documentBufferStore.GetBuffer(documentPath);
            if (string.IsNullOrEmpty(documentText))
            {
                // Fallback: try to read file from disk if not in buffer
                if (request.TextDocument.Uri.Scheme == "file")
                {
                    try
                    {
                        string filePath = request.TextDocument.Uri.GetFileSystemPath();
                        documentText = await File.ReadAllTextAsync(filePath, cancellationToken);
                    }
                    catch
                    {
                        return new CodeLensContainer();
                    }
                }
                else
                {
                    return new CodeLensContainer();
                }
            }

            // Analyze the document and find SDK-related code lenses
            IEnumerable<CodeLens> codeLenses = await FindCodeLensesAsync(documentText, request.TextDocument.Uri);

            stopwatch.Stop();

            if (shouldTrack)
            {
                telemetry.TrackMetric("CodeLens_ResponseTime_Ms", stopwatch.ElapsedMilliseconds);
                telemetry.TrackEvent("CodeLens_Provided", new Dictionary<string, string>
                {
                    { "Count", codeLenses.Count().ToString() },
                });
            }

            return new CodeLensContainer(codeLenses);
        }
        catch (Exception ex)
        {
            telemetry.TrackException(ex, new Dictionary<string, string>
            {
                { "Handler", "CodeLens" },
            });

            return new CodeLensContainer();
        }
    }

    public override Task<CodeLens> Handle(CodeLens request, CancellationToken cancellationToken)
    {
        // This method is called to resolve additional data for a CodeLens
        // Since we provide all data immediately (ResolveProvider = false), we just return the request as-is
        return Task.FromResult(request);
    }

    protected override CodeLensRegistrationOptions CreateRegistrationOptions(CodeLensCapability capability, ClientCapabilities clientCapabilities)
    {
        return new CodeLensRegistrationOptions
        {
            DocumentSelector = DocumentSelector,
            ResolveProvider = false, // We provide all data immediately
        };
    }

    [RequiresAssemblyFiles("Calls System.Reflection.Assembly.Location")]
    private async Task<IEnumerable<CodeLens>> FindCodeLensesAsync(string documentText, DocumentUri documentUri)
    {
        var codeLenses = new List<CodeLens>();

        try
        {
            // Parse the document
            SyntaxTree tree = CSharpSyntaxTree.ParseText(documentText);
            CompilationUnitSyntax root = tree.GetCompilationUnitRoot();

            var references = new List<MetadataReference>();
            var referencePaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            AddCoreReferences(references, referencePaths);

            // Add SDK assembly references if available
            if (sdkMetadataIndex != null)
            {
                foreach (string assemblyPath in sdkMetadataIndex.AssemblyPaths)
                {
                    TryAddReference(references, referencePaths, assemblyPath);
                }
            }

            var compilation = CSharpCompilation.Create(
                "CodeLensAnalysis",
                new[] { tree },
                references);

            SemanticModel semanticModel = compilation.GetSemanticModel(tree);

            // Find method invocations that might be SDK-related
            IEnumerable<InvocationExpressionSyntax> invocations = root.DescendantNodes().OfType<InvocationExpressionSyntax>();
            foreach (InvocationExpressionSyntax invocation in invocations)
            {
                IEnumerable<CodeLens> invocationCodeLenses = await CreateCodeLensesForInvocationAsync(invocation, semanticModel, documentUri);
                codeLenses.AddRange(invocationCodeLenses);
            }

            // Find AgentBuilder object initializers with ConnectionName property
            IEnumerable<ObjectCreationExpressionSyntax> objectCreations = root.DescendantNodes().OfType<ObjectCreationExpressionSyntax>();
            foreach (ObjectCreationExpressionSyntax objectCreation in objectCreations)
            {
                IEnumerable<CodeLens> agentCodeLenses = await CreateCodeLensesForAgentBuilderAsync(objectCreation, semanticModel, documentUri);
                codeLenses.AddRange(agentCodeLenses);
            }

            // Find method declarations that might be SDK entry points
            foreach (MethodDeclarationSyntax method in root.DescendantNodes().OfType<MethodDeclarationSyntax>())
            {
                IEnumerable<CodeLens> methodCodeLenses = await CreateCodeLensesForMethodAsync(method, semanticModel);
                codeLenses.AddRange(methodCodeLenses);
            }
        }
        catch
        {
        }

        return codeLenses;
    }

    private async Task<IEnumerable<CodeLens>> CreateCodeLensesForInvocationAsync(
        InvocationExpressionSyntax invocation,
        SemanticModel semanticModel,
        DocumentUri documentUri)
    {
        var codeLenses = new List<CodeLens>();

        try
        {
            IEnumerable<CodeLens> agentFactoryCodeLenses = CreateCodeLensesForAgentFactoryInvocation(invocation, semanticModel, documentUri);
            if (agentFactoryCodeLenses.Any())
            {
                return agentFactoryCodeLenses;
            }

            // Get symbol information for the invocation and prefer SDK methods when available
            SymbolInfo symbolInfo = semanticModel.GetSymbolInfo(invocation);
            IMethodSymbol? resolvedMethod = null;

            // Only use SDK candidate symbols when Roslyn has no direct symbol.
            // Falling back when a non-SDK direct method exists can produce false positives.
            if (symbolInfo.Symbol is IMethodSymbol directMethod)
            {
                if (IsSymbolFromSdk(directMethod))
                {
                    resolvedMethod = directMethod;
                }
            }
            else if (symbolInfo.Symbol is null)
            {
                resolvedMethod = symbolInfo.CandidateSymbols
                    .OfType<IMethodSymbol>()
                    .FirstOrDefault(IsSymbolFromSdk);
            }

            string? inferredConnectorName = TryInferConnectorName(invocation) ?? TryInferConnectorNameFromVariableReceiver(invocation, semanticModel);

            if (resolvedMethod is null && inferredConnectorName is null)
            {
                return codeLenses;
            }

            // For extension methods, prefer attributes from the unreduced/original definition
            IMethodSymbol? annotatedMethod = (resolvedMethod != null && resolvedMethod.MethodKind == MethodKind.ReducedExtension && resolvedMethod.ReducedFrom is not null)
                ? resolvedMethod.ReducedFrom
                : resolvedMethod;

            // Place the lens on the connector invocation when available,
            // even if the operation call happens on a separate line/variable.
            InvocationExpressionSyntax? connectorInvocationForLens =
                FindConnectorInvocationInChain(invocation) ??
                FindConnectorInvocationFromVariableReceiver(invocation, semanticModel);

            OmniSharp.Extensions.LanguageServer.Protocol.Models.Range range = GetRangeFromSyntaxNode(
                connectorInvocationForLens ?? invocation,
                semanticModel.SyntaxTree);

            (string? attrConnectorType, string? attrConnectorName) = annotatedMethod != null
                ? TryGetConnectorOperationInfo(annotatedMethod)
                : (null, null);

            string? connectorName = attrConnectorName ?? inferredConnectorName;

            // Determine if this invocation needs a connection:
            // - If we resolved the method symbol, trust the attribute-based check
            // - Only fall back to syntactic inference when semantic resolution failed entirely
            bool needsConnection = annotatedMethod != null
                ? IsConnectionNeeded(annotatedMethod)
                : inferredConnectorName is not null;

            if (!needsConnection)
            {
                return codeLenses;
            }

            string titleMethodName = annotatedMethod?.Name ?? TryGetInvocationMethodName(invocation) ?? "Connector";

            // Extract the connection ID from the invocation's connection parameter
            string? connectionId = ExtractConnectionIdFromInvocation(invocation, annotatedMethod, semanticModel);

            bool connectionExists = DoesConnectionExist(connectionId);
            string mode = connectionExists ? "manage" : "create";
            string actionLabel = connectionExists ? "Manage connection" : "Create connection";

            var command = new Command
            {
                Title = $"{titleMethodName} - {actionLabel}",
                Name = "azureLogicAppsStandard.openLanguageServerConnectionView",
                Arguments = Newtonsoft.Json.Linq.JArray.FromObject(new object[]
                {
                    documentUri.GetFileSystemPath(),
                    titleMethodName,
                    connectorName != null ? connectorName.ToLowerInvariant() : string.Empty,
                    attrConnectorType ?? string.Empty,
                    GetFirstParameterLocation(invocation, semanticModel),
                    connectionId ?? string.Empty,
                    mode,
                }),
            };

            codeLenses.Add(new CodeLens
            {
                Range = range,
                Command = command,
            });
        }
        catch
        {
        }

        return codeLenses;
    }

    private IEnumerable<CodeLens> CreateCodeLensesForAgentFactoryInvocation(
        InvocationExpressionSyntax invocation,
        SemanticModel semanticModel,
        DocumentUri documentUri)
    {
        var codeLenses = new List<CodeLens>();

        try
        {
            if (!IsAgentFactoryInvocation(invocation, semanticModel))
            {
                return codeLenses;
            }

            SymbolInfo symbolInfo = semanticModel.GetSymbolInfo(invocation);
            IMethodSymbol? resolvedMethod = symbolInfo.Symbol is IMethodSymbol directMethod
                ? directMethod
                : symbolInfo.CandidateSymbols.OfType<IMethodSymbol>().FirstOrDefault(IsAgentFactoryMethod);

            ArgumentSyntax? connectionArgument = FindAgentConnectionNameArgument(invocation, resolvedMethod);
            string? connectionId = connectionArgument != null
                ? ExtractStringLiteralFromArgument(connectionArgument)
                : null;

            OmniSharp.Extensions.LanguageServer.Protocol.Models.Range range = connectionArgument != null
                ? GetRangeFromSyntaxNode(connectionArgument.Expression, semanticModel.SyntaxTree)
                : GetRangeFromSyntaxNode(invocation, semanticModel.SyntaxTree);

            bool connectionExists = DoesConnectionExist(connectionId);
            string mode = connectionExists ? "manage" : "create";
            string actionLabel = connectionExists ? "Manage agent connection" : "Create agent connection";

            var command = new Command
            {
                Title = $"Agent - {actionLabel}",
                Name = "azureLogicAppsStandard.openLanguageServerConnectionView",
                Arguments = Newtonsoft.Json.Linq.JArray.FromObject(new object[]
                {
                    documentUri.GetFileSystemPath(),
                    "Agent",
                    "agent",
                    "AgentConnection",
                    range,
                    connectionId ?? string.Empty,
                    mode,
                }),
            };

            codeLenses.Add(new CodeLens
            {
                Range = range,
                Command = command,
            });
        }
        catch
        {
        }

        return codeLenses;
    }

    /// <summary>
    /// Creates CodeLenses for AgentBuilder object initializations that have a ConnectionName property.
    /// Detects properties with [Agent] attribute for AI model connections.
    /// </summary>
    private async Task<IEnumerable<CodeLens>> CreateCodeLensesForAgentBuilderAsync(
        ObjectCreationExpressionSyntax objectCreation,
        SemanticModel semanticModel,
        DocumentUri documentUri)
    {
        var codeLenses = new List<CodeLens>();

        try
        {
            // Check if this is an AgentBuilder creation
            SymbolInfo symbolInfo = semanticModel.GetSymbolInfo(objectCreation);
            if (symbolInfo.Symbol is not IMethodSymbol constructor)
            {
                return codeLenses;
            }

            INamedTypeSymbol? typeSymbol = constructor.ContainingType;
            if (typeSymbol?.Name.Contains("AgentBuilder", StringComparison.Ordinal) != true)
            {
                return codeLenses;
            }

            // Check if it's from the SDK
            if (!IsSymbolFromSdk(typeSymbol))
            {
                return codeLenses;
            }

            // Look for ConnectionName property in the initializer
            if (objectCreation.Initializer == null)
            {
                return codeLenses;
            }

            foreach (ExpressionSyntax expression in objectCreation.Initializer.Expressions)
            {
                if (expression is not AssignmentExpressionSyntax assignment)
                {
                    continue;
                }

                // Check if left side is ConnectionName
                if (assignment.Left is not IdentifierNameSyntax identifier ||
                    identifier.Identifier.ValueText != "ConnectionName")
                {
                    continue;
                }

                // Get the property symbol to check for [Agent] attribute
                SymbolInfo propertyInfo = semanticModel.GetSymbolInfo(identifier);
                if (propertyInfo.Symbol is not IPropertySymbol propertySymbol)
                {
                    continue;
                }

                // Verify it has the [Agent] attribute
                if (!IsAgentConnectionProperty(propertySymbol))
                {
                    continue;
                }

                // Extract connection ID from the assignment value
                string? connectionId = ExtractStringLiteralFromExpression(assignment.Right);

                // Get connector info from the [Agent] attribute
                (string? connectorType, string? connectorName) = TryGetAgentAttributeInfo(propertySymbol);

                // Create range for the assignment value (where the connection ID is)
                OmniSharp.Extensions.LanguageServer.Protocol.Models.Range range =
                    GetRangeFromSyntaxNode(assignment.Right, semanticModel.SyntaxTree);

                bool connectionExists = DoesConnectionExist(connectionId);
                string mode = connectionExists ? "manage" : "create";
                string actionLabel = connectionExists ? "Manage agent connection" : "Create agent connection";

                var command = new Command
                {
                    Title = $"AgentBuilder - {actionLabel}",
                    Name = "azureLogicAppsStandard.openLanguageServerConnectionView",
                    Arguments = Newtonsoft.Json.Linq.JArray.FromObject(new object[]
                    {
                        documentUri.GetFileSystemPath(),
                        "AgentBuilder",
                        connectorName ?? "agent",
                        connectorType ?? "AgentConnection",
                        range,
                        connectionId ?? string.Empty,
                        mode,
                    }),
                };

                codeLenses.Add(new CodeLens
                {
                    Range = range,
                    Command = command,
                });
            }
        }
        catch
        {
            // Silently ignore errors
        }

        return codeLenses;
    }

    /// <summary>
    /// Extracts Type and ConnectorName from [Agent] attribute.
    /// </summary>
    private static (string? ConnectorType, string? ConnectorName) TryGetAgentAttributeInfo(IPropertySymbol property)
    {
        string? connectorType = null;
        string? connectorName = null;

        foreach (AttributeData attr in property.GetAttributes())
        {
            string name = attr.AttributeClass?.Name ?? string.Empty;
            if (name.Equals("AgentAttribute", StringComparison.Ordinal) ||
                name.Equals("Agent", StringComparison.Ordinal))
            {
                // Extract named arguments
                foreach (KeyValuePair<string, TypedConstant> kvp in attr.NamedArguments)
                {
                    string key = kvp.Key;

                    if (key.Equals("ConnectorName", StringComparison.Ordinal))
                    {
                        if (kvp.Value.Value is string s && !string.IsNullOrWhiteSpace(s))
                        {
                            connectorName = s;
                        }
                    }
                    else if (key.Equals("Type", StringComparison.Ordinal))
                    {
                        connectorType = GetEnumNameOrValue(kvp.Value);
                    }
                }

                // Extract constructor arguments if needed
                if (connectorType == null || connectorName == null)
                {
                    foreach (TypedConstant tc in attr.ConstructorArguments)
                    {
                        if (tc.Value is string s && !string.IsNullOrWhiteSpace(s))
                        {
                            connectorName ??= s;
                        }
                        else
                        {
                            connectorType ??= GetEnumNameOrValue(tc);
                        }
                    }
                }

                break;
            }
        }

        return (connectorType, connectorName);
    }

    /// <summary>
    /// Extracts a string literal value from an expression.
    /// </summary>
    private static string? ExtractStringLiteralFromExpression(ExpressionSyntax expression)
    {
        // Direct string literal: "connectionName"
        if (expression is LiteralExpressionSyntax literal &&
            literal.Token.IsKind(SyntaxKind.StringLiteralToken))
        {
            return literal.Token.ValueText;
        }

        // Could add more cases here if needed (e.g., const references, variable lookups)
        return null;
    }

    private async Task<IEnumerable<CodeLens>> CreateCodeLensesForMethodAsync(MethodDeclarationSyntax methodDeclaration, SemanticModel semanticModel)
    {
        var codeLenses = new List<CodeLens>();

        try
        {
            // Check if this method uses SDK types
            bool usingsSdk = MethodUsesSdk(methodDeclaration, semanticModel);
            if (!usingsSdk)
            {
                return codeLenses;
            }

            // Create a range for the method declaration
            OmniSharp.Extensions.LanguageServer.Protocol.Models.Range range = GetRangeFromSyntaxNode(methodDeclaration, semanticModel.SyntaxTree);

            var actions = new List<Command>();

            // Create a separate CodeLens for each action
            foreach (Command action in actions)
            {
                codeLenses.Add(new CodeLens
                {
                    Range = range,
                    Command = action,
                });
            }
        }
        catch
        {
        }

        return codeLenses;
    }

    private bool MethodUsesSdk(MethodDeclarationSyntax method, SemanticModel semanticModel)
    {
        if (sdkMetadataIndex == null)
        {
            return false;
        }

        // Check if any expressions in the method use SDK types
        IEnumerable<ExpressionSyntax> expressions = method.DescendantNodes().OfType<ExpressionSyntax>();
        foreach (ExpressionSyntax expression in expressions)
        {
            SymbolInfo symbolInfo = semanticModel.GetSymbolInfo(expression);
            ISymbol? symbol = symbolInfo.Symbol ?? symbolInfo.CandidateSymbols.FirstOrDefault();
            if (symbol != null && IsSymbolFromSdk(symbol))
            {
                return true;
            }
        }

        return false;
    }

    private (string? ConnectorType, string? ConnectorName) TryGetConnectorOperationInfo(IMethodSymbol method)
    {
        string? connectorType = null;
        string? connectorName = null;

        foreach (AttributeData attr in method.GetAttributes())
        {
            string name = attr.AttributeClass?.Name ?? string.Empty;
            if (name.Equals("ConnectorOperationAttribute", StringComparison.Ordinal) ||
                name.Equals("ConnectorOperation", StringComparison.Ordinal))
            {
                // Named arguments first: Type and ConnectorName
                try
                {
                    foreach (KeyValuePair<string, TypedConstant> kvp in attr.NamedArguments)
                    {
                        string key = kvp.Key;

                        if (key.Equals("ConnectorName", StringComparison.Ordinal) ||
                            key.Equals("Connector", StringComparison.Ordinal) ||
                            key.EndsWith("ConnectorName", StringComparison.Ordinal))
                        {
                            if (kvp.Value.Value is string s && !string.IsNullOrWhiteSpace(s))
                            {
                                connectorName = s;
                            }
                        }
                        else if (key.Equals("Type", StringComparison.Ordinal) ||
                                 key.Equals("ConnectorType", StringComparison.Ordinal) ||
                                 key.EndsWith("Type", StringComparison.Ordinal))
                        {
                            connectorType = GetEnumNameOrValue(kvp.Value);
                        }
                    }
                }
                catch
                { /* ignore logging failures */
                }

                // Fallback: infer from constructor args (prefer parameter names when available)
                try
                {
                    int argc = attr.ConstructorArguments.Length;
                    IMethodSymbol? ctor = attr.AttributeConstructor;
                    for (int i = 0; i < argc; i++)
                    {
                        TypedConstant tc = attr.ConstructorArguments[i];
                        string? paramName = (i < (ctor?.Parameters.Length ?? 0)) ? ctor!.Parameters[i].Name : null;

                        // Use parameter name when available
                        if (!string.IsNullOrEmpty(paramName))
                        {
                            if (paramName.Equals("type", StringComparison.OrdinalIgnoreCase) || paramName.EndsWith("Type", StringComparison.Ordinal))
                            {
                                connectorType ??= GetEnumNameOrValue(tc) ?? tc.Value?.ToString();
                                continue;
                            }

                            if (paramName.Equals("connectorName", StringComparison.OrdinalIgnoreCase) || paramName.EndsWith("ConnectorName", StringComparison.Ordinal))
                            {
                                if (tc.Value is string s1 && !string.IsNullOrWhiteSpace(s1))
                                {
                                    connectorName ??= s1;
                                }

                                continue;
                            }
                        }

                        // Generic positional inference: strings look like connector names; other values represent the enum
                        if (tc.Value is string s && !string.IsNullOrWhiteSpace(s))
                        {
                            connectorName ??= s;
                        }
                        else
                        {
                            connectorType ??= GetEnumNameOrValue(tc) ?? tc.Value?.ToString();
                        }
                    }
                }
                catch
                { /* ignore logging failures */
                }

                break;
            }
        }

        // If Roslyn metadata didn't include values, try metadata-only reflection from SDK assemblies
        if (connectorType is null && connectorName is null)
        {
            try
            {
                (connectorType, connectorName) = TryGetConnectorOperationInfoViaMetadata(method);

                // Keep silent; metadata-only extraction is internal
            }
            catch
            { /* ignore reflection failures */
            }
        }

        // As a last resort, attempt runtime reflection load (may fail due to deps)
        // Runtime reflection path removed to reduce overhead and side effects
        return (connectorType, connectorName);
    }

    private (string? ConnectorType, string? ConnectorName) TryGetConnectorOperationInfoViaMetadata(IMethodSymbol method)
    {
        if (sdkMetadataIndex is null)
        {
            return (null, null);
        }

        string? targetAsmName = method.ContainingAssembly?.Name;
        IEnumerable<string> candidateAsmPaths = sdkMetadataIndex.AssemblyPaths;
        if (!string.IsNullOrWhiteSpace(targetAsmName))
        {
            candidateAsmPaths = candidateAsmPaths.OrderByDescending(p => string.Equals(Path.GetFileNameWithoutExtension(p), targetAsmName, StringComparison.OrdinalIgnoreCase));
        }

        try
        {
            string coreDir = System.Runtime.InteropServices.RuntimeEnvironment.GetRuntimeDirectory();
            string[] core = Directory.GetFiles(coreDir, "*.dll", SearchOption.TopDirectoryOnly);
            using var mlc = new MetadataLoadContext(new PathAssemblyResolver(core.Concat(sdkMetadataIndex.AssemblyPaths)));

            string? fullTypeName = BuildReflectionFullTypeName(method.ContainingType);
            if (string.IsNullOrWhiteSpace(fullTypeName))
            {
                return (null, null);
            }

            foreach (string asmPath in candidateAsmPaths)
            {
                try
                {
                    Assembly asm = mlc.LoadFromAssemblyPath(asmPath);
                    Type? t = asm.GetType(fullTypeName, throwOnError: false);
                    if (t is null)
                    {
                        continue;
                    }

                    IEnumerable<MethodInfo> methods = t.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                                   .Where(mi => mi.Name == method.Name && mi.GetParameters().Length == method.Parameters.Length);

                    foreach (MethodInfo? mi in methods)
                    {
                        foreach (CustomAttributeData cad in mi.GetCustomAttributesData())
                        {
                            string an = cad.AttributeType.Name;
                            if (an.Equals("ConnectorOperationAttribute", StringComparison.Ordinal) || an.Equals("ConnectorOperation", StringComparison.Ordinal))
                            {
                                string? ctype = null;
                                string? cname = null;

                                // Named
                                foreach (CustomAttributeNamedArgument na in cad.NamedArguments)
                                {
                                    string key = na.MemberName;
                                    if (key.Equals("ConnectorName", StringComparison.Ordinal) || key.Equals("Connector", StringComparison.Ordinal) || key.EndsWith("ConnectorName", StringComparison.Ordinal))
                                    {
                                        if (na.TypedValue.Value is string s && !string.IsNullOrWhiteSpace(s))
                                        {
                                            cname = s;
                                        }
                                    }
                                    else if (key.Equals("Type", StringComparison.Ordinal) || key.Equals("ConnectorType", StringComparison.Ordinal) || key.EndsWith("Type", StringComparison.Ordinal))
                                    {
                                        ctype = GetEnumNameFromAttributeMember(cad.AttributeType, key, na.TypedValue) ?? GetEnumName(na.TypedValue);
                                    }
                                }

                                // Positional
                                ParameterInfo[] parameters = cad.Constructor.GetParameters();
                                for (int i = 0; i < cad.ConstructorArguments.Count; i++)
                                {
                                    CustomAttributeTypedArgument arg = cad.ConstructorArguments[i];
                                    string? pname = (i < parameters.Length) ? parameters[i].Name : null;
                                    if (!string.IsNullOrEmpty(pname))
                                    {
                                        if (pname.Equals("type", StringComparison.OrdinalIgnoreCase) || pname.EndsWith("Type", StringComparison.Ordinal))
                                        {
                                            ctype ??= GetEnumNameFromParameter(parameters[i], arg) ?? GetEnumName(arg);
                                            continue;
                                        }

                                        if (pname.Equals("connectorName", StringComparison.OrdinalIgnoreCase) || pname.EndsWith("ConnectorName", StringComparison.Ordinal))
                                        {
                                            if (arg.Value is string s && !string.IsNullOrWhiteSpace(s))
                                            {
                                                cname ??= s;
                                            }

                                            continue;
                                        }
                                    }

                                    if (arg.ArgumentType.IsEnum)
                                    {
                                        ctype ??= GetEnumName(arg);
                                    }
                                    else if (arg.Value is string s2)
                                    {
                                        cname ??= s2;
                                    }
                                }

                                return (ctype, cname);
                            }
                        }
                    }
                }
                catch
                {
                    // continue to next
                }
            }
        }
        catch
        {
            // ignore
        }

        return (null, null);
    }

    private bool IsSymbolFromSdk(ISymbol symbol)
    {
        if (sdkMetadataIndex == null)
        {
            return false;
        }

        string? assemblyName = symbol.ContainingAssembly?.Name;
        if (assemblyName == null)
        {
            return false;
        }

        // Check if any SDK assembly matches
        return sdkMetadataIndex.AssemblyPaths.Any(path =>
            Path.GetFileNameWithoutExtension(path)
                .Equals(assemblyName, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Extracts the Value property from an [EnumMember(Value = "...")] attribute if present.
    /// Returns null if the attribute is not found or has no Value property.
    /// Used by CodeLens to display API values for Input enums alongside C# enum names.
    /// </summary>
    private static string? GetEnumMemberAttributeValueFromSymbol(IFieldSymbol member)
    {
        foreach (AttributeData attr in member.GetAttributes())
        {
            string attrName = attr.AttributeClass?.Name ?? string.Empty;

            // Check for EnumMemberAttribute or EnumMember
            if (attrName.Equals("EnumMemberAttribute", StringComparison.Ordinal) ||
                attrName.Equals("EnumMember", StringComparison.Ordinal))
            {
                // Look for the Value named argument
                foreach (KeyValuePair<string, TypedConstant> namedArg in attr.NamedArguments)
                {
                    if (namedArg.Key == "Value" && namedArg.Value.Value is string value)
                    {
                        return value;
                    }
                }
            }
        }

        return null;
    }
}
