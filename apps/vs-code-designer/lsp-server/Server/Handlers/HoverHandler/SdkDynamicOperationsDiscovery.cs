using System.Text.RegularExpressions;

using ICSharpCode.Decompiler;
using ICSharpCode.Decompiler.CSharp;
using ICSharpCode.Decompiler.TypeSystem;

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace LogicAppsLanguageServer.Handlers.HoverHandler;

/// <summary>
/// Discovers dynamic operations from SDK assemblies using Roslyn's metadata API.
/// This avoids dependency loading issues by using MetadataReferences instead of Assembly.Load().
/// </summary>
internal static partial class SdkDynamicOperationsDiscovery
{
    private static Dictionary<string, DynamicOperationMetadata>? cachedOperations;
    private static readonly object LockObject = new();

    /// <summary>
    /// Discovers all dynamic operations from the SDK assemblies using Roslyn's metadata API.
    /// </summary>
    /// <returns>A dictionary of discovered dynamic operations where the key is in the format "connector:operation" and the value contains the operation metadata.</returns>
    public static Dictionary<string, DynamicOperationMetadata> DiscoverOperations(WorkflowSdkMetadataIndex? sdkMetadataIndex)
    {
        lock (LockObject)
        {
            if (cachedOperations != null)
            {
                return cachedOperations;
            }

            cachedOperations = new Dictionary<string, DynamicOperationMetadata>(StringComparer.OrdinalIgnoreCase);

            if (sdkMetadataIndex == null)
            {
                Console.Error.WriteLine("[SdkDynamicOperationsDiscovery] ❌ No SDK index available");
                return cachedOperations;
            }

            // Create a Roslyn compilation to access SDK metadata
            try
            {
                CSharpCompilation compilation = CreateCompilationWithSdk(sdkMetadataIndex);
                DiscoverFromCompilation(compilation, cachedOperations);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] ❌ Error during discovery: {ex.Message}");
            }

            return cachedOperations;
        }
    }

    /// <summary>
    /// Creates a Roslyn compilation with SDK assemblies as metadata references.
    /// </summary>
    private static CSharpCompilation CreateCompilationWithSdk(WorkflowSdkMetadataIndex sdkMetadataIndex)
    {
        var references = new List<MetadataReference>();
        var seenPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Add core .NET references
        AddCoreReferences(references, seenPaths);

        // Add SDK assemblies as metadata references
        foreach (string assemblyPath in sdkMetadataIndex.AssemblyPaths)
        {
            if (File.Exists(assemblyPath) && !seenPaths.Contains(assemblyPath))
            {
                try
                {
                    references.Add(MetadataReference.CreateFromFile(assemblyPath));
                    seenPaths.Add(assemblyPath);
                    Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] Added SDK reference: {Path.GetFileName(assemblyPath)}");
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] Failed to add reference {Path.GetFileName(assemblyPath)}: {ex.Message}");
                }
            }
        }

        // Create empty compilation just to access metadata
        SyntaxTree syntaxTree = CSharpSyntaxTree.ParseText("// Discovery compilation");
        return CSharpCompilation.Create(
            "DiscoveryCompilation",
            [syntaxTree],
            references);
    }

    private static void AddCoreReferences(List<MetadataReference> references, HashSet<string> seenPaths)
    {
        string[] trustedAssemblies = ((string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") ?? string.Empty)
            .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries);

        foreach (string assemblyPath in trustedAssemblies)
        {
            string fileName = Path.GetFileName(assemblyPath);
            if (fileName.StartsWith("System.") ||
                fileName.StartsWith("mscorlib") ||
                fileName.StartsWith("netstandard"))
            {
                if (!seenPaths.Contains(assemblyPath))
                {
                    try
                    {
                        references.Add(MetadataReference.CreateFromFile(assemblyPath));
                        seenPaths.Add(assemblyPath);
                    }
                    catch
                    {
                    }
                }
            }
        }
    }

    /// <summary>
    /// Discovers dynamic operations from the Roslyn compilation AND decompiles method bodies to extract API paths.
    /// </summary>
    private static void DiscoverFromCompilation(CSharpCompilation compilation, Dictionary<string, DynamicOperationMetadata> operations)
    {
        int typesProcessed = 0;
        int methodsProcessed = 0;
        int operationsFound = 0;

        // Also prepare for IL decompilation
        Dictionary<string, CSharpDecompiler> decompilers = [];

        foreach (IAssemblySymbol? assemblySymbol in compilation.References.Select(r => compilation.GetAssemblyOrModuleSymbol(r) as IAssemblySymbol).Where(s => s != null)!)
        {
            if (!assemblySymbol.Name.Contains("Workflows.Sdk"))
            {
                continue;
            }

            // Create decompiler for this assembly to extract API paths from method bodies
            string? assemblyPath = GetAssemblyPath(assemblySymbol, compilation);
            if (!string.IsNullOrEmpty(assemblyPath) && File.Exists(assemblyPath))
            {
                try
                {
                    decompilers[assemblySymbol.Name] = new CSharpDecompiler(assemblyPath, new DecompilerSettings
                    {
                        ThrowOnAssemblyResolveErrors = false,
                    });
                    Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] Created decompiler for {Path.GetFileName(assemblyPath)}");
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] Failed to create decompiler: {ex.Message}");
                }
            }

            ProcessNamespace(assemblySymbol.GlobalNamespace, operations, decompilers, assemblySymbol.Name, ref typesProcessed, ref methodsProcessed, ref operationsFound);
        }
    }

    private static string? GetAssemblyPath(IAssemblySymbol assemblySymbol, CSharpCompilation compilation)
    {
        foreach (MetadataReference reference in compilation.References)
        {
            if (SymbolEqualityComparer.Default.Equals(compilation.GetAssemblyOrModuleSymbol(reference), assemblySymbol))
            {
                return reference.Display;
            }
        }

        return null;
    }

    private static void ProcessNamespace(INamespaceSymbol namespaceSymbol, Dictionary<string, DynamicOperationMetadata> operations, Dictionary<string, CSharpDecompiler> decompilers, string assemblyName, ref int typesProcessed, ref int methodsProcessed, ref int operationsFound)
    {
        // Collect all dynamic operations referenced across all types
        var allDynamicOperations = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var connectorsByOperation = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var allTypes = new List<INamedTypeSymbol>();

        CollectTypesAndOperations(namespaceSymbol, allTypes, allDynamicOperations, connectorsByOperation, ref typesProcessed, ref methodsProcessed);

        // Now search for implementation methods across all types
        FindImplementations(allTypes, allDynamicOperations, connectorsByOperation, operations, decompilers, assemblyName, ref operationsFound);
    }

    private static void CollectTypesAndOperations(INamespaceSymbol namespaceSymbol, List<INamedTypeSymbol> allTypes, HashSet<string> allDynamicOperations, Dictionary<string, string> connectorsByOperation, ref int typesProcessed, ref int methodsProcessed)
    {
        foreach (INamespaceOrTypeSymbol member in namespaceSymbol.GetMembers())
        {
            if (member is INamespaceSymbol childNamespace)
            {
                CollectTypesAndOperations(childNamespace, allTypes, allDynamicOperations, connectorsByOperation, ref typesProcessed, ref methodsProcessed);
            }
            else if (member is INamedTypeSymbol typeSymbol)
            {
                typesProcessed++;
                allTypes.Add(typeSymbol);

                // Collect all operations from this type
                foreach (Microsoft.CodeAnalysis.ISymbol methodMember in typeSymbol.GetMembers())
                {
                    if (methodMember is IMethodSymbol methodSymbol)
                    {
                        methodsProcessed++;

                        string? connectorName = GetConnectorName(methodSymbol);
                        if (string.IsNullOrEmpty(connectorName))
                        {
                            continue;
                        }

                        foreach (IParameterSymbol parameter in methodSymbol.Parameters)
                        {
                            string? operationName = GetDynamicValuesOperation(parameter);
                            if (!string.IsNullOrEmpty(operationName))
                            {
                                allDynamicOperations.Add(operationName);
                                connectorsByOperation[operationName] = connectorName;
                            }
                        }
                    }
                }
            }
        }
    }

    private static void FindImplementations(List<INamedTypeSymbol> allTypes, HashSet<string> allDynamicOperations, Dictionary<string, string> connectorsByOperation, Dictionary<string, DynamicOperationMetadata> operations, Dictionary<string, CSharpDecompiler> decompilers, string assemblyName, ref int operationsFound)
    {
        // Search across ALL types for methods matching operation names
        foreach (string operationName in allDynamicOperations)
        {
            string connectorName = connectorsByOperation[operationName];
            string key = $"{connectorName.ToLowerInvariant()}:{operationName}";

            if (operations.ContainsKey(key))
            {
                continue;
            }

            bool found = false;

            // Search all types for a method matching this operation name
            foreach (INamedTypeSymbol typeSymbol in allTypes)
            {
                foreach (Microsoft.CodeAnalysis.ISymbol member in typeSymbol.GetMembers())
                {
                    if (member is IMethodSymbol methodSymbol)
                    {
                        if (methodSymbol.Name.Equals(operationName, StringComparison.OrdinalIgnoreCase))
                        {
                            DynamicOperationMetadata? metadata = ExtractMetadataFromMethodBody(methodSymbol, operationName, decompilers, assemblyName) ?? InferOperationMetadata(connectorName, operationName);

                            if (metadata != null)
                            {
                                operations[key] = metadata;
                                operationsFound++;
                                found = true;
                                break;
                            }
                        }
                    }
                }

                if (found)
                {
                    break;
                }
            }

            if (!found)
            {
                // Try loading from JSON config as fallback
                DynamicOperationMetadata? metadata = InferOperationMetadata(connectorName, operationName);
                if (metadata != null)
                {
                    operations[key] = metadata;
                    operationsFound++;
                }
            }
        }
    }

    private static string? GetConnectorName(IMethodSymbol methodSymbol)
    {
        foreach (AttributeData attr in methodSymbol.GetAttributes())
        {
            if (attr.AttributeClass?.Name == "ConnectorOperationAttribute" ||
                attr.AttributeClass?.Name == "ConnectorOperation")
            {
                foreach (KeyValuePair<string, TypedConstant> namedArg in attr.NamedArguments)
                {
                    if (namedArg.Key == "ConnectorName")
                    {
                        return namedArg.Value.Value?.ToString();
                    }
                }
            }
        }

        return null;
    }

    private static string? GetDynamicValuesOperation(IParameterSymbol parameter)
    {
        foreach (AttributeData attr in parameter.GetAttributes())
        {
            if (attr.AttributeClass?.Name == "DynamicValuesAttribute" ||
                attr.AttributeClass?.Name == "DynamicValues")
            {
                if (attr.ConstructorArguments.Length > 0)
                {
                    return attr.ConstructorArguments[0].Value?.ToString();
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Extracts API metadata by decompiling the method body and analyzing the code.
    /// Looks for patterns like: string path = "/api/path"; string method = "GET".
    /// </summary>
    private static DynamicOperationMetadata? ExtractMetadataFromMethodBody(IMethodSymbol methodSymbol, string operationName, Dictionary<string, CSharpDecompiler> decompilers, string assemblyName)
    {
        if (!decompilers.TryGetValue(assemblyName, out CSharpDecompiler? decompiler))
        {
            return null;
        }

        try
        {
            // Get the full type name to find the method in the decompiler
            INamedTypeSymbol containingType = methodSymbol.ContainingType;
            string fullTypeName = GetFullTypeName(containingType);

            // Find the type handle in the decompiled assembly
            ITypeDefinition typeHandle = decompiler.TypeSystem.MainModule.GetTypeDefinition(new FullTypeName(fullTypeName));
            if (typeHandle == null)
            {
                return null;
            }

            // Find the method
            var methods = typeHandle.Methods.Where(m => m.Name == methodSymbol.Name).ToList();
            if (methods.Count == 0)
            {
                return null;
            }

            // Decompile the method
            IMethod methodHandle = methods[0];
            string decompiledCode = decompiler.DecompileAsString(methodHandle.MetadataToken);

            // Extract API path and method from decompiled code
            DynamicOperationMetadata? metadata = ParseDecompiledCode(decompiledCode, operationName);
            if (metadata != null)
            {
                Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] ✅ Extracted from IL: {methodSymbol.Name} → {metadata.Method} {metadata.Path}");
            }

            return metadata;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] Failed to decompile {methodSymbol.Name}: {ex.Message}");
            return null;
        }
    }

    private static string GetFullTypeName(INamedTypeSymbol typeSymbol)
    {
        var parts = new List<string>();
        INamedTypeSymbol current = typeSymbol;

        while (current != null)
        {
            parts.Insert(0, current.Name);
            current = current.ContainingType;
        }

        var namespaceParts = new List<string>();
        INamespaceSymbol ns = typeSymbol.ContainingNamespace;
        while (ns?.IsGlobalNamespace == false)
        {
            namespaceParts.Insert(0, ns.Name);
            ns = ns.ContainingNamespace;
        }

        return namespaceParts.Count > 0 ? string.Join(".", namespaceParts) + "." + string.Join("+", parts) : string.Join("+", parts);
    }

    /// <summary>
    /// Parses decompiled C# code to extract API path and HTTP method.
    /// Looks for patterns like:
    ///   - path = "/api/forms"
    ///   - method = "GET"
    ///   - new DynamicInvokeRequest { Path = "/api/path", Method = "get" }.
    /// </summary>
    private static DynamicOperationMetadata? ParseDecompiledCode(string code, string operationName)
    {
        string? path = null;
        string? method = null;

        // Pattern 1: Look for string literals that look like API paths (start with /)
        MatchCollection pathMatches = ApiRegex().Matches(code);
        foreach (System.Text.RegularExpressions.Match match in pathMatches.Cast<Match>())
        {
            string candidate = match.Groups[1].Value;

            // API paths typically start with / and contain common patterns
            if (candidate.StartsWith("/") &&
                (candidate.Contains("api") || candidate.Contains("beta") || candidate.Contains("v2") ||
                 candidate.Contains("datasets") || candidate.Contains("forms") || candidate.Contains("trigger")))
            {
                path = candidate;
                break;
            }
        }

        // Pattern 2: Look for HTTP method (GET, POST, PUT, DELETE, PATCH)
        MatchCollection methodMatches = HTTPMethodsRegex().Matches(code);
        if (methodMatches.Count > 0)
        {
            method = methodMatches[0].Groups[1].Value.ToUpperInvariant();
        }

        // Pattern 3: Look for Method property assignments
        Match methodPropertyMatch = MethodPropertyRegex().Match(code);
        if (methodPropertyMatch.Success)
        {
            method = methodPropertyMatch.Groups[1].Value.ToUpperInvariant();
        }

        // Pattern 4: Look for Path property assignments
        Match pathPropertyMatch = PathPropertyRegex().Match(code);
        if (pathPropertyMatch.Success)
        {
            path = pathPropertyMatch.Groups[1].Value;
        }

        return path != null
            ? new DynamicOperationMetadata
            {
                Path = path,
                Method = method ?? "GET", // Default to GET if not found
                QueryParameters = [],
            }
            : null;
    }

    /// <summary>
    /// Fallback when IL decompilation fails - loads from JSON configuration file.
    /// All metadata should ideally come from decompiled method bodies, but for dynamic values operations
    /// that don't have corresponding SDK methods, we load from a configuration file.
    /// </summary>
    private static DynamicOperationMetadata? InferOperationMetadata(string connectorName, string operationName)
    {
        // Try to load from JSON configuration file
        string key = $"{connectorName.ToLowerInvariant()}:{operationName}";
        Dictionary<string, DynamicOperationMetadata> config = LoadDynamicOperationsConfig();

        if (config.TryGetValue(key, out DynamicOperationMetadata? metadata))
        {
            Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] ✅ Loaded from config: {key}");
            return metadata;
        }

        return null;
    }

    private static Dictionary<string, DynamicOperationMetadata>? cachedConfig;

    private static Dictionary<string, DynamicOperationMetadata> LoadDynamicOperationsConfig()
    {
        if (cachedConfig != null)
        {
            return cachedConfig;
        }

        cachedConfig = new Dictionary<string, DynamicOperationMetadata>(StringComparer.OrdinalIgnoreCase);

        try
        {
            string baseDir = AppContext.BaseDirectory;
            string configPath = Path.Combine(baseDir, "Handlers", "HoverHandler", "DynamicOperationsMetadata.json");

            if (!File.Exists(configPath))
            {
                string handlersDir = Path.Combine(baseDir, "Handlers");
                if (Directory.Exists(handlersDir))
                {
                    string[] files = Directory.GetFiles(handlersDir, "*.json", SearchOption.AllDirectories);
                    foreach (string f in files)
                    {
                        Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery]   - {f}");
                    }
                }

                return cachedConfig;
            }

            string json = File.ReadAllText(configPath);

            Dictionary<string, JsonOperationMetadata>? config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, JsonOperationMetadata>>(json);

            if (config != null)
            {
                foreach (KeyValuePair<string, JsonOperationMetadata> kvp in config)
                {
                    cachedConfig[kvp.Key] = new DynamicOperationMetadata
                    {
                        Path = kvp.Value.Path,
                        Method = kvp.Value.Method,
                        QueryParameters = kvp.Value.Queries ?? [],
                    };
                }

                Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] ✅ Loaded {cachedConfig.Count} operations from config file");
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] ❌ Failed to load config: {ex.Message}");
            Console.Error.WriteLine($"[SdkDynamicOperationsDiscovery] StackTrace: {ex.StackTrace}");
        }

        return cachedConfig;
    }

    public static void ClearCache()
    {
        lock (LockObject)
        {
            cachedOperations = null;
        }
    }

    private class JsonOperationMetadata
    {
        [System.Text.Json.Serialization.JsonPropertyName("path")]
        public string Path { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("method")]
        public string Method { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("queries")]
        public Dictionary<string, string>? Queries { get; set; }
    }

    [GeneratedRegex(@"""(/[^""]+)""")]
    private static partial Regex ApiRegex();

    [GeneratedRegex(@"""(GET|POST|PUT|DELETE|PATCH|get|post|put|delete|patch)""", RegexOptions.IgnoreCase, "en-US")]
    private static partial Regex HTTPMethodsRegex();

    [GeneratedRegex(@"Method\s*=\s*""([^""]+)""", RegexOptions.IgnoreCase, "en-US")]
    private static partial Regex MethodPropertyRegex();

    [GeneratedRegex(@"Path\s*=\s*""([^""]+)""")]
    private static partial Regex PathPropertyRegex();
}
