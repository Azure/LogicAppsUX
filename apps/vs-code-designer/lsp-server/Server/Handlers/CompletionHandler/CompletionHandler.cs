using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

using OmniSharp.Extensions.LanguageServer.Protocol.Client.Capabilities;
using OmniSharp.Extensions.LanguageServer.Protocol.Document;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;

using SdkLspServer.Handlers.HoverHandler;
using SdkLspServer.Services.Api;
using SdkLspServer.Services.Connections;
using SdkLspServer.Services.Telemetry;
using SdkLspServer.Store;
using SdkLspServer.Store.DynamicData;

namespace SdkLspServer.Handlers.CompletionHandler;

/// <summary>
/// Provides completion items for SDK usage. In particular, when the user types
/// "WorkflowActions.Managed." or "WorkflowActions.BuiltIn.ServiceProviders." this handler suggests available connector names
/// (e.g., Msnweather) based on the SDK assemblies loaded via <see cref="SdkIndex"/>.
/// Can also make dynamic API calls to fetch additional completion suggestions.
/// </summary>
public class CompletionHandler(SdkIndex? sdkIndex, BufferManager bufferManager, ConnectionsService connectionsService, ApiService apiService, LSPStore lspStore, ITelemetryService telemetryService) : CompletionHandlerBase
{
    private readonly SdkIndex? sdkIndex = sdkIndex;
    private readonly BufferManager bufferManager = bufferManager;
    private readonly ConnectionsService connectionsService = connectionsService;
    private readonly ApiService apiService = apiService;
    private readonly LSPStore lspStore = lspStore;
    private readonly ITelemetryService telemetry = telemetryService;
    private int completionRequestCount = 0;

    public TextDocumentSelector DocumentSelector { get; } = new(
        new TextDocumentFilter { Pattern = "**/*.cs" });

    public static TextDocumentAttributes GetTextDocumentAttributes(Uri uri)
    {
        return new TextDocumentAttributes(uri, "csharp");
    }

    /// <summary>
    /// Determines if a comma is needed before the comment based on the argument's position in the argument list.
    /// </summary>
    private static bool NeedsCommaBeforeComment(ArgumentSyntax argumentSyntax)
    {
        // Check if this argument is followed by another argument in the list
        if (argumentSyntax.Parent is not ArgumentListSyntax argumentList)
        {
            return false;
        }

        // Find the index of the current argument
        int currentIndex = argumentList.Arguments.IndexOf(argumentSyntax);

        // If this is not the last argument, we need a comma
        return currentIndex < argumentList.Arguments.Count - 1;
    }

    [System.Diagnostics.CodeAnalysis.RequiresAssemblyFiles]
    public override async Task<CompletionList> Handle(CompletionParams request, CancellationToken cancellationToken)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        // Sample completion requests at 25%
        bool shouldTrack = (++completionRequestCount % 4) == 0;

        if (shouldTrack)
        {
            telemetry.TrackEvent("Completion_Request");
        }

        var items = new List<CompletionItem>();

        try
        {
            string documentPath = request.TextDocument.Uri.ToString();
            string? documentText = bufferManager.GetBuffer(documentPath);
            if (string.IsNullOrEmpty(documentText))
            {
                if (request.TextDocument.Uri.Scheme == "file")
                {
                    try
                    {
                        string filePath = request.TextDocument.Uri.GetFileSystemPath();
                        documentText = await File.ReadAllTextAsync(filePath, cancellationToken);
                    }
                    catch
                    {
                        return new CompletionList(items);
                    }
                }
                else
                {
                    return new CompletionList(items);
                }
            }

            // Parse document
            SyntaxTree tree = CSharpSyntaxTree.ParseText(documentText, cancellationToken: cancellationToken);
            CompilationUnitSyntax root = tree.GetCompilationUnitRoot(cancellationToken);
            Microsoft.CodeAnalysis.Text.SourceText text = await tree.GetTextAsync(cancellationToken);

            if (request.Position.Line >= text.Lines.Count)
            {
                return new CompletionList(items);
            }

            TextLine line = text.Lines[request.Position.Line];
            int absolutePosition = Math.Min(line.Start + request.Position.Character, text.Length);

            // Find the token at cursor position
            SyntaxToken token = root.FindToken(absolutePosition);

            // FIRST: Check if we're inside a string literal (for dynamic values completion)
            // Also check the token before the cursor position in case we're right after the opening quote
            SyntaxToken tokenBefore = root.FindToken(Math.Max(0, absolutePosition - 1));

            // Check both current token and previous token for string literals
            bool isInString = token.IsKind(Microsoft.CodeAnalysis.CSharp.SyntaxKind.StringLiteralToken) ||
                             tokenBefore.IsKind(Microsoft.CodeAnalysis.CSharp.SyntaxKind.StringLiteralToken);

            if (isInString)
            {
                await Console.Error.WriteLineAsync("[CompletionHandler] Detected string literal context");
                SyntaxToken stringToken = token.IsKind(Microsoft.CodeAnalysis.CSharp.SyntaxKind.StringLiteralToken) ? token : tokenBefore;

                // Check if this is a connection parameter first
                List<CompletionItem>? connectionCompletions = await HandleConnectionCompletionAsync(stringToken, tree, cancellationToken);
                if (connectionCompletions?.Any() == true)
                {
                    return new CompletionList(connectionCompletions);
                }

                // If not connection, try dynamic values completion
                List<CompletionItem>? dynamicCompletions = await HandleDynamicValuesCompletionAsync(stringToken, tree, cancellationToken);
                if (dynamicCompletions?.Any() == true)
                {
                    return new CompletionList(dynamicCompletions);
                }
                else
                {
                    await Console.Error.WriteLineAsync("[CompletionHandler] No dynamic completions found");
                }
            }

            // SECOND: Original logic for managed connector / service provider completion
            // Find the token immediately left of the cursor (common for dot-triggered completion)
            token = root.FindToken(Math.Max(0, absolutePosition - 1));

            // Walk up to the nearest MemberAccessExpression like: <expr> . <name>
            MemberAccessExpressionSyntax? memberAccess = token.Parent?.AncestorsAndSelf().OfType<MemberAccessExpressionSyntax>().LastOrDefault();
            if (memberAccess is null)
            {
                return new CompletionList(items);
            }

            // Identify the target expression for which we are completing members (left of the dot)
            ExpressionSyntax targetExpr = memberAccess.Expression;

            // Only provide completions if this member access chain includes a connector container
            if (!ContainsSdkConnectorAccess(targetExpr))
            {
                return new CompletionList(items);
            }

            // Create a small compilation so Roslyn can tell us the return type of the connector container
            var references = new List<MetadataReference>
            {
                MetadataReference.CreateFromFile(typeof(string).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(System.Console).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(System.Linq.Enumerable).Assembly.Location),
            };

            if (sdkIndex != null)
            {
                foreach (string assemblyPath in sdkIndex.AssemblyPaths)
                {
                    try
                    {
                        if (File.Exists(assemblyPath))
                        {
                            references.Add(MetadataReference.CreateFromFile(assemblyPath));
                        }
                    }
                    catch
                    {
                        // Ignore assembly loading issues.
                    }
                }
            }

            var compilation = CSharpCompilation.Create(
                assemblyName: "CompletionAnalysis",
                syntaxTrees: new[] { tree },
                references: references);

            SemanticModel semanticModel = compilation.GetSemanticModel(tree);

            // Get the type of the target expression (could be a connector container or a specific connector like Outlook)
            TypeInfo typeInfo = semanticModel.GetTypeInfo(targetExpr, cancellationToken);
            ITypeSymbol? type = typeInfo.Type ?? typeInfo.ConvertedType;

            if (type is null)
            {
                SymbolInfo targetSymbolInfo = semanticModel.GetSymbolInfo(targetExpr, cancellationToken);
                type = (targetSymbolInfo.Symbol as IMethodSymbol)?.ReturnType
                       ?? (targetSymbolInfo.Symbol as IPropertySymbol)?.Type
                       ?? targetSymbolInfo.CandidateSymbols.OfType<IMethodSymbol>().FirstOrDefault()?.ReturnType
                       ?? targetSymbolInfo.CandidateSymbols.OfType<IPropertySymbol>().FirstOrDefault()?.Type;
            }

            if (type is null)
            {
                return new CompletionList(items);
            }

            // If completing directly after a connector container property
            // (e.g. WorkflowActions.Managed. or WorkflowActions.BuiltIn.ServiceProviders.), suggest connector names.
            bool isConnectorContainerAccess =
                targetExpr is MemberAccessExpressionSyntax containerAccess &&
                (string.Equals(containerAccess.Name.ToString(), "Managed", StringComparison.Ordinal) ||
                 string.Equals(containerAccess.Name.ToString(), "ServiceProviders", StringComparison.Ordinal));

            if (isConnectorContainerAccess)
            {
                // Suggest public properties (Managed/ServiceProviders exposes connector names as properties)
                foreach (ISymbol member in type.GetMembers().Where(m => m.Kind == Microsoft.CodeAnalysis.SymbolKind.Property))
                {
                    if (member is IPropertySymbol prop && prop.DeclaredAccessibility == Accessibility.Public && !prop.IsStatic)
                    {
                        items.Add(new CompletionItem
                        {
                            Label = prop.Name,
                            Kind = CompletionItemKind.Property,
                            Detail = prop.Type?.ToDisplayString(SymbolDisplayFormat.MinimallyQualifiedFormat) ?? string.Empty,
                            InsertText = prop.Name,
                        });
                    }
                }

                // Suggest public factory methods (ServiceProviders exposes connector names as methods)
                foreach (IMethodSymbol method in type.GetMembers().OfType<IMethodSymbol>()
                    .Where(m => m.MethodKind == MethodKind.Ordinary && m.DeclaredAccessibility == Accessibility.Public && !m.IsStatic))
                {
                    if (method.Name.StartsWith("get_") || method.Name.StartsWith("set_"))
                    {
                        continue;
                    }

                    items.Add(new CompletionItem
                    {
                        Label = method.Name,
                        Kind = CompletionItemKind.Method,
                        Detail = method.ReturnType?.ToDisplayString(SymbolDisplayFormat.MinimallyQualifiedFormat) ?? string.Empty,
                        InsertText = method.Name,
                    });
                }
            }
            else
            {
                // Otherwise, we're after a connector property, suggest its operations (methods)
                // Prefer methods annotated with [ConnectorOperation(...)] if any, else fall back to all public instance methods
                IEnumerable<IMethodSymbol> methods = type
                    .GetMembers()
                    .OfType<IMethodSymbol>()
                    .Where(m => m.MethodKind == MethodKind.Ordinary && m.DeclaredAccessibility == Accessibility.Public && !m.IsStatic);

                // Try to filter to ConnectorOperation methods if present
                var opMethods = methods
                    .Where(m => m.GetAttributes().Any(a => string.Equals(a.AttributeClass?.Name, "ConnectorOperationAttribute", StringComparison.Ordinal)
                                                        || string.Equals(a.AttributeClass?.Name, "ConnectorOperation", StringComparison.Ordinal)))
                    .ToList();

                // Avoid property accessors or event methods etc.
                foreach (IMethodSymbol m in opMethods.Count > 0 ? opMethods : methods)
                {
                    // Skip common noise
                    if (m.Name.StartsWith("get_") || m.Name.StartsWith("set_") || m.Name.StartsWith("add_") || m.Name.StartsWith("remove_"))
                    {
                        continue;
                    }

                    items.Add(new CompletionItem
                    {
                        Label = m.Name,
                        Kind = CompletionItemKind.Method,
                        Detail = m.ReturnType?.ToDisplayString(SymbolDisplayFormat.MinimallyQualifiedFormat) ?? string.Empty,
                        InsertText = m.Name,
                    });
                }
            }

            // If nothing was found, still return an empty list to satisfy LSP.
            stopwatch.Stop();

            if (shouldTrack)
            {
                telemetry.TrackMetric("Completion_ResponseTime_Ms", stopwatch.ElapsedMilliseconds);
                telemetry.TrackMetric("Completion_ItemCount", items.Count);
            }

            return new CompletionList(items);
        }
        catch (Exception ex)
        {
            telemetry.TrackException(ex, new Dictionary<string, string>
            {
                { "Handler", "Completion" },
            });

            return new CompletionList(items);
        }
    }

    /// <summary>
    /// Handles completion when the cursor is inside a string literal that represents a connection parameter.
    /// Provides a list of available connections from connections.json.
    /// </summary>
    private async Task<List<CompletionItem>?> HandleConnectionCompletionAsync(SyntaxToken stringToken, SyntaxTree tree, CancellationToken cancellationToken)
    {
        try
        {
            // Find the argument that contains this string literal
            ArgumentSyntax? argument = stringToken.Parent?.AncestorsAndSelf().OfType<ArgumentSyntax>().FirstOrDefault();
            if (argument == null)
            {
                return null;
            }

            // Find the invocation expression (the method call)
            InvocationExpressionSyntax? invocation = argument.AncestorsAndSelf().OfType<InvocationExpressionSyntax>().FirstOrDefault();
            if (invocation == null)
            {
                return null;
            }

            // Get all arguments from the invocation
            ArgumentListSyntax argumentList = invocation.ArgumentList;
            int argumentIndex = argumentList.Arguments.IndexOf(argument);

            await Console.Error.WriteLineAsync($"[CompletionHandler] Found argument at index: {argumentIndex}");

            // Check parameter name from named argument
            string? parameterName = argument.NameColon?.Name.Identifier.Text;
            await Console.Error.WriteLineAsync($"[CompletionHandler] Parameter name: {parameterName ?? "NULL"}");

            // Check if this is a connection parameter based on:
            // 1. Parameter name contains "connection"
            // 2. Method name contains connector name (e.g., "Microsoftforms")
            bool isConnectionByName = parameterName?.Contains("connection", StringComparison.OrdinalIgnoreCase) == true;

            // Check method name to see if it's a connector method
            string? methodName = null;
            if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
            {
                methodName = memberAccess.Name.Identifier.Text;
            }
            else if (invocation.Expression is IdentifierNameSyntax identifier)
            {
                methodName = identifier.Identifier.Text;
            }

            await Console.Error.WriteLineAsync($"[CompletionHandler] Method name: {methodName ?? "NULL"}");

            // Check if method name is a known connector method (starts with capital letter and not "Get")
            bool isConnectorMethod = methodName != null &&
                                    char.IsUpper(methodName[0]) &&
                                    !methodName.StartsWith("Get", StringComparison.Ordinal) &&
                                    argumentIndex == 0; // Connection is typically first parameter

            await Console.Error.WriteLineAsync($"[CompletionHandler] isConnectionByName={isConnectionByName}, isConnectorMethod={isConnectorMethod}");

            if (!isConnectionByName && !isConnectorMethod)
            {
                await Console.Error.WriteLineAsync("[CompletionHandler] Not a connection parameter");
                return null;
            }

            // Get connections from ConnectionsService
            ConnectionsConfig? connections = connectionsService.GetConnections();
            if (connections?.ManagedApiConnections == null || connections.ManagedApiConnections.Count == 0)
            {
                return null;
            }

            // Create completion items for each connection
            var items = new List<CompletionItem>();
            foreach (KeyValuePair<string, ManagedApiConnection> kvp in connections.ManagedApiConnections)
            {
                string connectionKey = kvp.Key;
                ManagedApiConnection connection = kvp.Value;

                // Extract API name from the API ID (e.g., "/providers/Microsoft.Web/locations/.../apis/microsoftforms")
                string apiDisplayName = connectionKey; // Default to connection key
                if (!string.IsNullOrEmpty(connection.Api?.Id))
                {
                    string apiId = connection.Api.Id;
                    int lastSlashIndex = apiId.LastIndexOf('/');
                    if (lastSlashIndex >= 0 && lastSlashIndex < apiId.Length - 1)
                    {
                        apiDisplayName = apiId[(lastSlashIndex + 1)..];
                    }
                }

                items.Add(new CompletionItem
                {
                    Label = connectionKey,
                    Kind = CompletionItemKind.Value,
                    Detail = $"Connection - {apiDisplayName}",
                    Documentation = $"Connection ID: {connection.Connection?.Id ?? "N/A"}",
                    InsertText = connectionKey,  // Insert just the key without quotes
                    FilterText = connectionKey,
                    SortText = connectionKey,
                    Preselect = false,
                });
            }

            return items;
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[CompletionHandler] Error in HandleConnectionCompletionAsync: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Handles completion when the cursor is inside a string literal that's part of a lambda parameter with [DynamicValues].
    /// </summary>
    private async Task<List<CompletionItem>?> HandleDynamicValuesCompletionAsync(SyntaxToken stringToken, SyntaxTree tree, CancellationToken cancellationToken)
    {
        try
        {
            // Walk up the syntax tree to find if this string is inside a lambda expression
            LambdaExpressionSyntax? lambda = stringToken.Parent?.AncestorsAndSelf().OfType<LambdaExpressionSyntax>().FirstOrDefault();
            if (lambda == null)
            {
                return null;
            }

            // Find the argument that contains this lambda
            ArgumentSyntax? argument = lambda.AncestorsAndSelf().OfType<ArgumentSyntax>().FirstOrDefault();
            if (argument == null)
            {
                return null;
            }

            // Find the invocation expression (the method call)
            InvocationExpressionSyntax? invocation = argument.AncestorsAndSelf().OfType<InvocationExpressionSyntax>().FirstOrDefault();
            if (invocation == null)
            {
                return null;
            }

            // Get all arguments from the invocation
            ArgumentListSyntax argumentList = invocation.ArgumentList;
            int argumentIndex = argumentList.Arguments.IndexOf(argument);

            // Build a semantic model
            List<MetadataReference> references = BuildMetadataReferences();
            var compilation = CSharpCompilation.Create(
                assemblyName: "DynamicValuesCompletion",
                syntaxTrees: new[] { tree },
                references: references);

            SemanticModel semanticModel = compilation.GetSemanticModel(tree);

            // Get the method symbol being invoked
            SymbolInfo symbolInfo = semanticModel.GetSymbolInfo(invocation, cancellationToken: cancellationToken);

            // FALLBACK: If method symbol is null (due to compilation errors), try to infer from syntax
            if (symbolInfo.Symbol is not IMethodSymbol methodSymbol)
            {
                // Extract method name from syntax
                string? methodName = null;
                if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
                {
                    methodName = memberAccess.Name.Identifier.Text;
                }

                if (string.IsNullOrEmpty(methodName))
                {
                    return null;
                }

                // Use fallback: infer operation name from parameter name pattern
                string? parameterName = null;
                if (argument.NameColon != null)
                {
                    parameterName = argument.NameColon.Name.Identifier.Text;
                }

                if (string.IsNullOrEmpty(parameterName))
                {
                    return null;
                }

                // Infer operation based on parameter name (formId -> ListForms, responseId -> ListResponses, etc.)
                string? inferredOperationName = InferOperationFromParameter(parameterName);
                if (string.IsNullOrEmpty(inferredOperationName))
                {
                    return null;
                }

                // Fetch dynamic values using fallback approach
                return await FetchDynamicValueCompletionsAsync(
                    inferredOperationName,
                    invocation,
                    null, // No method symbol available
                    argument,
                    semanticModel,
                    cancellationToken);
            }

            // Get the parameter for this argument
            if (argumentIndex >= methodSymbol.Parameters.Length)
            {
                return null;
            }

            IParameterSymbol parameter = methodSymbol.Parameters[argumentIndex];

            // Check for [DynamicValues] attribute
            AttributeData? dynamicValuesAttr = parameter.GetAttributes()
                .FirstOrDefault(a => a.AttributeClass?.Name == "DynamicValuesAttribute" || a.AttributeClass?.Name == "DynamicValues");

            if (dynamicValuesAttr == null)
            {
                return null;
            }

            // Extract operation name from attribute
            string? operationName = null;
            if (dynamicValuesAttr.ConstructorArguments.Length > 0)
            {
                operationName = dynamicValuesAttr.ConstructorArguments[0].Value?.ToString();
            }

            if (string.IsNullOrEmpty(operationName))
            {
                return null;
            }

            // Fetch the dynamic values using the same logic as HoverHandler
            return await FetchDynamicValueCompletionsAsync(
                operationName,
                invocation,
                methodSymbol,
                argument,
                semanticModel,
                cancellationToken);
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[CompletionHandler] Error in HandleDynamicValuesCompletionAsync: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Fetches dynamic value completions for a specific operation.
    /// This integrates with the same Azure API calls used in HoverHandler.
    /// </summary>
    private async Task<List<CompletionItem>> FetchDynamicValueCompletionsAsync(
        string operationName,
        InvocationExpressionSyntax invocation,
        IMethodSymbol? methodSymbol,
        ArgumentSyntax argument,
        SemanticModel semanticModel,
        CancellationToken cancellationToken)
    {
        var items = new List<CompletionItem>();

        try
        {
            // 1. Infer connector name from operation or method name
            string? connectorName = InferConnectorName(operationName, methodSymbol);

            if (string.IsNullOrEmpty(connectorName))
            {
                return items;
            }

            // 2. Extract connection name from method call arguments
            string? connectionName = ExtractConnectionName(invocation, methodSymbol);

            if (string.IsNullOrEmpty(connectionName))
            {
                return items;
            }

            // 3. Get the position for inserting the comment (end of the argument) - used for both cached and fresh values
            Microsoft.CodeAnalysis.Location argLocation = argument.GetLocation();
            FileLinePositionSpan argLineSpan = argLocation.GetLineSpan();
            int commentLine = argLineSpan.EndLinePosition.Line;
            int commentChar = argLineSpan.EndLinePosition.Character;

            // Determine if we need a comma before the comment
            bool needsComma = NeedsCommaBeforeComment(argument);
            string commentPrefix = needsComma ? ", // " : " // ";

            // 4. Check if values are already in the shared store
            List<DynamicValueItem>? cachedValues = lspStore.DynamicData.Get(connectorName, operationName, connectionName);
            if (cachedValues != null)
            {
                return cachedValues.ConvertAll(v => new CompletionItem
                {
                    Label = v.Description,
                    Kind = CompletionItemKind.Value,
                    Detail = $"{connectorName} - {operationName}",
                    Documentation = $"ID: {v.Value}",
                    InsertText = v.Value.Trim('"'),  // Remove quotes - VSCode will add them
                    FilterText = v.Description,  // Filter by description for better UX
                    SortText = v.Description,   // Sort by description for readability
                    Preselect = false,
                    AdditionalTextEdits = new[]
                    {
                        new TextEdit
                        {
                            Range = new OmniSharp.Extensions.LanguageServer.Protocol.Models.Range
                            {
                                Start = new Position(commentLine, commentChar),
                                End = new Position(commentLine, commentChar),
                            },
                            NewText = $"{commentPrefix}{v.Description}",
                        },
                    },
                });
            }

            // 5. Build API URL and payload (same logic as HoverHandler)
            string? apiUrl = BuildDynamicApiUrl(connectionName);
            if (string.IsNullOrEmpty(apiUrl))
            {
                return items;
            }

            HoverHandlerTypes.DynamicInvokePayload? payload = BuildDynamicApiPayload(connectorName, operationName);
            if (payload == null)
            {
                return items;
            }

            // 6. Make the API call
            IEnumerable<DynamicValueItem>? dynamicValues = await FetchFromDynamicApiAsync(connectorName, apiUrl, payload, cancellationToken);

            if (dynamicValues?.Any() != true)
            {
                return items;
            }

            // 7. Store in shared store for future use
            var storeItems = dynamicValues.Select(v => new DynamicValueItem(v.Value, v.Description)).ToList();
            lspStore.DynamicData.Set(connectorName, operationName, connectionName, storeItems);
            await Console.Error.WriteLineAsync($"[CompletionHandler] Stored {storeItems.Count} items in LSPStore.DynamicData");

            // 8. Convert to completion items with additional text edits for comments
            items = dynamicValues.Select(v => new CompletionItem
            {
                Label = v.Description,
                Kind = CompletionItemKind.Value,
                Detail = $"{connectorName} - {operationName}",
                Documentation = $"ID: {v.Value}",
                InsertText = v.Value.Trim('"'),  // Remove quotes - VSCode will add them
                FilterText = v.Description,  // Filter by description for better UX
                SortText = v.Description,   // Sort by description for readability
                Preselect = false,

                // Add additional edit to insert comment at end of line
                AdditionalTextEdits = new[]
                {
                    new TextEdit
                    {
                        Range = new OmniSharp.Extensions.LanguageServer.Protocol.Models.Range
                        {
                            Start = new Position(commentLine, commentChar),
                            End = new Position(commentLine, commentChar),
                        },
                        NewText = $"{commentPrefix}{v.Description}",
                    },
                },
            }).ToList();
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[CompletionHandler] Error fetching dynamic values: {ex.Message}");
        }

        return items;
    }

    private List<MetadataReference> BuildMetadataReferences()
    {
        var references = new List<MetadataReference>
        {
            MetadataReference.CreateFromFile(typeof(string).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Enumerable).Assembly.Location),
        };

        if (sdkIndex != null)
        {
            foreach (string assemblyPath in sdkIndex.AssemblyPaths)
            {
                try
                {
                    if (File.Exists(assemblyPath))
                    {
                        references.Add(MetadataReference.CreateFromFile(assemblyPath));
                    }
                }
                catch
                {
                    // Ignore
                }
            }
        }

        return references;
    }

    private static string? InferConnectorName(string operationName, IMethodSymbol? methodSymbol)
    {
        // Check method attributes first (if available)
        if (methodSymbol != null)
        {
            AttributeData? connectorAttr = methodSymbol.GetAttributes()
                .FirstOrDefault(a => a.AttributeClass?.Name == "ConnectorOperationAttribute" || a.AttributeClass?.Name == "ConnectorOperation");

            if (connectorAttr?.ConstructorArguments.Length > 1)
            {
                return connectorAttr.ConstructorArguments[1].Value?.ToString();
            }
        }

        // Infer from operation name patterns
        if (operationName.Contains("Form", StringComparison.OrdinalIgnoreCase))
        {
            return "microsoftforms";
        }

        if (operationName.Contains("Team", StringComparison.OrdinalIgnoreCase))
        {
            return "teams";
        }

        if (operationName.Contains("Mail", StringComparison.OrdinalIgnoreCase) ||
            operationName.Contains("Outlook", StringComparison.OrdinalIgnoreCase))
        {
            return "outlook";
        }

        // Infer from method containing type (if available)
        if (methodSymbol != null)
        {
            string containingType = methodSymbol.ContainingType?.Name.ToLowerInvariant() ?? string.Empty;
            if (containingType.Contains("form"))
            {
                return "microsoftforms";
            }

            if (containingType.Contains("team"))
            {
                return "teams";
            }
        }

        return null;
    }

    /// <summary>
    /// Infers the operation name from a parameter name pattern.
    /// For example: formId -> ListForms, responseId -> ListResponses.
    /// </summary>
    private static string? InferOperationFromParameter(string parameterName)
    {
        // Common parameter name patterns and their corresponding operations
        var patterns = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "formId", "ListForms" },
            { "responseId", "ListResponses" },
            { "teamId", "ListTeams" },
            { "channelId", "ListChannels" },
            { "messageId", "ListMessages" },
            { "folderId", "ListFolders" },
            { "mailId", "ListMails" },
        };

        if (patterns.TryGetValue(parameterName, out string? operation))
        {
            return operation;
        }

        // Try to infer from parameter name patterns (e.g., "itemId" -> "ListItems")
        if (parameterName.EndsWith("Id", StringComparison.OrdinalIgnoreCase))
        {
            string baseName = parameterName[..^2];
            return $"List{baseName}s";  // Convert to plural
        }

        return null;
    }

    /// <summary>
    /// Extracts the connection name from the invocation chain.
    /// Walks up the method chain to find connection parameters in parent invocations.
    /// For example: .Microsoftforms("conn").GetFormResponseById(...) finds "conn" in parent.
    /// </summary>
    private static string? ExtractConnectionName(InvocationExpressionSyntax invocation, IMethodSymbol? methodSymbol)
    {
        // First try to extract from the current invocation
        string? connectionName = ExtractConnectionFromSingleInvocation(invocation, methodSymbol);
        if (!string.IsNullOrEmpty(connectionName))
        {
            return connectionName;
        }

        // For method chains like .Microsoftforms("conn").GetFormResponseById(...)
        // Walk up the member access chain to find the connection parameter
        if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
        {
            // The expression on the left might be another invocation
            if (memberAccess.Expression is InvocationExpressionSyntax parentInvocation)
            {
                // Look for string literal in parent invocation (e.g., Microsoftforms("conn"))
                return ExtractFirstStringLiteral(parentInvocation);
            }
        }

        return null;
    }

    /// <summary>
    /// Extracts connection from a single invocation (no chain traversal).
    /// </summary>
    private static string? ExtractConnectionFromSingleInvocation(InvocationExpressionSyntax invocation, IMethodSymbol? methodSymbol)
    {
        ArgumentListSyntax argumentList = invocation.ArgumentList;
        if (argumentList.Arguments.Count == 0)
        {
            return null;
        }

        // Find the parameter with [ConnectionName] attribute (if methodSymbol available)
        if (methodSymbol != null)
        {
            for (int i = 0; i < methodSymbol.Parameters.Length; i++)
            {
                IParameterSymbol param = methodSymbol.Parameters[i];
                bool hasConnectionNameAttr = param.GetAttributes().Any(a =>
                    a.AttributeClass?.Name == "ConnectionNameAttribute" ||
                    a.AttributeClass?.Name == "ConnectionName");

                if (hasConnectionNameAttr && i < argumentList.Arguments.Count)
                {
                    ArgumentSyntax arg = argumentList.Arguments[i];
                    if (arg.Expression is LiteralExpressionSyntax literal &&
                        literal.Token.Value is string connectionName)
                    {
                        return connectionName;
                    }
                }
            }
        }

        // Fallback: try first string literal argument
        return ExtractFirstStringLiteral(invocation);
    }

    /// <summary>
    /// Extracts the first string literal from an invocation's arguments.
    /// </summary>
    private static string? ExtractFirstStringLiteral(InvocationExpressionSyntax invocation)
    {
        foreach (ArgumentSyntax arg in invocation.ArgumentList.Arguments)
        {
            if (arg.Expression is LiteralExpressionSyntax literal &&
                literal.Token.Value is string value)
            {
                return value;
            }
        }

        return null;
    }

    /// <summary>
    /// Builds the API URL for fetching dynamic values based on connector and connection name.
    /// Uses ApiServiceConfig for subscription, resource group, and API version.
    /// </summary>
    private string? BuildDynamicApiUrl(string connectionName)
    {
        if (string.IsNullOrEmpty(connectionName))
        {
            return null;
        }

        ApiServiceConfig apiConfiguration = apiService.Config;

        return $"{apiConfiguration.BaseUrl}/subscriptions/{apiConfiguration.SubscriptionId}/resourceGroups/{apiConfiguration.ResourceGroup}/providers/Microsoft.Web/connections/{connectionName}/dynamicInvoke?api-version={apiConfiguration.ApiVersion}";
    }

    private static HoverHandlerTypes.DynamicInvokePayload? BuildDynamicApiPayload(string connectorName, string operationName)
    {
        // Use the DynamicOperationsRegistry from HoverHandler
        DynamicOperationMetadata? metadata = DynamicOperationsRegistry.GetOperationMetadata(connectorName, operationName);
        return metadata == null
            ? null
            : new HoverHandlerTypes.DynamicInvokePayload
            {
                Request = new HoverHandlerTypes.DynamicInvokeRequest
                {
                    Method = metadata.Method,
                    Path = metadata.Path,
                    Queries = metadata.QueryParameters,
                },
            };
    }

    private async Task<IEnumerable<DynamicValueItem>?> FetchFromDynamicApiAsync(
        string connectorName,
        string apiUrl,
        HoverHandlerTypes.DynamicInvokePayload payload,
        CancellationToken cancellationToken)
    {
        try
        {
            // Call Azure dynamicInvoke API
            HoverHandlerTypes.DynamicInvokeResponse<List<HoverHandlerTypes.FormItem>>? dynamicResponse = await apiService.PostJsonAsync<HoverHandlerTypes.DynamicInvokeResponse<List<HoverHandlerTypes.FormItem>>>(
                apiUrl,
                payload,
                cancellationToken);

            List<HoverHandlerTypes.FormItem>? forms = dynamicResponse?.Response?.Body;
            return forms == null || forms.Count == 0
                ? (IEnumerable<DynamicValueItem>?)null
                : forms.Select(form => new DynamicValueItem(
                $"\"{form.Id}\"",
                form.Title ?? "Untitled Form"));
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[CompletionHandler] Error calling dynamic API: {ex.Message}");
            return null;
        }
    }

    // Resolve is not used (ResolveProvider = false), but the abstract base requires this.
    public override Task<CompletionItem> Handle(CompletionItem request, CancellationToken cancellationToken)
    {
        return Task.FromResult(request);
    }

    protected override CompletionRegistrationOptions CreateRegistrationOptions(CompletionCapability capability, OmniSharp.Extensions.LanguageServer.Protocol.Client.Capabilities.ClientCapabilities clientCapabilities)
    {
        return new CompletionRegistrationOptions
        {
            DocumentSelector = DocumentSelector,
            TriggerCharacters = new Container<string>(".", "\""),  // Trigger on dot and quotes
            ResolveProvider = false,
        };
    }

    private static string GetInvokedSimpleName(ExpressionSyntax expr)
    {
        return expr switch
        {
            IdentifierNameSyntax id => id.Identifier.ValueText,
            MemberAccessExpressionSyntax ma when ma.Name is IdentifierNameSyntax id2 => id2.Identifier.ValueText,
            _ => string.Empty,
        };
    }

    private static bool ContainsSdkConnectorAccess(ExpressionSyntax expression)
    {
        // Match WorkflowActions.Managed.X / WorkflowActions.BuiltIn.ServiceProviders.X chains
        foreach (MemberAccessExpressionSyntax ma in expression.DescendantNodesAndSelf().OfType<MemberAccessExpressionSyntax>())
        {
            string name = ma.Name.ToString();
            if (string.Equals(name, "Managed", StringComparison.Ordinal) ||
                string.Equals(name, "ServiceProviders", StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }
}
