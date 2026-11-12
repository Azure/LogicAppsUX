using MediatR;

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

using OmniSharp.Extensions.JsonRpc;
using OmniSharp.Extensions.LanguageServer.Protocol;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;
using OmniSharp.Extensions.LanguageServer.Protocol.Server;

namespace SdkLspServer.Handlers;

/// <summary>
/// Handler for custom/getWorkflowMetadata request.
/// Analyzes workflow code to extract metadata about triggers and actions.
/// </summary>
[Method("custom/getWorkflowMetadata")]
public class GetWorkflowMetadataHandler(BufferManager bufferManager, SdkIndex? sdkIndex) :
    IJsonRpcRequestHandler<GetWorkflowMetadataParams, GetWorkflowMetadataResponse>
{
    private readonly BufferManager bufferManager = bufferManager;
    private readonly SdkIndex? sdkIndex = sdkIndex;

    public void SetParams(GetWorkflowMetadataParams value)
    {
        // Not used in this implementation
    }

    public async Task<GetWorkflowMetadataResponse> Handle(GetWorkflowMetadataParams request, CancellationToken cancellationToken)
    {
        await Console.Error.WriteLineAsync("[GetWorkflowMetadataHandler] ✅ Handle method called");
        await Console.Error.WriteLineAsync($"[GetWorkflowMetadataHandler] Request: DocumentUri={request.DocumentUri}, Uri={request.Uri}");

        try
        {
            // Support both DocumentUri and Uri properties
            string? documentPath = request.DocumentUri?.ToString() ?? request.Uri;
            await Console.Error.WriteLineAsync($"[GetWorkflowMetadataHandler] Resolved documentPath: {documentPath}");

            if (string.IsNullOrEmpty(documentPath))
            {
                return new GetWorkflowMetadataResponse
                {
                    Error = "No document URI provided",
                };
            }

            // Get document content from buffer
            string? documentText = bufferManager.GetBuffer(documentPath);
            if (string.IsNullOrEmpty(documentText))
            {
                // Fallback: try to read from disk
                try
                {
                    // Parse the URI to get file path
                    var uri = new Uri(documentPath);
                    if (uri.Scheme == "file")
                    {
                        string filePath = uri.LocalPath;
                        documentText = await File.ReadAllTextAsync(filePath, cancellationToken);
                    }
                    else
                    {
                        return new GetWorkflowMetadataResponse
                        {
                            Error = "Not a file URI",
                        };
                    }
                }
                catch (Exception ex)
                {
                    return new GetWorkflowMetadataResponse
                    {
                        Error = $"Failed to read file: {ex.Message}",
                    };
                }
            }

            // Parse the document
            SyntaxTree tree = CSharpSyntaxTree.ParseText(documentText, cancellationToken: cancellationToken);
            CompilationUnitSyntax root = tree.GetCompilationUnitRoot(cancellationToken);

            // Create compilation with SDK references for semantic analysis
            CSharpCompilation? compilation = CreateCompilationWithSdkReferences(tree);

            // If position is provided, analyze specific invocation
            if (request.Line.HasValue && request.Character.HasValue)
            {
                Microsoft.CodeAnalysis.Text.SourceText text = await tree.GetTextAsync(cancellationToken);

                // Find the position
                if (request.Line.Value >= text.Lines.Count)
                {
                    return new GetWorkflowMetadataResponse
                    {
                        Error = $"Line {request.Line} is out of range",
                    };
                }

                Microsoft.CodeAnalysis.Text.TextLine line = text.Lines[request.Line.Value];
                if (request.Character.Value >= line.Span.Length)
                {
                    return new GetWorkflowMetadataResponse
                    {
                        Error = $"Character {request.Character} is out of range",
                    };
                }

                int absolutePosition = line.Start + request.Character.Value;
                SyntaxNode? node = root.FindNode(Microsoft.CodeAnalysis.Text.TextSpan.FromBounds(absolutePosition, absolutePosition));

                if (node == null)
                {
                    return new GetWorkflowMetadataResponse
                    {
                        Error = "No syntax node found at the specified position",
                    };
                }

                // Find the nearest invocation expression (trigger or action)
                InvocationExpressionSyntax? invocation = node.FirstAncestorOrSelf<InvocationExpressionSyntax>();
                if (invocation == null)
                {
                    return new GetWorkflowMetadataResponse
                    {
                        Error = "Not inside a method invocation",
                    };
                }

                // Analyze the invocation to extract metadata
                var response = AnalyzeInvocation(invocation, compilation);
                response.WorkflowName = ExtractWorkflowName(root);
                return response;
            }
            else
            {
                // No position provided - analyze entire file for workflow metadata
                await Console.Error.WriteLineAsync("[GetWorkflowMetadataHandler] Analyzing entire workflow");
                var response = await AnalyzeEntireWorkflowAsync(root, compilation);
                await Console.Error.WriteLineAsync($"[GetWorkflowMetadataHandler] ✅ Returning: WorkflowName={response.WorkflowName}, TriggerName={response.TriggerName}");
                return response;
            }
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[GetWorkflowMetadataHandler] ❌ Exception: {ex.Message}");
            await Console.Error.WriteLineAsync($"[GetWorkflowMetadataHandler] StackTrace: {ex.StackTrace}");
            return new GetWorkflowMetadataResponse
            {
                Error = $"Internal error: {ex.Message}",
            };
        }
    }

    /// <summary>
    /// Creates a Roslyn compilation with SDK assembly references for semantic analysis.
    /// </summary>
    private CSharpCompilation? CreateCompilationWithSdkReferences(SyntaxTree tree)
    {
        if (sdkIndex == null)
        {
            Console.Error.WriteLine("[CreateCompilationWithSdkReferences] sdkIndex is null - cannot create compilation");
            return null;
        }

        Console.Error.WriteLine($"[CreateCompilationWithSdkReferences] SDK loaded with {sdkIndex.AssemblyPaths.Length} assemblies");

        var references = new List<MetadataReference>();

        // Add runtime references
        string runtimeDir = Path.GetDirectoryName(typeof(object).Assembly.Location) ?? AppContext.BaseDirectory;
        string[] coreRefs =
        [
            Path.Combine(runtimeDir, "System.Runtime.dll"),
            Path.Combine(runtimeDir, "System.Console.dll"),
            Path.Combine(runtimeDir, "System.Linq.dll"),
            Path.Combine(runtimeDir, "mscorlib.dll"),
            Path.Combine(runtimeDir, "System.Private.CoreLib.dll"),
        ];

        int coreRefCount = 0;
        foreach (string refPath in coreRefs)
        {
            if (File.Exists(refPath))
            {
                references.Add(MetadataReference.CreateFromFile(refPath));
                coreRefCount++;
            }
        }

        Console.Error.WriteLine($"[CreateCompilationWithSdkReferences] Added {coreRefCount} core references");

        // Add SDK assembly references
        // Note: XML documentation is typically stored in .xml files next to the DLLs in NuGet packages
        // The ExtractRoot from SdkIndex should contain the extracted NuGet package structure
        int sdkRefCount = 0;
        foreach (string assemblyPath in sdkIndex.AssemblyPaths)
        {
            if (File.Exists(assemblyPath))
            {
                // Look for XML documentation file in the same directory as the assembly
                string xmlPath = Path.ChangeExtension(assemblyPath, ".xml");
                MetadataReference reference;

                if (File.Exists(xmlPath))
                {
                    Console.Error.WriteLine($"[CreateCompilationWithSdkReferences] Found XML doc: {Path.GetFileName(xmlPath)}");
                    try
                    {
                        var docProvider = XmlDocumentationProvider.CreateFromFile(xmlPath);
                        reference = MetadataReference.CreateFromFile(assemblyPath, documentation: docProvider);
                        Console.Error.WriteLine($"[CreateCompilationWithSdkReferences] Loaded documentation provider for {Path.GetFileName(assemblyPath)}");
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"[CreateCompilationWithSdkReferences] Failed to load XML doc: {ex.Message}");
                        reference = MetadataReference.CreateFromFile(assemblyPath);
                    }
                }
                else
                {
                    Console.Error.WriteLine($"[CreateCompilationWithSdkReferences] No XML doc for: {Path.GetFileName(assemblyPath)}");
                    reference = MetadataReference.CreateFromFile(assemblyPath);
                }

                references.Add(reference);
                sdkRefCount++;
            }
        }

        Console.Error.WriteLine($"[CreateCompilationWithSdkReferences] Added {sdkRefCount} SDK references, total {references.Count} references");

        var compilation = CSharpCompilation.Create("WorkflowAnalysis", [tree], references);
        Console.Error.WriteLine($"[CreateCompilationWithSdkReferences] Compilation created with {compilation.SyntaxTrees.Count()} syntax trees");
        Console.Error.WriteLine($"[CreateCompilationWithSdkReferences] Compilation diagnostics: {compilation.GetDiagnostics().Count()}");

        return compilation;
    }

    /// <summary>
    /// Extracts the default name from a method's "name" parameter default value.
    /// For workflow triggers/actions, the first parameter is typically "name" with a default value.
    /// Example: CreateHttpTrigger(string name = "when_an_HTTP_request_is_received", ...)
    /// </summary>
    private static string? ExtractDefaultNameFromMethod(IMethodSymbol method)
    {
        try
        {
            // Look for the first parameter named "name"
            var nameParameter = method.Parameters.FirstOrDefault(p =>
                string.Equals(p.Name, "name", StringComparison.OrdinalIgnoreCase));

            if (nameParameter != null && nameParameter.HasExplicitDefaultValue)
            {
                // The default value should be a string
                if (nameParameter.ExplicitDefaultValue is string defaultValue)
                {
                    Console.Error.WriteLine($"[ExtractDefaultNameFromMethod] Found 'name' parameter with default: '{defaultValue}'");
                    return defaultValue;
                }
            }

            Console.Error.WriteLine($"[ExtractDefaultNameFromMethod] No 'name' parameter with default value found");
            return null;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[ExtractDefaultNameFromMethod] Exception: {ex.Message}");
            return null;
        }
    }

    private static GetWorkflowMetadataResponse AnalyzeInvocation(InvocationExpressionSyntax invocation, CSharpCompilation? compilation)
    {
        var response = new GetWorkflowMetadataResponse();

        // For chained calls like .OnNewEmailAsync().WithName().WithSettings(), we need to find the actual trigger method
        // Skip over utility methods like WithName, WithSettings, etc.
        InvocationExpressionSyntax? actualTriggerInvocation = invocation;
        while (actualTriggerInvocation.Expression is MemberAccessExpressionSyntax memberAccess)
        {
            string methodName = memberAccess.Name.ToString();

            // If this is a utility method, walk back to find the actual trigger method
            if (methodName == "WithName" || methodName == "WithSettings" || methodName == "WithTimeout")
            {
                // Walk back through the expression chain to find the trigger method
                if (memberAccess.Expression is InvocationExpressionSyntax previousInvocation)
                {
                    actualTriggerInvocation = previousInvocation;
                    continue; // Continue walking back in case there are more utility methods
                }
            }

            // Not a utility method, we found the actual trigger invocation
            break;
        }

        // Extract method name from the actual trigger invocation
        if (actualTriggerInvocation.Expression is MemberAccessExpressionSyntax triggerMemberAccess)
        {
            response.MethodName = triggerMemberAccess.Name.ToString();

            // Check for WorkflowTriggers.BuiltIn.Method() or WorkflowActions.BuiltIn.Method() pattern first
            // But NOT WorkflowActions.BuiltIn.ServiceProviders.X() — that is a service provider connector.
            if (triggerMemberAccess.Expression is MemberAccessExpressionSyntax builtInAccess &&
                builtInAccess.Name.ToString() == "BuiltIn")
            {
                // builtInAccess.Expression could be either:
                // 1. IdentifierNameSyntax: "WorkflowTriggers" or "WorkflowActions"
                // 2. MemberAccessExpressionSyntax: if it's a qualified name like "Namespace.WorkflowTriggers"
                string? typeName = builtInAccess.Expression switch
                {
                    IdentifierNameSyntax identifier => identifier.Identifier.Text,
                    MemberAccessExpressionSyntax ma => ma.Name.ToString(),
                    _ => null,
                };

                if (typeName == "WorkflowTriggers" || typeName == "WorkflowActions")
                {
                    response.ElementType = typeName == "WorkflowTriggers" ? "Trigger" : "Action";
                    response.ConnectorName = "BuiltIn";
                }
            }
            else
            {
                // Walk up the chain to find connector and type (Trigger or Action)
                ExpressionSyntax current = triggerMemberAccess.Expression;

                // Look for WorkflowTriggers.Managed.ConnectorName() or WorkflowActions.Managed.ConnectorName()
                while (current != null)
                {
                    // FIRST: Check for WorkflowActions.BuiltIn.ServiceProviders.ConnectorName("conn") pattern
                    if (current is InvocationExpressionSyntax spConnInv &&
                        spConnInv.Expression is MemberAccessExpressionSyntax spConnAccess &&
                        spConnAccess.Expression is MemberAccessExpressionSyntax spContainerAccess &&
                        spContainerAccess.Name.ToString() == "ServiceProviders" &&
                        spContainerAccess.Expression is MemberAccessExpressionSyntax spBuiltInAccess &&
                        spBuiltInAccess.Name.ToString() == "BuiltIn")
                    {
                        string? rootName = spBuiltInAccess.Expression switch
                        {
                            IdentifierNameSyntax identifier => identifier.Identifier.Text,
                            MemberAccessExpressionSyntax typeAccess => typeAccess.Name.ToString(),
                            _ => null,
                        };

                        if (rootName == "WorkflowTriggers" || rootName == "WorkflowActions")
                        {
                            response.ConnectorName = spConnAccess.Name.ToString();
                            response.ElementType = rootName == "WorkflowTriggers" ? "Trigger" : "Action";

                            if (spConnInv.ArgumentList?.Arguments.Count > 0)
                            {
                                ArgumentSyntax firstArg = spConnInv.ArgumentList.Arguments[0];
                                if (firstArg.Expression is LiteralExpressionSyntax spLiteral &&
                                    spLiteral.IsKind(SyntaxKind.StringLiteralExpression))
                                {
                                    response.ConnectionId = spLiteral.Token.ValueText;
                                }
                            }

                            break;
                        }
                    }

                    // SECOND: Check for Managed pattern
                    if (current is InvocationExpressionSyntax connectorInvocation &&
                        connectorInvocation.Expression is MemberAccessExpressionSyntax connectorAccess)
                    {
                        // Extract connector name
                        response.ConnectorName = connectorAccess.Name.ToString();

                        // Extract connection ID from first argument
                        if (connectorInvocation.ArgumentList?.Arguments.Count > 0)
                        {
                            ArgumentSyntax firstArg = connectorInvocation.ArgumentList.Arguments[0];
                            if (firstArg.Expression is LiteralExpressionSyntax literal &&
                                literal.IsKind(SyntaxKind.StringLiteralExpression))
                            {
                                response.ConnectionId = literal.Token.ValueText;
                            }
                        }

                        // Check if it's Managed pattern
                        if (connectorAccess.Expression is MemberAccessExpressionSyntax managedAccess &&
                            managedAccess.Name.ToString() == "Managed")
                        {
                            // managedAccess.Expression could be either:
                            // 1. IdentifierNameSyntax: "WorkflowTriggers" or "WorkflowActions"
                            // 2. MemberAccessExpressionSyntax: if it's a qualified name like "Namespace.WorkflowTriggers"
                            string? typeName = managedAccess.Expression switch
                            {
                                IdentifierNameSyntax identifier => identifier.Identifier.Text,
                                MemberAccessExpressionSyntax typeAccess => typeAccess.Name.ToString(),
                                _ => null,
                            };

                            if (typeName == "WorkflowTriggers" || typeName == "WorkflowActions")
                            {
                                response.ElementType = typeName == "WorkflowTriggers" ? "Trigger" : "Action";
                            }
                        }

                        break;
                    }

                    // Move up the chain
                    if (current is MemberAccessExpressionSyntax ma)
                    {
                        current = ma.Expression;
                    }
                    else if (current is InvocationExpressionSyntax inv)
                    {
                        current = inv.Expression;
                    }
                    else
                    {
                        break;
                    }
                }
            }
        }
        else
        {
            // Simple invocation without member access
            response.MethodName = actualTriggerInvocation.Expression.ToString();
        }

        // Try to extract friendly name from SDK documentation
        string? friendlyName = null;
        if (compilation != null)
        {
            try
            {
                SemanticModel? semanticModel = compilation.GetSemanticModel(actualTriggerInvocation.SyntaxTree);
                if (semanticModel != null)
                {
                    SymbolInfo symbolInfo = semanticModel.GetSymbolInfo(actualTriggerInvocation);

                    Console.Error.WriteLine($"[AnalyzeInvocation] Symbol: {symbolInfo.Symbol?.ToDisplayString() ?? "null"}");
                    Console.Error.WriteLine($"[AnalyzeInvocation] CandidateReason: {symbolInfo.CandidateReason}");
                    Console.Error.WriteLine($"[AnalyzeInvocation] CandidateSymbols: {symbolInfo.CandidateSymbols.Length}");

                    if (symbolInfo.Symbol is IMethodSymbol methodSymbol)
                    {
                        Console.Error.WriteLine($"[AnalyzeInvocation] Method: {methodSymbol.ToDisplayString()}");
                        friendlyName = ExtractDefaultNameFromMethod(methodSymbol);
                        Console.Error.WriteLine($"[AnalyzeInvocation] Extracted friendly name: {friendlyName ?? "null"}");
                    }
                    else if (symbolInfo.CandidateSymbols.Length > 0 && symbolInfo.CandidateSymbols[0] is IMethodSymbol candidateMethod)
                    {
                        // Try candidate symbols if direct symbol resolution failed
                        Console.Error.WriteLine($"[AnalyzeInvocation] Using candidate symbol: {candidateMethod.ToDisplayString()}");
                        friendlyName = ExtractDefaultNameFromMethod(candidateMethod);
                        Console.Error.WriteLine($"[AnalyzeInvocation] Extracted friendly name from candidate: {friendlyName ?? "null"}");
                    }
                }
                else
                {
                    Console.Error.WriteLine("[AnalyzeInvocation] SemanticModel is null");
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AnalyzeInvocation] Exception during semantic analysis: {ex.Message}");

                // If semantic analysis fails, fall back to programmatic name generation
            }
        }
        else
        {
            Console.Error.WriteLine("[AnalyzeInvocation] Compilation is null - SDK not loaded");
        }

        // Generate default name - use friendly name from documentation if available
        if (!string.IsNullOrEmpty(friendlyName))
        {
            response.DefaultName = friendlyName;
        }
        else if (!string.IsNullOrEmpty(response.ConnectorName) && !string.IsNullOrEmpty(response.MethodName))
        {
            // Fallback: Format as connectorName_methodName (e.g., "msnweather_onCurrentWeatherChange" or "builtin_createHttpTrigger")
            string connectorLower = response.ConnectorName.ToLowerInvariant();
            string methodCamelCase = ToCamelCase(response.MethodName);
            response.DefaultName = $"{connectorLower}_{methodCamelCase}";
        }
        else if (!string.IsNullOrEmpty(response.MethodName))
        {
            // Fallback: just use method name in camelCase
            response.DefaultName = ToCamelCase(response.MethodName);
        }

        return response;
    }

    private static string ToCamelCase(string input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return input;
        }

        // Convert first character to lowercase
        return char.ToLowerInvariant(input[0]) + input[1..];
    }

    /// <summary>
    /// Analyzes the entire workflow file to extract workflow name and trigger information.
    /// </summary>
    private static async Task<GetWorkflowMetadataResponse> AnalyzeEntireWorkflowAsync(CompilationUnitSyntax root, CSharpCompilation? compilation)
    {
        var response = new GetWorkflowMetadataResponse();

        // Extract workflow name from class name or Build method
        response.WorkflowName = ExtractWorkflowName(root);

        // Debug: Log all invocations to see what we're finding
        var allInvocations = root.DescendantNodes()
            .OfType<InvocationExpressionSyntax>()
            .ToList();
        await Console.Error.WriteLineAsync($"[AnalyzeEntireWorkflow] Found {allInvocations.Count} invocations");

        // Find the first trigger invocation
        var triggerInvocation = allInvocations.FirstOrDefault(inv => IsWorkflowTrigger(inv));

        if (triggerInvocation != null)
        {
            await Console.Error.WriteLineAsync($"[AnalyzeEntireWorkflow] Found trigger invocation: {triggerInvocation}");
            var triggerMetadata = AnalyzeInvocation(triggerInvocation, compilation);
            await Console.Error.WriteLineAsync($"[AnalyzeEntireWorkflow] Trigger metadata: ConnectorName={triggerMetadata.ConnectorName}, MethodName={triggerMetadata.MethodName}, DefaultName={triggerMetadata.DefaultName}");

            response.TriggerName = ExtractTriggerName(root, triggerInvocation) ?? triggerMetadata.DefaultName;
            response.DefaultName = triggerMetadata.DefaultName;
            response.ElementType = triggerMetadata.ElementType;
            response.ConnectorName = triggerMetadata.ConnectorName;
            response.MethodName = triggerMetadata.MethodName;
            response.ConnectionId = triggerMetadata.ConnectionId;
        }
        else
        {
            await Console.Error.WriteLineAsync("[AnalyzeEntireWorkflow] No trigger invocation found!");

            // Debug: Log first few invocations to see what they are
            for (int i = 0; i < Math.Min(5, allInvocations.Count); i++)
            {
                await Console.Error.WriteLineAsync($"[AnalyzeEntireWorkflow] Invocation {i}: {allInvocations[i].Expression}");
            }
        }

        return response;
    }

    /// <summary>
    /// Extracts the workflow name from the class name or Build method parameter.
    /// </summary>
    private static string? ExtractWorkflowName(CompilationUnitSyntax root)
    {
        // First, look for builder.WithName("workflow-name") pattern
        var builderWithNameInvocation = root.DescendantNodes()
            .OfType<InvocationExpressionSyntax>()
            .FirstOrDefault(inv =>
            {
                if (inv.Expression is MemberAccessExpressionSyntax ma)
                {
                    // Check if it's builder.WithName() (not trigger.WithName())
                    // We can distinguish by checking if the expression is an identifier "builder"
                    if (ma.Name.ToString() == "WithName" && ma.Expression is IdentifierNameSyntax identifier)
                    {
                        return identifier.Identifier.Text == "builder";
                    }
                }

                return false;
            });

        if (builderWithNameInvocation?.ArgumentList?.Arguments.Count > 0)
        {
            var firstArg = builderWithNameInvocation.ArgumentList.Arguments[0];
            if (firstArg.Expression is LiteralExpressionSyntax literal &&
                literal.IsKind(SyntaxKind.StringLiteralExpression))
            {
                return literal.Token.ValueText;
            }
        }

        // Second, look for Build() method with workflow name parameter (CreateStatefulWorkflow/CreateStatelessWorkflow)
        var buildMethod = root.DescendantNodes()
            .OfType<InvocationExpressionSyntax>()
            .FirstOrDefault(inv =>
            {
                if (inv.Expression is MemberAccessExpressionSyntax ma)
                {
                    string methodName = ma.Name.ToString();
                    return methodName.Contains("CreateStatefulWorkflow") || methodName.Contains("CreateStatelessWorkflow");
                }

                return false;
            });

        if (buildMethod?.ArgumentList?.Arguments.Count > 0)
        {
            var firstArg = buildMethod.ArgumentList.Arguments[0];
            if (firstArg.Expression is LiteralExpressionSyntax literal &&
                literal.IsKind(SyntaxKind.StringLiteralExpression))
            {
                return literal.Token.ValueText;
            }
        }

        // Fallback: use class name
        var classDecl = root.DescendantNodes()
            .OfType<ClassDeclarationSyntax>()
            .FirstOrDefault();

        return classDecl?.Identifier.Text;
    }

    /// <summary>
    /// Extracts the trigger name from the selected trigger's WithName() call.
    /// </summary>
    private static string? ExtractTriggerName(CompilationUnitSyntax root, InvocationExpressionSyntax triggerInvocation)
    {
        string? chainedName = triggerInvocation.DescendantNodesAndSelf()
            .OfType<InvocationExpressionSyntax>()
            .Select(ExtractWithNameLiteral)
            .FirstOrDefault(name => name != null);

        if (chainedName != null)
        {
            return chainedName;
        }

        VariableDeclaratorSyntax? triggerVariable = triggerInvocation.FirstAncestorOrSelf<VariableDeclaratorSyntax>();
        if (triggerVariable == null)
        {
            return null;
        }

        string triggerVariableName = triggerVariable.Identifier.ValueText;
        return root.DescendantNodes()
            .OfType<InvocationExpressionSyntax>()
            .Where(invocation => invocation.Expression is MemberAccessExpressionSyntax memberAccess &&
                memberAccess.Name.Identifier.ValueText == "WithName" &&
                memberAccess.Expression.DescendantNodesAndSelf()
                    .OfType<IdentifierNameSyntax>()
                    .Any(identifier => identifier.Identifier.ValueText == triggerVariableName))
            .Select(ExtractWithNameLiteral)
            .FirstOrDefault(name => name != null);
    }

    private static string? ExtractWithNameLiteral(InvocationExpressionSyntax invocation)
    {
        if (invocation.Expression is not MemberAccessExpressionSyntax memberAccess ||
            memberAccess.Name.Identifier.ValueText != "WithName" ||
            invocation.ArgumentList.Arguments.Count == 0)
        {
            return null;
        }

        return invocation.ArgumentList.Arguments[0].Expression is LiteralExpressionSyntax literal &&
            literal.IsKind(SyntaxKind.StringLiteralExpression)
                ? literal.Token.ValueText
                : null;
    }

    /// <summary>
    /// Checks if an invocation is a workflow trigger.
    /// </summary>
    private static bool IsWorkflowTrigger(InvocationExpressionSyntax invocation)
    {
        // Convert the entire invocation expression to a string and check for trigger patterns
        string invocationText = invocation.Expression.ToString();

        // Check if it contains WorkflowTriggers pattern
        if (!invocationText.Contains("WorkflowTriggers", StringComparison.Ordinal))
        {
            return false;
        }

        // Check for BuiltIn (including BuiltIn.ServiceProviders) or Managed patterns
        if (invocationText.Contains("WorkflowTriggers.BuiltIn", StringComparison.Ordinal) ||
            invocationText.Contains("WorkflowTriggers.Managed", StringComparison.Ordinal))
        {
            return true;
        }

        return false;
    }
}
