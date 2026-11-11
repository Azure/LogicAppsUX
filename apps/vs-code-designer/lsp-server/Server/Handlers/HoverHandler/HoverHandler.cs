using System.Collections.Immutable;
using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

using OmniSharp.Extensions.LanguageServer.Protocol.Client.Capabilities;
using OmniSharp.Extensions.LanguageServer.Protocol.Document;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;

using SdkLspServer.Services.Api;
using SdkLspServer.Services.Connections;
using SdkLspServer.Services.Telemetry;
using SdkLspServer.Store;
using SdkLspServer.Store.DynamicData;

namespace SdkLspServer.Handlers.HoverHandler;

public class HoverHandler(SdkIndex? sdkIndex, BufferManager bufferManager, ConnectionsService connectionsService, ApiService apiService, LSPStore lspStore, ITelemetryService telemetryService) : HoverHandlerBase
{
    private static readonly SymbolDisplayFormat ShortTypeFormat = new(
        globalNamespaceStyle: SymbolDisplayGlobalNamespaceStyle.Omitted,
        typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypes,
        genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters,
        miscellaneousOptions: SymbolDisplayMiscellaneousOptions.UseSpecialTypes | SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers | SymbolDisplayMiscellaneousOptions.IncludeNullableReferenceTypeModifier);

    // Performance optimization: Cache constants
    private const int CompilationCacheMaxAgeMinutes = 5;
    private const int CompilationCacheMaxSize = 20;
    private const int ParameterContextCacheMaxAgeMinutes = 2;
    private const int ParameterContextCacheMaxSize = 100;

    private readonly SdkIndex? sdkIndex = sdkIndex;
    private readonly BufferManager bufferManager = bufferManager;
    private readonly ConnectionsService connectionsService = connectionsService;
    private readonly ApiService apiService = apiService;
    private readonly LSPStore lspStore = lspStore;
    private readonly ITelemetryService telemetry = telemetryService;
    private int hoverRequestCount = 0;

    // Performance optimization: Cache Roslyn compilations per document
    private readonly Dictionary<string, (CSharpCompilation Compilation, DateTime LastAccess)> compilationCache = new();
    private readonly object compilationCacheLock = new();

    // Performance optimization: Cache parameter context resolution per position
    private readonly Dictionary<string, (HoverHandlerTypes.ParameterContext? Context, DateTime LastAccess)> parameterContextCache = new();
    private readonly object parameterContextCacheLock = new();

    // Initialize the dynamic operations registry with SDK
    static HoverHandler()
    {
        // Static initialization will happen once per app domain
    }

    private void EnsureRegistryInitialized()
    {
        // Initialize registry with SDK index (lazy, thread-safe in registry)
        DynamicOperationsRegistry.Initialize(sdkIndex);
    }

    private readonly TextDocumentSelector documentSelector = new(
    new TextDocumentFilter()
    {
        Pattern = "**/*.cs",
    });

    public static TextDocumentAttributes GetTextDocumentAttributes(Uri uri)
    {
        return new TextDocumentAttributes(uri, "csharp");
    }

    [RequiresAssemblyFiles]
    public override async Task<Hover?> Handle(HoverParams request, CancellationToken cancellationToken)
    {
        // Ensure dynamic operations registry is initialized
        EnsureRegistryInitialized();

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        // Sample hover requests at 50%
        bool shouldTrack = (++hoverRequestCount % 2) == 0;

        if (shouldTrack)
        {
            telemetry.TrackEvent("Hover_Request_Started");
        }

        try
        {
            string documentPath = request.TextDocument.Uri.ToString();

            // Get the document content from BufferManager
            string? documentText = bufferManager.GetBuffer(documentPath);
            if (string.IsNullOrEmpty(documentText))
            {
                // Fallback: try to read file from disk if not in buffer
                if (request.TextDocument.Uri.Scheme == "file")
                {
                    try
                    {
                        string filePath = request.TextDocument.Uri.GetFileSystemPath();
                        documentText = await System.IO.File.ReadAllTextAsync(filePath, cancellationToken);
                    }
                    catch
                    {
                        return null;
                    }
                }
                else
                {
                    return null;
                }
            }

            // Analyze the symbol at the hover position
            string? symbolInfo = await AnalyzeSymbolAtPositionAsync(documentText, request.Position, cancellationToken);

            if (string.IsNullOrEmpty(symbolInfo))
            {
                // Fallback to SDK summary if no specific symbol found
                if (sdkIndex != null)
                {
                    symbolInfo = $"**SDK Loaded**\n\n{sdkIndex.Summary}";
                }
                else
                {
                    return null;
                }
            }

            var markupContent = new MarkupContent
            {
                Kind = MarkupKind.Markdown,
                Value = symbolInfo,
            };

            stopwatch.Stop();

            if (shouldTrack)
            {
                telemetry.TrackMetric("Hover_ResponseTime_Ms", stopwatch.ElapsedMilliseconds);
                telemetry.TrackEvent("Hover_Request_Completed", new Dictionary<string, string>
                {
                    { "HasSymbolInfo", (!string.IsNullOrEmpty(symbolInfo)).ToString() },
                });
            }

            return new Hover
            {
                Contents = new MarkedStringsOrMarkupContent(markupContent),
            };
        }
        catch (Exception ex)
        {
            telemetry.TrackException(ex, new Dictionary<string, string>
            {
                { "Handler", "Hover" },
                { "Operation", "Handle" },
            });

            return null;
        }
    }

    /// <summary>
    /// Adds essential .NET core framework and Microsoft Extensions references required for Roslyn compilation.
    /// </summary>
    /// <param name="references">The collection of metadata references to populate with core assemblies.</param>
    /// <param name="seenPaths">A set tracking already processed assembly paths to prevent duplicate references.</param>
    /// <remarks>
    /// This method includes fundamental .NET types (string, object, Console), LINQ support, async/await support,
    /// and Microsoft Extensions libraries commonly used in modern .NET applications (DI, Configuration, Logging, Hosting).
    /// References are added using both direct assembly locations and trusted platform assemblies.
    /// </remarks>
    private static void AddCoreReferences(List<MetadataReference> references, HashSet<string> seenPaths)
    {
        TryAddReference(references, seenPaths, typeof(string).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(object).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(System.Console).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(System.Linq.Enumerable).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(System.Threading.Tasks.Task).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(System.Action).Assembly.Location);
        TryAddReference(references, seenPaths, typeof(System.Linq.Expressions.Expression).Assembly.Location);

        TryAddTrustedReference(references, seenPaths, "netstandard.dll");
        TryAddTrustedReference(references, seenPaths, "System.Runtime.dll");
        TryAddTrustedReference(references, seenPaths, "System.Collections.dll");
        TryAddTrustedReference(references, seenPaths, "System.Linq.Expressions.dll");
        TryAddTrustedReference(references, seenPaths, "Newtonsoft.Json.dll");
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

    private static void TryAddTrustedReference(List<MetadataReference> references, HashSet<string> seenPaths, string assemblyFile)
    {
        string? path = TryGetTrustedAssemblyPath(assemblyFile);
        TryAddReference(references, seenPaths, path);
    }

    /// <summary>
    /// Extracts parameter documentation from XML documentation comments for a specified parameter name.
    /// </summary>
    /// <param name="xml">The XML documentation string to parse. Can be null or whitespace.</param>
    /// <param name="paramName">The name of the parameter to extract documentation for.</param>
    /// <returns>
    /// The trimmed documentation text for the specified parameter if found in the XML,
    /// otherwise returns "Parameter" as a default value. Returns empty string if XML is null or whitespace.
    /// </returns>
    private static string ExtractParameterDocumentation(string? xml, string paramName)
    {
        if (string.IsNullOrWhiteSpace(xml))
        {
            return string.Empty;
        }

        try
        {
            string paramTag = $"<param name=\"{paramName}\">";
            int paramStart = xml.IndexOf(paramTag);
            if (paramStart >= 0)
            {
                int contentStart = paramStart + paramTag.Length;
                int paramEnd = xml.IndexOf("</param>", contentStart);
                if (paramEnd > contentStart)
                {
                    return xml[contentStart..paramEnd].Trim();
                }
            }
        }
        catch
        {
            // Ignore XML parsing errors
        }

        return "Parameter";
    }

    /// <summary>
    /// Determines if a parameter is connection-related.
    /// </summary>
    private static bool IsConnectionParameter(IParameterSymbol parameter)
    {
        // Check parameter attributes
        return parameter.GetAttributes().Any(a =>
            string.Equals(a.AttributeClass?.Name, "ConnectionNameAttribute", StringComparison.Ordinal) ||
            string.Equals(a.AttributeClass?.Name, "ConnectionName", StringComparison.Ordinal)) ||
            parameter.Name.Contains("connection", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Determines if a method belongs to a class that requires a connection by checking
    /// if the class constructor has a [ConnectionName] parameter.
    /// This handles the new SDK pattern where connection is passed to the constructor.
    /// </summary>
    private static bool IsMethodInConnectionClass(IMethodSymbol method)
    {
        if (method?.ContainingType == null)
        {
            return false;
        }

        // Check all constructors of the containing type
        foreach (var constructor in method.ContainingType.Constructors)
        {
            // Check if any constructor parameter has [ConnectionName] attribute
            foreach (var parameter in constructor.Parameters)
            {
                if (IsConnectionParameter(parameter))
                {
                    Console.Error.WriteLine($"[IsMethodInConnectionClass] Found [ConnectionName] in constructor of {method.ContainingType.Name}");
                    return true;
                }
            }
        }

        return false;
    }

    /// <summary>
    /// Finds the position after any trailing comma for comment insertion.
    /// </summary>
    /// <summary>
    /// Checks if the argument needs a trailing comma.
    /// </summary>
    private static bool NeedsTrailingComma(ArgumentSyntax argumentSyntax)
    {
        if (argumentSyntax.Parent is not ArgumentListSyntax argumentList)
        {
            return false;
        }

        int currentIndex = argumentList.Arguments.IndexOf(argumentSyntax);

        // If this is the last argument, no comma needed
        if (currentIndex == argumentList.Arguments.Count - 1)
        {
            return false;
        }

        // Check if there's already a trailing comma
        SyntaxToken? trailingComma = argumentList.Arguments.GetSeparator(currentIndex);

        // If no comma exists but there are more arguments, we need one
        return !trailingComma.HasValue || trailingComma.Value.IsMissing;
    }

    private static (int Line, int Character) GetCommentInsertPosition(ArgumentSyntax argumentSyntax)
    {
        // Get the argument list to check for trailing comma
        if (argumentSyntax.Parent is not ArgumentListSyntax argumentList)
        {
            // Fallback to end of argument
            FileLinePositionSpan argLineSpan = argumentSyntax.GetLocation().GetLineSpan();
            return (argLineSpan.EndLinePosition.Line, argLineSpan.EndLinePosition.Character);
        }

        // Find the index of the current argument
        int currentIndex = argumentList.Arguments.IndexOf(argumentSyntax);

        // Check if there's a comma token after this argument
        SyntaxToken? trailingComma = argumentList.Arguments.GetSeparator(currentIndex);

        if (trailingComma.HasValue && !trailingComma.Value.IsMissing)
        {
            // Insert after the comma
            FileLinePositionSpan commaLineSpan = trailingComma.Value.GetLocation().GetLineSpan();
            return (commaLineSpan.EndLinePosition.Line, commaLineSpan.EndLinePosition.Character);
        }
        else
        {
            // No trailing comma, insert at end of argument
            FileLinePositionSpan argLineSpan = argumentSyntax.GetLocation().GetLineSpan();
            return (argLineSpan.EndLinePosition.Line, argLineSpan.EndLinePosition.Character);
        }
    }

    private static string CreateInsertValueCommandUri(ArgumentSyntax argumentSyntax, string valueToInsert, bool isConnection, string? description = null)
    {
        try
        {
            Console.Error.WriteLine($"[CreateInsertValueCommandUri] Starting - valueToInsert='{valueToInsert}', isConnection={isConnection}");

            // Strip quotes if the value has them (e.g., "value" -> value)
            string cleanValue = valueToInsert.Trim();
            if (cleanValue.StartsWith("\"") && cleanValue.EndsWith("\""))
            {
                cleanValue = cleanValue[1..^1];
            }

            LiteralExpressionSyntax? stringLiteral = null;

            // Handle two cases: lambda expressions and direct string literals
            if (argumentSyntax.Expression is LambdaExpressionSyntax lambda)
            {
                Console.Error.WriteLine("[CreateInsertValueCommandUri] Case 1: Lambda expression");

                // Case 1: Lambda expression (e.g., parameterName: x => "value")
                stringLiteral = lambda.DescendantNodes()
                    .OfType<LiteralExpressionSyntax>()
                    .FirstOrDefault(l => l.IsKind(SyntaxKind.StringLiteralExpression));
            }
            else if (argumentSyntax.Expression is LiteralExpressionSyntax literal &&
                     literal.IsKind(SyntaxKind.StringLiteralExpression))
            {
                Console.Error.WriteLine("[CreateInsertValueCommandUri] Case 2: Direct string literal");

                // Case 2: Direct string literal (e.g., connectionName: "myConnection")
                stringLiteral = literal;
            }

            if (stringLiteral == null)
            {
                Console.Error.WriteLine("[CreateInsertValueCommandUri] No string literal found in argument");
                return "#";
            }

            // Get the position and range of the string content (inside quotes)
            Microsoft.CodeAnalysis.Location location = stringLiteral.GetLocation();
            FileLinePositionSpan lineSpan = location.GetLineSpan();

            // The position should be inside the quotes
            int line = lineSpan.StartLinePosition.Line;
            int startChar = lineSpan.StartLinePosition.Character + 1; // Skip opening quote
            int endChar = lineSpan.EndLinePosition.Character - 1; // Skip closing quote

            Console.Error.WriteLine($"[CreateInsertValueCommandUri] String literal at Line {line}, Char {startChar}-{endChar}");
            Console.Error.WriteLine($"[CreateInsertValueCommandUri] String literal value: '{stringLiteral.Token.ValueText}'");

            // Check if we need to add a trailing comma
            bool needsComma = NeedsTrailingComma(argumentSyntax);
            string valueWithComma = needsComma ? cleanValue + "," : cleanValue;

            Console.Error.WriteLine($"[CreateInsertValueCommandUri] needsComma={needsComma}, final value='{valueWithComma}'");

            // For connection parameters, we never add comments (even if description exists)
            // For dynamic parameters, add comments only if description exists and it's not a connection
            bool shouldAddComment = !isConnection && !string.IsNullOrEmpty(description);

            if (shouldAddComment)
            {
                // Add both value replacement and comment
                (int commentLine, int commentChar) = GetCommentInsertPosition(argumentSyntax);

                // Always use a space before the comment
                string commentText = $" // {description}";

                // Create a custom command with both edits
                object[] edits =
                [
                    new
                    {
                        range = new
                        {
                            start = new { line, character = startChar },
                            end = new { line, character = endChar },
                        },
                        newText = valueWithComma,
                    },
                    new
                    {
                        range = new
                        {
                            start = new { line = commentLine, character = commentChar },
                            end = new { line = commentLine, character = commentChar },
                        },
                        newText = commentText,
                    },
                ];

                var commandArgs = new
                {
                    edits,
                };

                string argsJson = System.Text.Json.JsonSerializer.Serialize(commandArgs);
                string encodedArgs = Uri.EscapeDataString(argsJson);

                return $"command:sdklsp.applyEdits?{encodedArgs}";
            }
            else
            {
                // No comment - just replace the value (with comma if needed)
                // For connection parameters, we MUST use sdklsp.applyEdits with absolute positions
                // because editor.action.insertSnippet uses cursor position
                object[] edits =
                [
                    new
                    {
                        range = new
                        {
                            start = new { line, character = startChar },
                            end = new { line, character = endChar },
                        },
                        newText = valueWithComma,
                    },
                ];

                var commandArgs = new
                {
                    edits,
                };

                string argsJson = System.Text.Json.JsonSerializer.Serialize(commandArgs);
                string encodedArgs = Uri.EscapeDataString(argsJson);

                return $"command:sdklsp.applyEdits?{encodedArgs}";
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[CreateInsertValueCommandUri] Error: {ex.Message}");
            Console.Error.WriteLine($"[CreateInsertValueCommandUri] Stack: {ex.StackTrace}");
            return "#";
        }
    }

    private static string FormatParameterInfo(IParameterSymbol parameter)
    {
        var result = new StringBuilder();
        result.AppendLine("```csharp");
        result.Append($"{parameter.Type.ToDisplayString(ShortTypeFormat)} {parameter.Name}");
        if (parameter.HasExplicitDefaultValue)
        {
            result.Append($" = {parameter.ExplicitDefaultValue}");
        }

        result.AppendLine();
        result.AppendLine("```");
        result.AppendLine("(parameter)");
        return result.ToString();
    }

    /// <summary>
    /// Gets or creates a cached Roslyn compilation for a document.
    /// Uses a time-based and size-based cache eviction strategy.
    /// </summary>
    private CSharpCompilation GetOrCreateCachedCompilation(string documentPath, string documentText, SyntaxTree tree, List<MetadataReference> references)
    {
        lock (compilationCacheLock)
        {
            // Check if we have a valid cached compilation
            if (compilationCache.TryGetValue(documentPath, out var cached))
            {
                var age = DateTime.UtcNow - cached.LastAccess;
                if (age.TotalMinutes < CompilationCacheMaxAgeMinutes)
                {
                    // Update last access time
                    compilationCache[documentPath] = (cached.Compilation, DateTime.UtcNow);
                    telemetry.TrackEvent("Hover_Compilation_Cache_Hit");
                    return cached.Compilation;
                }
                else
                {
                    // Remove expired entry
                    compilationCache.Remove(documentPath);
                }
            }

            telemetry.TrackEvent("Hover_Compilation_Cache_Miss");

            // Create new compilation
            var compilation = CSharpCompilation.Create(
                "HoverAnalysis",
                [tree],
                references);

            // Add to cache
            compilationCache[documentPath] = (compilation, DateTime.UtcNow);

            // Evict old entries if cache is too large
            if (compilationCache.Count > CompilationCacheMaxSize)
            {
                var oldestKey = compilationCache
                    .OrderBy(kvp => kvp.Value.LastAccess)
                    .First().Key;
                compilationCache.Remove(oldestKey);
            }

            return compilation;
        }
    }

    /// <summary>
    /// Gets or creates a cached parameter context for a specific position.
    /// </summary>
    private async Task<HoverHandlerTypes.ParameterContext?> GetOrCreateCachedParameterContext(
        string documentPath,
        Position position,
        SyntaxNode node,
        SemanticModel semanticModel)
    {
        string cacheKey = $"{documentPath}:{position.Line}:{position.Character}:{node.GetHashCode()}";

        lock (parameterContextCacheLock)
        {
            // Check if we have a valid cached context
            if (parameterContextCache.TryGetValue(cacheKey, out var cached))
            {
                var age = DateTime.UtcNow - cached.LastAccess;
                if (age.TotalMinutes < ParameterContextCacheMaxAgeMinutes)
                {
                    // Update last access time
                    parameterContextCache[cacheKey] = (cached.Context, DateTime.UtcNow);
                    telemetry.TrackEvent("Hover_ParameterContext_Cache_Hit");
                    return cached.Context;
                }
                else
                {
                    // Remove expired entry
                    parameterContextCache.Remove(cacheKey);
                }
            }
        }

        telemetry.TrackEvent("Hover_ParameterContext_Cache_Miss");

        // Compute parameter context
        HoverHandlerTypes.ParameterContext? context = await GetParameterContextAsync(node, semanticModel);

        lock (parameterContextCacheLock)
        {
            // Add to cache
            parameterContextCache[cacheKey] = (context, DateTime.UtcNow);

            // Evict old entries if cache is too large
            if (parameterContextCache.Count > ParameterContextCacheMaxSize)
            {
                var oldestKey = parameterContextCache
                    .OrderBy(kvp => kvp.Value.LastAccess)
                    .First().Key;
                parameterContextCache.Remove(oldestKey);
            }
        }

        return context;
    }

    /// <summary>
    /// Clears the compilation cache for a specific document (e.g., when the document changes).
    /// </summary>
    public void ClearCompilationCache(string documentPath)
    {
        lock (compilationCacheLock)
        {
            compilationCache.Remove(documentPath);
        }
    }

    /// <summary>
    /// Clears the parameter context cache for a specific document.
    /// </summary>
    public void ClearParameterContextCache(string documentPath)
    {
        lock (parameterContextCacheLock)
        {
            var keysToRemove = parameterContextCache.Keys
                .Where(k => k.StartsWith(documentPath + ":"))
                .ToList();
            foreach (var key in keysToRemove)
            {
                parameterContextCache.Remove(key);
            }
        }
    }

    [RequiresAssemblyFiles("Calls System.Reflection.Assembly.Location")]
    private async Task<string?> AnalyzeSymbolAtPositionAsync(string documentText, Position position, CancellationToken cancellationToken)
    {
        var totalStopwatch = System.Diagnostics.Stopwatch.StartNew();
        var phaseStopwatch = System.Diagnostics.Stopwatch.StartNew();
        string documentPath = string.Empty;

        try
        {
            // Phase 1: Parse the document
            phaseStopwatch.Restart();
            SyntaxTree tree = CSharpSyntaxTree.ParseText(documentText, cancellationToken: cancellationToken);
            CompilationUnitSyntax root = tree.GetCompilationUnitRoot(cancellationToken: cancellationToken);
            Microsoft.CodeAnalysis.Text.SourceText text = await tree.GetTextAsync(cancellationToken);
            telemetry.TrackMetric("Hover_Phase1_Parse_Ms", phaseStopwatch.ElapsedMilliseconds);

            // Phase 2: Find the position in the document
            phaseStopwatch.Restart();
            if (position.Line >= text.Lines.Count)
            {
                return null;
            }

            Microsoft.CodeAnalysis.Text.TextLine line = text.Lines[position.Line];
            if (position.Character >= line.Span.Length)
            {
                return null;
            }

            int absolutePosition = line.Start + position.Character;
            SyntaxNode? node = root.FindNode(Microsoft.CodeAnalysis.Text.TextSpan.FromBounds(absolutePosition, absolutePosition));

            // Try to find a more specific node if we're looking at an identifier
            if (node is IdentifierNameSyntax && node.Parent != null)
            {
                node = node.Parent;
            }

            // For method calls, we want the invocation expression or member access
            if (node?.Parent is InvocationExpressionSyntax invocation)
            {
                node = invocation;
            }
            else if (node?.Parent is MemberAccessExpressionSyntax memberAccess)
            {
                await Console.Error.WriteLineAsync("[HoverHandler] Found member access, using that instead");
                node = memberAccess;
            }

            if (node == null)
            {
                return null;
            }

            telemetry.TrackMetric("Hover_Phase2_FindNode_Ms", phaseStopwatch.ElapsedMilliseconds);

            // Phase 3: Build references (optimized - reuse if possible)
            phaseStopwatch.Restart();
            var references = new List<MetadataReference>();
            var referencePaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            AddCoreReferences(references, referencePaths);

            // Add SDK assembly references if available
            if (sdkIndex != null)
            {
                int loadedCount = 0;
                foreach (string assemblyPath in sdkIndex.AssemblyPaths)
                {
                    try
                    {
                        if (File.Exists(assemblyPath))
                        {
                            TryAddReference(references, referencePaths, assemblyPath);
                            loadedCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        await Console.Error.WriteLineAsync($"[HoverHandler] Failed to load assembly {assemblyPath}: {ex.Message}");
                    }
                }
            }

            telemetry.TrackMetric("Hover_Phase3_BuildReferences_Ms", phaseStopwatch.ElapsedMilliseconds);

            // Phase 4: Get or create cached compilation
            phaseStopwatch.Restart();
            documentPath = tree.FilePath ?? "unknown";
            var compilation = GetOrCreateCachedCompilation(documentPath, documentText, tree, references);
            SemanticModel semanticModel = compilation.GetSemanticModel(tree);
            telemetry.TrackMetric("Hover_Phase4_GetCompilation_Ms", phaseStopwatch.ElapsedMilliseconds);

            // Phase 5: Check for compilation errors
            phaseStopwatch.Restart();
            System.Collections.Immutable.ImmutableArray<Microsoft.CodeAnalysis.Diagnostic> diagnostics = compilation.GetDiagnostics(cancellationToken);
            var errors = diagnostics.Where(d => d.Severity == Microsoft.CodeAnalysis.DiagnosticSeverity.Error).ToList();
            var warnings = diagnostics.Where(d => d.Severity == Microsoft.CodeAnalysis.DiagnosticSeverity.Warning).ToList();

            if (errors.Count != 0)
            {
                await Console.Error.WriteLineAsync($"[HoverHandler] Compilation has {errors.Count} error(s), {warnings.Count} warning(s)");
                await Console.Error.WriteLineAsync("[HoverHandler] This may prevent proper symbol resolution!");

                foreach (Microsoft.CodeAnalysis.Diagnostic? error in errors.Take(5))
                {
                    FileLinePositionSpan location = error.Location.GetLineSpan();
                    await Console.Error.WriteLineAsync($"[HoverHandler] Error {error.Id} at line {location.StartLinePosition.Line}: {error.GetMessage()}");
                }

                if (errors.Count > 5)
                {
                    await Console.Error.WriteLineAsync($"[HoverHandler] ... and {errors.Count - 5} more errors");
                }
            }
            else
            {
                await Console.Error.WriteLineAsync($"[HoverHandler] Compilation successful with {warnings.Count} warning(s)");
            }

            telemetry.TrackMetric("Hover_Phase5_CheckDiagnostics_Ms", phaseStopwatch.ElapsedMilliseconds);

            // Phase 6: Check if we're hovering over a parameter in a method call first
            phaseStopwatch.Restart();
            await Console.Error.WriteLineAsync($"[HoverHandler] Checking for parameter context on node: {node.GetType().Name} '{node}'");
            await Console.Error.WriteLineAsync($"[HoverHandler] Node parent: {node.Parent?.GetType().Name} '{node.Parent}'");
            await Console.Error.WriteLineAsync($"[HoverHandler] Node grandparent: {node.Parent?.Parent?.GetType().Name} '{node.Parent?.Parent}'");

            HoverHandlerTypes.ParameterContext? parameterContext = await GetOrCreateCachedParameterContext(documentPath, position, node, semanticModel);
            telemetry.TrackMetric("Hover_Phase6_GetParameterContext_Ms", phaseStopwatch.ElapsedMilliseconds);

            if (parameterContext != null)
            {
                await Console.Error.WriteLineAsync("[HoverHandler] ✅ Parameter context found:");
                await Console.Error.WriteLineAsync($"  - Method: {parameterContext.Method?.Name ?? "NULL"}");
                await Console.Error.WriteLineAsync($"  - MethodContainingType: {parameterContext.Method?.ContainingType?.Name ?? "NULL"}");
                await Console.Error.WriteLineAsync($"  - Parameter: {parameterContext.Parameter?.Name ?? "NULL"}");
                await Console.Error.WriteLineAsync($"  - ParameterName: {parameterContext.ParameterName ?? "NULL"}");
                await Console.Error.WriteLineAsync($"  - IsConnectionParameter: {parameterContext.IsConnectionParameter}");
                await Console.Error.WriteLineAsync($"  - ConnectionName: {parameterContext.ConnectionName ?? "NULL"}");
                await Console.Error.WriteLineAsync($"  - ArgumentIndex: {parameterContext.ArgumentIndex}");

                if (parameterContext.Parameter != null)
                {
                    await Console.Error.WriteLineAsync($"  - Parameter.Type: {parameterContext.Parameter.Type?.Name ?? "NULL"}");
                    await Console.Error.WriteLineAsync($"  - Parameter Attributes: {parameterContext.Parameter.GetAttributes().Length}");
                    foreach (AttributeData attr in parameterContext.Parameter.GetAttributes())
                    {
                        await Console.Error.WriteLineAsync($"    * {attr.AttributeClass?.Name ?? "NULL"}");
                    }
                }

                phaseStopwatch.Restart();
                string result = await FormatParameterWithPossibleValuesAsync(parameterContext);
                telemetry.TrackMetric("Hover_Phase7_FormatParameter_Ms", phaseStopwatch.ElapsedMilliseconds);
                telemetry.TrackMetric("Hover_Total_Ms", totalStopwatch.ElapsedMilliseconds);
                return result;
            }
            else
            {
                await Console.Error.WriteLineAsync($"[HoverHandler] ❌ No parameter context found for node: {node.GetType().Name}");
            }

            // Phase 7: Try to get symbol information
            phaseStopwatch.Restart();
            SymbolInfo symbolInfo = semanticModel.GetSymbolInfo(node, cancellationToken: cancellationToken);
            ISymbol? symbol = symbolInfo.Symbol;
            telemetry.TrackMetric("Hover_Phase7_GetSymbolInfo_Ms", phaseStopwatch.ElapsedMilliseconds);

            await Console.Error.WriteLineAsync("[HoverHandler] Symbol lookup result:");
            await Console.Error.WriteLineAsync($"  - symbol is null: {symbol == null}");
            await Console.Error.WriteLineAsync($"  - CandidateSymbols count: {symbolInfo.CandidateSymbols.Length}");
            await Console.Error.WriteLineAsync($"  - CandidateReason: {symbolInfo.CandidateReason}");

            if (symbol != null)
            {
                await Console.Error.WriteLineAsync($"[HoverHandler] Resolved symbol: {symbol.Name} ({symbol.Kind})");
                phaseStopwatch.Restart();
                string result = await FormatSymbolInfoAsync(symbol);
                telemetry.TrackMetric("Hover_Phase8_FormatSymbol_Ms", phaseStopwatch.ElapsedMilliseconds);
                telemetry.TrackMetric("Hover_Total_Ms", totalStopwatch.ElapsedMilliseconds);
                return result;
            }

            // If direct symbol lookup failed, try candidate symbols
            if (symbolInfo.CandidateSymbols.Length > 0)
            {
                ISymbol? candidateSymbol = symbolInfo.CandidateSymbols.FirstOrDefault();
                if (candidateSymbol != null)
                {
                    await Console.Error.WriteLineAsync($"[HoverHandler] Candidate symbol: {candidateSymbol.Name} ({candidateSymbol.Kind})");
                    phaseStopwatch.Restart();
                    string result = await FormatSymbolInfoAsync(candidateSymbol);
                    telemetry.TrackMetric("Hover_Phase8_FormatSymbol_Ms", phaseStopwatch.ElapsedMilliseconds);
                    telemetry.TrackMetric("Hover_Total_Ms", totalStopwatch.ElapsedMilliseconds);
                    return result;
                }
            }

            // If no symbol found, try to get type information
            TypeInfo typeInfo = semanticModel.GetTypeInfo(node, cancellationToken: cancellationToken);
            if (typeInfo.Type != null)
            {
                await Console.Error.WriteLineAsync($"[HoverHandler] Using type info: {typeInfo.Type.Name}");
                phaseStopwatch.Restart();
                string result = await FormatTypeInfoAsync(typeInfo.Type);
                telemetry.TrackMetric("Hover_Phase8_FormatType_Ms", phaseStopwatch.ElapsedMilliseconds);
                telemetry.TrackMetric("Hover_Total_Ms", totalStopwatch.ElapsedMilliseconds);
                return result;
            }

            // Try to find a more specific node if we're at a generic position
            SyntaxNode? parent = node.Parent;
            while (parent != null && parent != root)
            {
                SymbolInfo parentSymbolInfo = semanticModel.GetSymbolInfo(parent, cancellationToken: cancellationToken);
                if (parentSymbolInfo.Symbol != null)
                {
                    await Console.Error.WriteLineAsync($"[HoverHandler] Using parent symbol: {parentSymbolInfo.Symbol.Name}");
                    phaseStopwatch.Restart();
                    string result = await FormatSymbolInfoAsync(parentSymbolInfo.Symbol);
                    telemetry.TrackMetric("Hover_Phase8_FormatSymbol_Ms", phaseStopwatch.ElapsedMilliseconds);
                    telemetry.TrackMetric("Hover_Total_Ms", totalStopwatch.ElapsedMilliseconds);
                    return result;
                }

                parent = parent.Parent;
            }

            await Console.Error.WriteLineAsync("[HoverHandler] No symbol information found for node");
            telemetry.TrackMetric("Hover_Total_Ms", totalStopwatch.ElapsedMilliseconds);
            return null;
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[HoverHandler] ❌ Exception in AnalyzeSymbolAtPositionAsync: {ex.GetType().Name}");
            await Console.Error.WriteLineAsync($"[HoverHandler] Message: {ex.Message}");
            await Console.Error.WriteLineAsync($"[HoverHandler] StackTrace: {ex.StackTrace}");
            return null;
        }
    }

    private async Task<string> FormatSymbolInfoAsync(ISymbol symbol)
    {
        try
        {
            var parts = new List<string>();

            // Format based on symbol type following LSP standard format
            switch (symbol)
            {
                case IMethodSymbol method:
                    parts.Add(await FormatMethodInfoAsync(method));
                    break;

                case IPropertySymbol property:
                    parts.Add(FormatPropertyInfo(property));
                    break;

                case IFieldSymbol field:
                    parts.Add(FormatFieldInfo(field));
                    break;

                case ILocalSymbol local:
                    parts.Add(FormatLocalVariableInfo(local));
                    break;

                case IParameterSymbol parameter:
                    parts.Add(FormatParameterInfo(parameter));
                    break;

                case ITypeSymbol type:
                    parts.Add(await FormatTypeInfoAsync(type));
                    break;

                default:
                    parts.Add($"**{symbol.Kind}**: `{symbol.Name}`");
                    break;
            }

            // Add SDK-specific information following LSP standards
            AddSdkInformation(symbol, parts);

            return string.Join("\n\n", parts);
        }
        catch (Exception ex)
        {
            // Return basic symbol info as fallback
            return symbol != null
                ? $"```csharp\n{symbol.Kind} {symbol.Name}\n```\n\n*Error loading detailed documentation*"
                : "*Error: Symbol is null*";
        }
    }

    private static async Task<string> FormatMethodInfoAsync(IMethodSymbol method)
    {
        try
        {
            var result = new StringBuilder();
            result.AppendLine("```csharp");

            // Show accessibility + return type + method name with simplified parameters
            string paramList = string.Join(
                ", ",
                method.Parameters.Select(p => $"{SimplifyTypeForDisplay(p.Type)} {p.Name}"));
            string access = GetAccessibilityString(method.DeclaredAccessibility);
            string returnType = method.ReturnsVoid ? "void" : SimplifyTypeForDisplay(method.ReturnType);
            result.AppendLine($"{access}{returnType} {method.Name}({paramList})");
            result.AppendLine();
            result.AppendLine("```");

            // 2. Documentation summary
            string? documentation = method.GetDocumentationCommentXml();
            if (!string.IsNullOrWhiteSpace(documentation))
            {
                string? summary = ExtractSummaryFromDocumentation(documentation);
                if (!string.IsNullOrEmpty(summary))
                {
                    result.AppendLine();
                    result.AppendLine(summary);
                }

                // Concise summary only (omit verbose parameter/returns sections for brevity)
            }

            return result.ToString();
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[FormatMethodInfo] Error formatting method {method.Name}: {ex.Message}");
            return $"```csharp\n{method.Name}(...)\n```\n\n(Error formatting method signature)";
        }
    }

    private static string SimplifyTypeForDisplay(ITypeSymbol type)
    {
        ITypeSymbol t = UnwrapCommonWrapperTypes(type);
        return t.ToDisplayString(ShortTypeFormat);
    }

    private static ITypeSymbol UnwrapCommonWrapperTypes(ITypeSymbol type)
    {
        try
        {
            // Unwrap Nullable<T> to T? is handled by ShortTypeFormat; no change needed

            // Unwrap Expression<Func<...>> to the Func's return type
            if (type is INamedTypeSymbol nts)
            {
                if (string.Equals(nts.Name, "Expression", StringComparison.Ordinal)
                    && string.Equals(nts.ContainingNamespace?.ToDisplayString(), "System.Linq.Expressions", StringComparison.Ordinal)
                    && nts.TypeArguments.Length == 1)
                {
                    ITypeSymbol inner = nts.TypeArguments[0];
                    if (inner is INamedTypeSymbol func
                        && string.Equals(func.Name, "Func", StringComparison.Ordinal)
                        && string.Equals(func.ContainingNamespace?.ToDisplayString(), "System", StringComparison.Ordinal)
                        && func.TypeArguments.Length >= 1)
                    {
                        // Func<T1, T2, ..., TResult> -> TResult
                        return UnwrapCommonWrapperTypes(func.TypeArguments.Last());
                    }

                    // Expression<T> where T is not Func — just unwrap one level
                    return UnwrapCommonWrapperTypes(inner);
                }

                // Direct Func<...> parameters: map to return type
                if (string.Equals(nts.Name, "Func", StringComparison.Ordinal)
                    && string.Equals(nts.ContainingNamespace?.ToDisplayString(), "System", StringComparison.Ordinal)
                    && nts.TypeArguments.Length >= 1)
                {
                    return UnwrapCommonWrapperTypes(nts.TypeArguments.Last());
                }
            }
        }
        catch
        {
            // If anything goes wrong, fall back to original type
        }

        return type;
    }

    /// <summary>
    /// Formats property information following LSP standards.
    /// </summary>
    private static string FormatPropertyInfo(IPropertySymbol property)
    {
        var result = new StringBuilder();
        result.AppendLine("```csharp");
        string type = property.Type.ToDisplayString(ShortTypeFormat);
        string accessors = property switch
        {
            { GetMethod: not null, SetMethod: not null } => " { get; set; }",
            { GetMethod: not null } => " { get; }",
            { SetMethod: not null } => " { set; }",
            _ => string.Empty,
        };
        result.AppendLine($"{type} {property.Name}{accessors}");
        result.AppendLine();
        result.AppendLine("```");

        // Add documentation
        string? documentation = property.GetDocumentationCommentXml();
        if (!string.IsNullOrWhiteSpace(documentation))
        {
            string? summary = ExtractSummaryFromDocumentation(documentation);
            if (!string.IsNullOrEmpty(summary))
            {
                result.AppendLine();
                result.AppendLine(summary);
            }
        }

        return result.ToString();
    }

    /// <summary>
    /// Formats field information following LSP standards.
    /// </summary>
    private static string FormatFieldInfo(IFieldSymbol field)
    {
        var result = new StringBuilder();
        result.AppendLine("```csharp");
        string modifiers = field switch
        {
            { IsConst: true } => "const ",
            { IsReadOnly: true } => "readonly ",
            _ => string.Empty,
        };
        string type = field.Type.ToDisplayString(ShortTypeFormat);
        result.AppendLine($"{modifiers}{type} {field.Name}");
        result.AppendLine();
        result.AppendLine("```");

        // Add documentation
        string? documentation = field.GetDocumentationCommentXml();
        if (!string.IsNullOrWhiteSpace(documentation))
        {
            string? summary = ExtractSummaryFromDocumentation(documentation);
            if (!string.IsNullOrEmpty(summary))
            {
                result.AppendLine();
                result.AppendLine(summary);
            }
        }

        return result.ToString();
    }

    /// <summary>
    /// Formats local variable information (simplified format).
    /// </summary>
    private static string FormatLocalVariableInfo(ILocalSymbol local)
    {
        string type = local.Type.ToDisplayString(ShortTypeFormat);
        return $"```csharp\n{type} {local.Name}\n```\n\n(local variable)";
    }

    /// <summary>
    /// Formats type information following LSP standards.
    /// </summary>
    private static string FormatTypeInfo(ITypeSymbol type)
    {
        var result = new StringBuilder();
        result.AppendLine("```csharp");
        string kind = type.TypeKind.ToString().ToLowerInvariant();
        string name = type.ToDisplayString(ShortTypeFormat);
        result.AppendLine($"{kind} {name}");
        result.AppendLine();
        result.AppendLine("```");

        // Add namespace information
        if (type.ContainingNamespace?.IsGlobalNamespace == false)
        {
            result.AppendLine();
            result.AppendLine($"**Namespace:** `{type.ContainingNamespace.ToDisplayString()}`");
        }

        // Add documentation
        string? documentation = type.GetDocumentationCommentXml();
        if (!string.IsNullOrWhiteSpace(documentation))
        {
            string? summary = ExtractSummaryFromDocumentation(documentation);
            if (!string.IsNullOrEmpty(summary))
            {
                result.AppendLine();
                result.AppendLine(summary);
            }
        }

        return result.ToString();
    }

    private static Task<string> FormatTypeInfoAsync(ITypeSymbol type)
    {
        return Task.FromResult(FormatTypeInfo(type));
    }

    private static string GetAccessibilityString(Accessibility accessibility)
    {
        return accessibility switch
        {
            Accessibility.Public => "public ",
            Accessibility.Private => "private ",
            Accessibility.Protected => "protected ",
            Accessibility.Internal => "internal ",
            Accessibility.ProtectedOrInternal => "protected internal ",
            Accessibility.ProtectedAndInternal => "private protected ",
            _ => string.Empty,
        };
    }

    private void AddSdkInformation(ISymbol symbol, List<string> parts)
    {
        bool isFromSdk = IsSymbolFromSdk(symbol);
        if (isFromSdk)
        {
            parts.Add("---"); // Separator line following LSP standards
            parts.Add("**Azure Workflows SDK**");

            // Add usage example for SDK methods
            if (symbol is IMethodSymbol method && method.Name.Contains("Add"))
            {
                string example = GenerateMethodExample(method);
                if (!string.IsNullOrEmpty(example))
                {
                    parts.Add("**Example:**");
                    parts.Add($"```csharp\n{example}\n```");
                }
            }
        }
    }

    private string GenerateMethodExample(IMethodSymbol method)
    {
        if (method.Parameters.Length > 0)
        {
            string instanceName = method.ContainingType?.Name.ToLower().Replace("builder", string.Empty) ?? "agent";
            return $"{instanceName}.{method.Name}({string.Join(", ", method.Parameters.Select(GenerateParameterExample))});";
        }

        return string.Empty;
    }

    private string GenerateParameterExample(IParameterSymbol param)
    {
        return param.Type.Name switch
        {
            "String" => $"\"{param.Name}\"",
            "Int32" => "0",
            "Boolean" => "true",
            "Action" => $"{param.Name} => {{ /* Configure {param.Name} */ }}",
            _ => $"/* {param.Name} */",
        };
    }

    private static string ExtractSummaryFromDocumentation(string? xml)
    {
        if (string.IsNullOrWhiteSpace(xml))
        {
            return string.Empty;
        }

        try
        {
            int summaryStart = xml.IndexOf("<summary>");
            int summaryEnd = xml.IndexOf("</summary>");
            if (summaryStart >= 0 && summaryEnd > summaryStart)
            {
                string summary = xml.Substring(summaryStart + 9, summaryEnd - summaryStart - 9);
                return summary.Trim().Replace("\n", " ").Replace("  ", " ");
            }
        }
        catch
        {
            // Ignore XML parsing errors
        }

        return string.Empty;
    }

    private bool IsSymbolFromSdk(ISymbol symbol)
    {
        if (sdkIndex == null)
        {
            return false;
        }

        string? assemblyName = symbol.ContainingAssembly?.Name;
        if (assemblyName == null)
        {
            return false;
        }

        // Check if any SDK assembly matches
        return sdkIndex.AssemblyPaths.Any(path =>
            System.IO.Path.GetFileNameWithoutExtension(path)
                .Equals(assemblyName, StringComparison.OrdinalIgnoreCase));
    }

    protected override HoverRegistrationOptions CreateRegistrationOptions(HoverCapability capability, ClientCapabilities clientCapabilities)
    {
        return new HoverRegistrationOptions
        {
            DocumentSelector = documentSelector,
        };
    }

    /// <summary>
    /// Helper class to represent parameter context information.
    /// </summary>
    private async Task<HoverHandlerTypes.ParameterContext?> GetParameterContextAsync(SyntaxNode node, SemanticModel semanticModel)
    {
        try
        {
            // Optimized: Check if we're inside an argument of a method call
            // We need to look for the closest ArgumentSyntax ancestor, as the hover might be on:
            // - A string literal: "connectionName"
            // - An identifier: variableName
            // - A member access: obj.Property

            // Optimization 1: Use FirstAncestorOrSelf with type check (faster than manual loop)
            ArgumentSyntax? argument = node.FirstAncestorOrSelf<ArgumentSyntax>();

            // Optimization 2: If FirstAncestorOrSelf didn't work, use a smarter traversal
            // that stops early at known boundaries
            if (argument == null)
            {
                SyntaxNode? current = node;

                // Optimization 3: Reduced depth from 10 to 5 (arguments are typically within 3 levels)
                // and added early termination conditions
                for (int depth = 0; current != null && depth < 5; depth++)
                {
                    // Early termination: Stop at common boundaries
                    switch (current)
                    {
                        case ArgumentSyntax arg:
                            argument = arg;
                            goto FoundArgument;

                        case MethodDeclarationSyntax:
                        case ClassDeclarationSyntax:
                        case NamespaceDeclarationSyntax:
                        case CompilationUnitSyntax:
                            // Hit a boundary, argument won't be found
                            return null;
                    }

                    current = current.Parent;
                }

            FoundArgument:
                ; // Label for early exit from loop
            }

            if (argument == null)
            {
                return null;
            }

            ArgumentListSyntax? argumentList = argument.FirstAncestorOrSelf<ArgumentListSyntax>();
            if (argumentList == null)
            {
                return null;
            }

            InvocationExpressionSyntax? invocation = argumentList.FirstAncestorOrSelf<InvocationExpressionSyntax>();
            if (invocation == null)
            {
                return null;
            }

            // Get the method being called
            SymbolInfo symbolInfo = semanticModel.GetSymbolInfo(invocation);

            IMethodSymbol? method = await TryResolveMethodSymbolAsync(invocation, semanticModel, symbolInfo);

            if (method is null)
            {
                // Try to extract parameter information from the syntax
                int fallbackArgumentIndex = argumentList.Arguments.IndexOf(argument);

                string? namedArgument = argument.NameColon?.Name.Identifier.ValueText;
                bool namedSuggestsConnection = namedArgument?.Contains("connection", StringComparison.OrdinalIgnoreCase) == true;

                var fallbackContext = new HoverHandlerTypes.ParameterContext
                {
                    Method = null,
                    Parameter = null,
                    ArgumentIndex = fallbackArgumentIndex,
                    ArgumentSyntax = argument,
                    ParameterName = namedArgument,
                    IsConnectionParameter = namedSuggestsConnection,
                };

                // Check if this looks like a connection parameter based on the string value
                if (argument.Expression is LiteralExpressionSyntax literal &&
                    literal.Token.IsKind(Microsoft.CodeAnalysis.CSharp.SyntaxKind.StringLiteralToken))
                {
                    string stringValue = literal.Token.ValueText;

                    // Get current connections
                    ConnectionsConfig? connections = connectionsService.GetConnections();

                    // Check if this string value matches any of our connections (by key)
                    bool isConnectionKey = connections?.ManagedApiConnections?.ContainsKey(stringValue) == true;

                    // Also check if this string value matches any connection ID
                    string? matchedConnectionKey = null;
                    if (!isConnectionKey && connections?.ManagedApiConnections != null)
                    {
                        foreach (KeyValuePair<string, ManagedApiConnection> kvp in connections.ManagedApiConnections)
                        {
                            string connectionId = kvp.Value.Connection?.Id ?? string.Empty;
                            if (connectionId.Contains(stringValue, StringComparison.OrdinalIgnoreCase))
                            {
                                matchedConnectionKey = kvp.Key;
                                break;
                            }
                        }
                    }

                    fallbackContext.ConnectionName = stringValue;

                    if (isConnectionKey || matchedConnectionKey != null)
                    {
                        fallbackContext.IsConnectionParameter = true;
                        fallbackContext.ConnectionName = matchedConnectionKey ?? stringValue;

                        telemetry.TrackEvent("Connection_Parameter_Detected", new Dictionary<string, string>
                        {
                            { "ConnectionKey", matchedConnectionKey ?? stringValue },
                        });
                    }
                }

                return fallbackContext.IsConnectionParameter || !string.IsNullOrEmpty(fallbackContext.ParameterName) ? fallbackContext : null;
            }

            // Find which parameter this argument corresponds to
            int argumentIndex = argumentList.Arguments.IndexOf(argument);

            string? argumentName = argument.NameColon?.Name.Identifier.ValueText;
            if (!string.IsNullOrEmpty(argumentName))
            {
                IParameterSymbol? byName = method.Parameters.FirstOrDefault(p => string.Equals(p.Name, argumentName, StringComparison.Ordinal));
                if (byName != null)
                {
                    argumentIndex = byName.Ordinal;
                }
            }

            IParameterSymbol? parameter = null;
            if (argumentIndex >= 0 && argumentIndex < method.Parameters.Length)
            {
                parameter = method.Parameters[argumentIndex];
            }

            bool nameSuggestsConnection = argumentName?.Contains("connection", StringComparison.OrdinalIgnoreCase) == true;

            if (parameter == null)
            {
                if (string.IsNullOrEmpty(argumentName))
                {
                    return null;
                }

                var fallbackContext = new HoverHandlerTypes.ParameterContext
                {
                    Method = method,
                    Parameter = null,
                    ArgumentIndex = Math.Max(argumentIndex, 0),
                    ArgumentSyntax = argument,
                    ParameterName = argumentName,
                    IsConnectionParameter = nameSuggestsConnection,
                };

                if (argument.Expression is LiteralExpressionSyntax literal && literal.Token.IsKind(Microsoft.CodeAnalysis.CSharp.SyntaxKind.StringLiteralToken))
                {
                    fallbackContext.ConnectionName = literal.Token.ValueText;
                }

                return fallbackContext;
            }

            var resolvedContext = new HoverHandlerTypes.ParameterContext
            {
                Method = method,
                Parameter = parameter,
                ArgumentIndex = argumentIndex,
                ArgumentSyntax = argument,
                ParameterName = parameter.Name,
                IsConnectionParameter = IsConnectionParameter(parameter) || nameSuggestsConnection,
            };

            if (resolvedContext.IsConnectionParameter && argument.Expression is LiteralExpressionSyntax literalArg &&
                literalArg.Token.IsKind(Microsoft.CodeAnalysis.CSharp.SyntaxKind.StringLiteralToken))
            {
                resolvedContext.ConnectionName = literalArg.Token.ValueText;
            }

            return resolvedContext;
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[ParameterContext] Exception: {ex}");
            return null;
        }
    }

    /// <summary>
    /// Formats parameter information with possible values based on context.
    /// Supports three paths: Connection parameters, Dynamic parameters, and Standard parameters.
    /// </summary>
    private async Task<string> FormatParameterWithPossibleValuesAsync(HoverHandlerTypes.ParameterContext context)
    {
        var result = new StringBuilder();

        // Build parameter signature section
        AppendParameterSignature(result, context);

        // Determine parameter type: Connection, Dynamic, or Standard
        bool isConnection = IsConnectionParameterContext(context);
        bool isDynamic = !isConnection && HasDynamicValuesAttribute(context);

        await Console.Error.WriteLineAsync($"[FormatParameterWithPossibleValues] isConnection={isConnection}, isDynamic={isDynamic}");

        if (isConnection)
        {
            // Path 1: Connection parameters
            var connectionValues = GetConnectionParameterValues().ToList();
            await Console.Error.WriteLineAsync($"[FormatParameterWithPossibleValues] Connection path - found {connectionValues.Count} connections");
            AppendParameterValues(result, connectionValues, context, isConnection: true);
        }
        else if (isDynamic)
        {
            // Path 2: Dynamic parameters
            await Console.Error.WriteLineAsync("[FormatParameterWithPossibleValues] Dynamic path - fetching values");
            List<HoverHandlerTypes.ParameterValue> dynamicValues = await FetchDynamicParameterValuesAsync(context);
            int valueCount = dynamicValues?.Count ?? 0;
            await Console.Error.WriteLineAsync($"[FormatParameterWithPossibleValues] Dynamic path - found {valueCount} values");

            if (dynamicValues != null)
            {
                AppendParameterValues(result, dynamicValues, context, isConnection: false);
            }
        }
        else
        {
            // Path 3: Standard parameters - show C# documentation style hover
            await Console.Error.WriteLineAsync("[FormatParameterWithPossibleValues] Standard parameter path");
            AppendStandardParameterDocumentation(result, context);
        }

        return result.ToString();
    }

    /// <summary>
    /// Appends the parameter signature section to the result.
    /// </summary>
    private static void AppendParameterSignature(StringBuilder result, HoverHandlerTypes.ParameterContext context)
    {
        string parameterLabel = context.Parameter?.Name ?? context.ParameterName ?? "parameter";
        string parameterType = context.Parameter?.Type != null
            ? SimplifyTypeForDisplay(context.Parameter.Type)
            : string.Empty;

        result.AppendLine("```csharp");
        result.AppendLine($"{parameterType} {parameterLabel}");
        result.AppendLine("```");
        result.AppendLine();
    }

    /// <summary>
    /// Determines if the parameter context represents a connection parameter.
    /// </summary>
    private static bool IsConnectionParameterContext(HoverHandlerTypes.ParameterContext context)
    {
        bool result = false;
        string reason = string.Empty;

        if (context.IsConnectionParameter)
        {
            result = true;
            reason = "context.IsConnectionParameter=true";
        }
        else if (context.Parameter != null && IsConnectionParameter(context.Parameter))
        {
            result = true;
            reason = "IsConnectionParameter(parameter)=true";
        }
        else
        {
            string parameterLabel = context.Parameter?.Name ?? context.ParameterName ?? string.Empty;
            if (parameterLabel.Contains("connection", StringComparison.OrdinalIgnoreCase))
            {
                result = true;
                reason = $"parameter name '{parameterLabel}' contains 'connection'";
            }
        }

        Console.Error.WriteLine($"[IsConnectionParameterContext] Result={result}, Reason={reason}, ParameterName={context.Parameter?.Name ?? context.ParameterName ?? "NULL"}");
        return result;
    }

    /// <summary>
    /// Checks if a parameter context has the DynamicValues attribute.
    /// </summary>
    private static bool HasDynamicValuesAttribute(HoverHandlerTypes.ParameterContext context)
    {
        if (context.Parameter == null)
        {
            Console.Error.WriteLine($"[HasDynamicValuesAttribute] No parameter symbol, trying inference from name: {context.ParameterName}");

            // Fallback: infer from parameter name patterns
            string? inferred = InferOperationFromParameterName(context.ParameterName);
            Console.Error.WriteLine($"[HasDynamicValuesAttribute] Inferred operation: {inferred ?? "NULL"}");
            return !string.IsNullOrEmpty(inferred);
        }

        (bool hasDynamicValues, string? operationName) = GetDynamicValuesAttribute(context.Parameter);
        Console.Error.WriteLine($"[HasDynamicValuesAttribute] Parameter={context.Parameter.Name}, hasDynamicValues={hasDynamicValues}, operationName={operationName ?? "NULL"}");
        return hasDynamicValues;
    }

    /// <summary>
    /// Appends standard C# parameter documentation following LSP and IntelliSense conventions.
    /// This is used for parameters that are neither connection nor dynamic values parameters.
    /// </summary>
    private static void AppendStandardParameterDocumentation(StringBuilder result, HoverHandlerTypes.ParameterContext context)
    {
        // Extract XML documentation for the parameter
        string? paramDoc = ExtractParameterDocFromContext(context);

        if (!string.IsNullOrEmpty(paramDoc))
        {
            result.AppendLine(paramDoc);
            result.AppendLine();
        }

        // Add parameter metadata
        if (context.Parameter != null)
        {
            // Check if this is an Input enum parameter and show available values
            ITypeSymbol? paramType = context.Parameter.Type;
            if (paramType != null)
            {
                // Unwrap Expression<Func<T>> to get the actual type
                ITypeSymbol unwrappedType = UnwrapExpressionFuncType(paramType);

                // Check if it's an enum, especially an Input enum
                if (unwrappedType is INamedTypeSymbol namedType &&
                    namedType.TypeKind == TypeKind.Enum &&
                    namedType.Name.EndsWith("Input", StringComparison.Ordinal))
                {
                    AppendEnumValues(result, namedType);
                }
            }

            // Show default value if present
            if (context.Parameter.HasExplicitDefaultValue)
            {
                string defaultValue = context.Parameter.ExplicitDefaultValue?.ToString() ?? "null";
                result.AppendLine($"**Default value:** `{defaultValue}`");
                result.AppendLine();
            }

            // Show parameter attributes if any
            var attributes = context.Parameter.GetAttributes()
                .Where(a => a.AttributeClass?.Name.Contains("Compiler", StringComparison.Ordinal) == false)
                .ToList();

            if (attributes.Count > 0)
            {
                result.AppendLine("**Attributes:**");
                foreach (AttributeData? attr in attributes)
                {
                    string attrName = attr.AttributeClass?.Name.Replace("Attribute", string.Empty) ?? "Unknown";
                    result.AppendLine($"- `[{attrName}]`");
                }

                result.AppendLine();
            }

            // Show parameter modifiers (ref, out, in, params)
            if (context.Parameter.RefKind != RefKind.None)
            {
                string refKindStr = context.Parameter.RefKind switch
                {
                    RefKind.Ref => "ref",
                    RefKind.Out => "out",
                    RefKind.In => "in",
                    RefKind.RefReadOnlyParameter => "ref readonly",
                    _ => string.Empty,
                };

                if (!string.IsNullOrEmpty(refKindStr))
                {
                    result.AppendLine($"**Modifier:** `{refKindStr}`");
                    result.AppendLine();
                }
            }

            if (context.Parameter.IsParams)
            {
                result.AppendLine("**Variable arguments:** This parameter accepts a variable number of arguments (`params`)");
                result.AppendLine();
            }

            // Show nullability information for reference types
            if (context.Parameter.Type.IsReferenceType)
            {
                string nullability = context.Parameter.NullableAnnotation switch
                {
                    NullableAnnotation.Annotated => "Nullable",
                    NullableAnnotation.NotAnnotated => "Non-nullable",
                    _ => string.Empty,
                };

                if (!string.IsNullOrEmpty(nullability))
                {
                    result.AppendLine($"**Nullability:** {nullability}");
                    result.AppendLine();
                }
            }
        }

        // Add containing method context
        if (context.Method != null)
        {
            result.AppendLine("---");
            result.AppendLine();
            result.AppendLine($"**Method:** `{context.Method.Name}`");

            if (context.Method.ContainingType != null)
            {
                result.AppendLine($"**Containing type:** `{context.Method.ContainingType.ToDisplayString(ShortTypeFormat)}`");
            }
        }
    }

    /// <summary>
    /// Fetches dynamic values for parameters with DynamicValues attribute.
    /// </summary>
    private async Task<List<HoverHandlerTypes.ParameterValue>> FetchDynamicParameterValuesAsync(HoverHandlerTypes.ParameterContext context)
    {
        var values = new List<HoverHandlerTypes.ParameterValue>();

        // Handle fallback case where we don't have method/parameter symbols
        if (context.Method == null || context.Parameter == null)
        {
            values.AddRange(await FetchDynamicValuesFromInferenceAsync(context));
        }
        else
        {
            values.AddRange(await FetchDynamicValuesFromAttributeAsync(context));
        }

        return values;
    }

    /// <summary>
    /// Attempts to fetch dynamic values by inferring operation from parameter name.
    /// </summary>
    private async Task<List<HoverHandlerTypes.ParameterValue>> FetchDynamicValuesFromInferenceAsync(HoverHandlerTypes.ParameterContext context)
    {
        var values = new List<HoverHandlerTypes.ParameterValue>();

        // Look for lambda expressions which are common with DynamicValues parameters
        if (context.ArgumentSyntax.Expression is SimpleLambdaExpressionSyntax or ParenthesizedLambdaExpressionSyntax)
        {
            string? inferredOperation = InferOperationFromParameterName(context.ParameterName);
            if (!string.IsNullOrEmpty(inferredOperation))
            {
                IEnumerable<HoverHandlerTypes.ParameterValue>? dynamicValues = await FetchDynamicValuesAsync(inferredOperation, context);
                if (dynamicValues != null)
                {
                    values.AddRange(dynamicValues);
                }
            }
        }

        return values;
    }

    /// <summary>
    /// Fetches dynamic values using the DynamicValues attribute on the parameter.
    /// </summary>
    private async Task<List<HoverHandlerTypes.ParameterValue>> FetchDynamicValuesFromAttributeAsync(HoverHandlerTypes.ParameterContext context)
    {
        var values = new List<HoverHandlerTypes.ParameterValue>();

        (bool hasDynamicValues, string? operationName) = GetDynamicValuesAttribute(context.Parameter!);

        if (hasDynamicValues && !string.IsNullOrEmpty(operationName))
        {
            IEnumerable<HoverHandlerTypes.ParameterValue>? dynamicValues = await FetchDynamicValuesAsync(operationName, context);
            if (dynamicValues != null)
            {
                values.AddRange(dynamicValues);
            }
        }

        return values;
    }

    /// <summary>
    /// Finds the connection parameter ArgumentSyntax in the invocation.
    /// </summary>
    private static ArgumentSyntax? FindConnectionParameterArgument(HoverHandlerTypes.ParameterContext context)
    {
        try
        {
            InvocationExpressionSyntax? invocation = context.ArgumentSyntax.FirstAncestorOrSelf<InvocationExpressionSyntax>();
            if (invocation?.ArgumentList == null)
            {
                return null;
            }

            ArgumentListSyntax argumentList = invocation.ArgumentList;

            // If we have method symbol info, find the connection parameter by attribute
            if (context.Method != null)
            {
                IParameterSymbol? connectionParameter = context.Method.Parameters
                    .FirstOrDefault(p => IsConnectionParameter(p));

                if (connectionParameter != null)
                {
                    int connectionParameterIndex = connectionParameter.Ordinal;
                    if (connectionParameterIndex < argumentList.Arguments.Count)
                    {
                        ArgumentSyntax foundArg = argumentList.Arguments[connectionParameterIndex];
                        Console.Error.WriteLine($"[FindConnectionParameterArgument] Returning argument at index {connectionParameterIndex}");
                        return foundArg;
                    }
                }
            }

            // Fallback: Look for an argument with a name containing "connection"
            foreach (ArgumentSyntax arg in argumentList.Arguments)
            {
                string? argName = arg.NameColon?.Name.Identifier.ValueText;

                if (argName?.Contains("connection", StringComparison.OrdinalIgnoreCase) == true)
                {
                    return arg;
                }
            }

            // Last fallback: Look for the first string literal argument (likely the connection)
            foreach (ArgumentSyntax arg in argumentList.Arguments)
            {
                if (arg.Expression is LiteralExpressionSyntax literal &&
                    literal.Token.IsKind(SyntaxKind.StringLiteralToken))
                {
                    return arg;
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[FindConnectionParameterArgument] Error: {ex.Message}");
            Console.Error.WriteLine($"[FindConnectionParameterArgument] Stack: {ex.StackTrace}");
            return null;
        }
    }

    /// <summary>
    /// Appends parameter values section with clickable links.
    /// </summary>
    private static void AppendParameterValues(StringBuilder result, List<HoverHandlerTypes.ParameterValue> values, HoverHandlerTypes.ParameterContext context, bool isConnection)
    {
        string sectionTitle = isConnection ? "**Possible values:**" : "**Dynamic values:**";
        result.AppendLine(sectionTitle);

        Console.Error.WriteLine($"[AppendParameterValues] isConnection={isConnection}, values.Count={values.Count}");

        if (values.Count != 0)
        {
            result.AppendLine();

            // For connection parameters, find the actual connection argument to insert into
            ArgumentSyntax targetArgument = context.ArgumentSyntax;
            if (isConnection)
            {
                ArgumentSyntax? connectionArg = FindConnectionParameterArgument(context);
                if (connectionArg != null)
                {
                    targetArgument = connectionArg;
                }
            }

            foreach (HoverHandlerTypes.ParameterValue value in values)
            {
                string commandUri = CreateInsertValueCommandUri(targetArgument, value.Value, isConnection, value.Description);
                result.AppendLine($"- [{value.Description}]({commandUri})");
            }
        }
    }

    /// <summary>
    /// Extracts parameter documentation from context.
    /// </summary>
    private static string ExtractParameterDocFromContext(HoverHandlerTypes.ParameterContext context)
    {
        if (context.Method == null || context.Parameter == null)
        {
            return string.Empty;
        }

        string? methodDoc = context.Method.GetDocumentationCommentXml();
        return ExtractParameterDocumentation(methodDoc, context.Parameter.Name ?? string.Empty);
    }

    /// <summary>
    /// Gets possible connection values from the loaded connections configuration.
    /// </summary>
    private IEnumerable<HoverHandlerTypes.ParameterValue> GetConnectionParameterValues()
    {
        ConnectionsConfig? connections = connectionsService.GetConnections();

        return connections?.ManagedApiConnections == null
            ? Enumerable.Empty<HoverHandlerTypes.ParameterValue>()
            : connections.ManagedApiConnections.Select(kvp => new HoverHandlerTypes.ParameterValue
            {
                Value = $"\"{kvp.Key}\"",
                Description = $"{kvp.Key}",
            });
    }

    /// <summary>
    /// Infers an operation name from common parameter name patterns.
    /// </summary>
    private static string? InferOperationFromParameterName(string? parameterName)
    {
        if (string.IsNullOrEmpty(parameterName))
        {
            return null;
        }

        string lower = parameterName.ToLowerInvariant();

        // Common patterns for Microsoft Forms
        if (lower.Contains("formid") || lower.Contains("form_id"))
        {
            return "ListForms";
        }

        // Common patterns for Teams
        return lower.Contains("teamid") || lower.Contains("team_id")
            ? "GetAllTeams"
            : lower.Contains("channelid") || lower.Contains("channel_id") ? "GetChannelsForGroup" : null;
    }

    private static async Task<IMethodSymbol?> TryResolveMethodSymbolAsync(InvocationExpressionSyntax invocation, SemanticModel semanticModel, SymbolInfo initialSymbolInfo)
    {
        if (initialSymbolInfo.Symbol is IMethodSymbol direct)
        {
            return direct;
        }

        IMethodSymbol? candidate = initialSymbolInfo.CandidateSymbols.OfType<IMethodSymbol>().FirstOrDefault();
        if (candidate != null)
        {
            return candidate;
        }

        if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
        {
            // Try to get type info of the expression being accessed
            _ = semanticModel.GetTypeInfo(memberAccess.Expression);

            SymbolInfo nameInfo = semanticModel.GetSymbolInfo(memberAccess.Name);

            if (nameInfo.Symbol is IMethodSymbol nameMethod)
            {
                return nameMethod;
            }

            candidate = nameInfo.CandidateSymbols.OfType<IMethodSymbol>().FirstOrDefault();
            if (candidate != null)
            {
                return candidate;
            }

            SymbolInfo memberInfo = semanticModel.GetSymbolInfo(memberAccess);
            if (memberInfo.Symbol is IMethodSymbol memberMethod)
            {
                return memberMethod;
            }

            candidate = memberInfo.CandidateSymbols.OfType<IMethodSymbol>().FirstOrDefault();
            if (candidate != null)
            {
                return candidate;
            }
        }

        return null;
    }

    /// <summary>
    /// Tries to get connector operation information from a method's attributes.
    /// This is a simplified version of the existing method in CodeLensHandler.
    /// </summary>
    private static (string? ConnectorType, string? ConnectorName) TryGetConnectorOperationInfo(IMethodSymbol method)
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

                break;
            }
        }

        return (connectorType, connectorName);
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
        }
    }

    /// <summary>
    /// Gets enum name or value from a typed constant.
    /// </summary>
    private static string? GetEnumNameOrValue(TypedConstant constant)
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
                        return member.Name;
                    }
                }
            }

            return constant.Value?.ToString();
        }
        catch
        {
            return null;
        }
    }

    // Helper functions
    private static (bool HasDynamicValues, string? OperationName) GetDynamicValuesAttribute(IParameterSymbol parameter)
    {
        foreach (AttributeData attr in parameter.GetAttributes())
        {
            string attrName = attr.AttributeClass?.Name ?? string.Empty;

            if (attrName.Equals("DynamicValuesAttribute", StringComparison.Ordinal) ||
                attrName.Equals("DynamicValues", StringComparison.Ordinal))
            {
                // The operation name is the first constructor argument
                if (attr.ConstructorArguments.Length > 0)
                {
                    string? operationName = attr.ConstructorArguments[0].Value?.ToString();
                    if (!string.IsNullOrEmpty(operationName))
                    {
                        return (true, operationName);
                    }
                }
            }
        }

        return (false, null);
    }

    /// <summary>
    /// Fetches dynamic values from an API endpoint based on the operation name.
    /// </summary>
    private async Task<IEnumerable<HoverHandlerTypes.ParameterValue>?> FetchDynamicValuesAsync(
        string operationName,
        HoverHandlerTypes.ParameterContext context)
    {
        try
        {
            await Console.Error.WriteLineAsync($"[FetchDynamicValues] Starting - operationName={operationName}");

            // Try to get connector information from the method if available
            string? connectorName = null;
            string? connectorType = null;

            if (context.Method != null)
            {
                (connectorType, connectorName) = TryGetConnectorOperationInfo(context.Method);
                await Console.Error.WriteLineAsync($"[FetchDynamicValues] From method attributes: connectorName={connectorName ?? "NULL"}");
            }

            // If we couldn't get connector from method attributes, try to infer from context
            if (string.IsNullOrEmpty(connectorName))
            {
                connectorName = await InferConnectorNameFromOperationAsync(operationName, context);
                await Console.Error.WriteLineAsync($"[FetchDynamicValues] Inferred: connectorName={connectorName ?? "NULL"}");
            }

            if (string.IsNullOrEmpty(connectorName))
            {
                await Console.Error.WriteLineAsync("[FetchDynamicValues] ❌ No connector name - cannot fetch values");
                return null;
            }

            // Extract connection name from the invocation
            string? connectionName = ExtractConnectionName(context);
            await Console.Error.WriteLineAsync($"[FetchDynamicValues] Extracted connectionName={connectionName ?? "NULL"}");

            if (string.IsNullOrEmpty(connectionName))
            {
                await Console.Error.WriteLineAsync("[FetchDynamicValues] ❌ No connection name - cannot fetch values");
                return null;
            }

            // Check if values are already in the LSP store
            List<DynamicValueItem>? cachedValues = lspStore.DynamicData.Get(connectorName, operationName, connectionName);
            if (cachedValues != null)
            {
                await Console.Error.WriteLineAsync($"[FetchDynamicValues] Using cached values from LSPStore ({cachedValues.Count} items)");
                return cachedValues.Select(v => new HoverHandlerTypes.ParameterValue
                {
                    Value = v.Value,
                    Description = v.Description,
                });
            }

            // Build API URL based on connector, operation and api service config
            string? apiUrl = BuildDynamicApiUrl(connectorName, operationName, context);
            HoverHandlerTypes.DynamicInvokePayload? payload = BuildDynamicApiPayload(connectorName, operationName, context);

            if (string.IsNullOrEmpty(apiUrl))
            {
                return null;
            }

            if (payload == null)
            {
                await Console.Error.WriteLineAsync($"[FetchDynamicValues] Could not build API payload for {connectorName}.{operationName}");
                return null;
            }

            await Console.Error.WriteLineAsync($"[FetchDynamicValues] Calling API: {apiUrl}");
            await Console.Error.WriteLineAsync($"[FetchDynamicValues] Payload: {System.Text.Json.JsonSerializer.Serialize(payload)}");

            // Make the API call based on the connector type
            IEnumerable<HoverHandlerTypes.ParameterValue>? values = await FetchDynamicValuesAsync(connectorName, apiUrl, payload);

            // Store the values in the LSP store for later use by CompletionHandler
            if (values != null)
            {
                var storeItems = values.Select(v => new DynamicValueItem
                {
                    Value = v.Value,
                    Description = v.Description,
                }).ToList();
                lspStore.DynamicData.Set(connectorName, operationName, connectionName, storeItems);
                await Console.Error.WriteLineAsync($"[FetchDynamicValues] Stored {storeItems.Count} values in LSPStore");
            }

            return values;
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[FetchDynamicValues] Error: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Infers the connector name from the operation name and context when method attributes aren't available.
    /// </summary>
    private static async Task<string?> InferConnectorNameFromOperationAsync(string operationName, HoverHandlerTypes.ParameterContext context)
    {
        // Common operation name patterns
        if (operationName.Contains("ServiceNow", StringComparison.OrdinalIgnoreCase))
        {
            return "servicenow";
        }

        if (operationName.Contains("Dataverse", StringComparison.OrdinalIgnoreCase) ||
            operationName.Contains("CommonDataService", StringComparison.OrdinalIgnoreCase) ||
            operationName.Contains("Commondataservice", StringComparison.OrdinalIgnoreCase))
        {
            return "commondataservice";
        }

        if (operationName.Contains("Agent", StringComparison.OrdinalIgnoreCase) ||
            operationName.Contains("Thread", StringComparison.OrdinalIgnoreCase) ||
            operationName.Contains("Run", StringComparison.OrdinalIgnoreCase))
        {
            return "azureagentservice";
        }

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

        if (operationName.Contains("Office", StringComparison.OrdinalIgnoreCase))
        {
            return "office365";
        }

        if (operationName.Contains("Weather", StringComparison.OrdinalIgnoreCase))
        {
            return "msnweather";
        }

        // Try to infer from the method name if available
        if (context.Method != null)
        {
            string methodName = context.Method.Name.ToLowerInvariant();
            string containingType = context.Method.ContainingType?.Name.ToLowerInvariant() ?? string.Empty;

            string? typeInferred = NormalizeConnectorNameFromContainingType(context.Method.ContainingType?.Name);
            if (!string.IsNullOrWhiteSpace(typeInferred))
            {
                return typeInferred;
            }

            if (methodName.Contains("form") || containingType.Contains("form"))
            {
                return "microsoftforms";
            }

            if (methodName.Contains("team") || containingType.Contains("team"))
            {
                return "teams";
            }
        }

        return null;
    }

    private static string? NormalizeConnectorNameFromContainingType(string? typeName)
    {
        if (string.IsNullOrWhiteSpace(typeName))
        {
            return null;
        }

        string normalized = typeName;
        if (normalized.EndsWith("Actions", StringComparison.Ordinal))
        {
            normalized = normalized[..^"Actions".Length];
        }
        else if (normalized.EndsWith("Triggers", StringComparison.Ordinal))
        {
            normalized = normalized[..^"Triggers".Length];
        }

        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        return normalized.ToLowerInvariant();
    }

    /// <summary>
    /// Extracts the connection name from the parameter context by looking for the parameter with [ConnectionName] attribute.
    /// </summary>
    private static string? ExtractConnectionName(HoverHandlerTypes.ParameterContext context)
    {
        return ExtractConnectionNameFromMethodCall(context);
    }

    private async Task<IEnumerable<HoverHandlerTypes.ParameterValue>?> FetchDynamicValuesAsync(string connectorName, string apiUrl, HoverHandlerTypes.DynamicInvokePayload payload)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            await Console.Error.WriteLineAsync("[FetchDynamicValuesAsync] About to call API...");
            await Console.Error.WriteLineAsync($"[FetchDynamicValuesAsync] API Config - BearerToken is null: {apiService.Config.BearerToken == null}");
            await Console.Error.WriteLineAsync($"[FetchDynamicValuesAsync] API Config - BearerToken length: {apiService.Config.BearerToken?.Length ?? 0}");

            // Call Azure dynamicInvoke API with the payload
            // The body is an array directly, not wrapped in an object
            HoverHandlerTypes.DynamicInvokeResponse<List<HoverHandlerTypes.FormItem>>? dynamicResponse = await apiService.PostJsonAsync<HoverHandlerTypes.DynamicInvokeResponse<List<HoverHandlerTypes.FormItem>>>(apiUrl, payload, CancellationToken.None);

            await Console.Error.WriteLineAsync("[FetchDynamicValuesAsync] API call completed");
            await Console.Error.WriteLineAsync("[FetchDynamicValuesAsync] Response received:");
            await Console.Error.WriteLineAsync($"  - dynamicResponse is null: {dynamicResponse == null}");

            if (dynamicResponse != null)
            {
                await Console.Error.WriteLineAsync($"  - dynamicResponse.Response is null: {dynamicResponse.Response == null}");

                if (dynamicResponse.Response != null)
                {
                    await Console.Error.WriteLineAsync($"  - dynamicResponse.Response.StatusCode: {dynamicResponse.Response.StatusCode ?? "NULL"}");
                    await Console.Error.WriteLineAsync($"  - dynamicResponse.Response.Body is null: {dynamicResponse.Response.Body == null}");

                    if (dynamicResponse.Response.Body != null)
                    {
                        await Console.Error.WriteLineAsync($"  - dynamicResponse.Response.Body.Count: {dynamicResponse.Response.Body.Count}");
                    }
                }
            }

            // Extract the body from the nested response structure
            List<HoverHandlerTypes.FormItem>? forms = dynamicResponse?.Response?.Body;

            if (forms == null || forms.Count == 0)
            {
                await Console.Error.WriteLineAsync("[FetchDynamicValuesAsync] ❌ No forms data in response");
                return null;
            }

            stopwatch.Stop();

            await Console.Error.WriteLineAsync($"[FetchDynamicValuesAsync] ✅ Successfully fetched {forms.Count} forms");

            telemetry.TrackEvent("DynamicValues_Fetched", new Dictionary<string, string>
            {
                { "ConnectorName", connectorName },
                { "ValueCount", forms.Count.ToString() },
            });
            telemetry.TrackMetric("DynamicValues_FetchTime_Ms", stopwatch.ElapsedMilliseconds);

            // Convert forms to parameter values for IntelliSense
            return forms.Select(form =>
            {
                return new HoverHandlerTypes.ParameterValue
                {
                    Value = $"\"{form.Id}\"",
                    Description = form.Title ?? "Untitled Form",
                };
            });
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[FetchDynamicValuesAsync] ❌ Exception caught: {ex.GetType().Name}");
            await Console.Error.WriteLineAsync($"[FetchDynamicValuesAsync] Error for {connectorName}: {ex.Message}");
            await Console.Error.WriteLineAsync($"[FetchDynamicValuesAsync] Stack trace: {ex.StackTrace}");

            telemetry.TrackException(ex, new Dictionary<string, string>
            {
                { "Handler", "Hover" },
                { "Operation", "FetchDynamicValues" },
                { "ConnectorName", connectorName },
            });

            return null;
        }
    }

    /// <summary>
    /// Builds the API URL for fetching dynamic values based on connector and operation.
    /// </summary>
    private string? BuildDynamicApiUrl(string connectorName, string operationName, HoverHandlerTypes.ParameterContext context)
    {
        ApiServiceConfig apiConfiguration = apiService.Config;

        // Extract connection name from the method call
        string? connectionName = ExtractConnectionNameFromMethodCall(context);

        return string.IsNullOrEmpty(connectionName)
            ? null
            : $"{apiConfiguration.BaseUrl}/subscriptions/{apiConfiguration.SubscriptionId}/resourceGroups/{apiConfiguration.ResourceGroup}/providers/Microsoft.Web/connections/{connectionName}/dynamicInvoke?api-version={apiConfiguration.ApiVersion}";
    }

    /// <summary>
    /// Extracts the connection name from the method call by looking for the parameter with [ConnectionName] attribute.
    /// If method symbol is not available, falls back to extracting the first string literal argument.
    /// For method chains like .Microsoftforms("conn").GetFormResponseById(...), this looks up the chain.
    /// </summary>
    private static string? ExtractConnectionNameFromMethodCall(HoverHandlerTypes.ParameterContext context)
    {
        // If we already have a connection name in the context, use it
        if (!string.IsNullOrEmpty(context.ConnectionName))
        {
            Console.Error.WriteLine($"[ExtractConnectionName] Using connection from context: {context.ConnectionName}");
            return context.ConnectionName;
        }

        // Get the invocation expression from the argument syntax
        InvocationExpressionSyntax? invocation = context.ArgumentSyntax.FirstAncestorOrSelf<InvocationExpressionSyntax>();
        if (invocation == null)
        {
            Console.Error.WriteLine("[ExtractConnectionName] No invocation found");
            return null;
        }

        Console.Error.WriteLine($"[ExtractConnectionName] Current invocation: {invocation.Expression}");

        // Try to extract from current invocation first
        string? connectionName = ExtractConnectionFromInvocation(invocation, context);
        if (!string.IsNullOrEmpty(connectionName))
        {
            Console.Error.WriteLine($"[ExtractConnectionName] Found in current invocation: {connectionName}");
            return connectionName;
        }

        // For method chains like .Microsoftforms("conn").GetFormResponseById(...)
        // Walk up the member access chain to find the connection parameter
        if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
        {
            Console.Error.WriteLine($"[ExtractConnectionName] Walking up member access chain from: {memberAccess.Name}");

            // The expression on the left might be another invocation
            if (memberAccess.Expression is InvocationExpressionSyntax parentInvocation)
            {
                Console.Error.WriteLine($"[ExtractConnectionName] Found parent invocation: {parentInvocation.Expression}");

                // Look for string literal in parent invocation (e.g., Microsoftforms("conn"))
                connectionName = ExtractFirstStringLiteral(parentInvocation);
                if (!string.IsNullOrEmpty(connectionName))
                {
                    Console.Error.WriteLine($"[ExtractConnectionName] Found in parent invocation: {connectionName}");
                    return connectionName;
                }
            }
        }

        Console.Error.WriteLine("[ExtractConnectionName] No connection found in invocation chain");
        return null;
    }

    /// <summary>
    /// Extracts connection from a single invocation (does not traverse chain).
    /// </summary>
    private static string? ExtractConnectionFromInvocation(InvocationExpressionSyntax invocation, HoverHandlerTypes.ParameterContext context)
    {
        ArgumentListSyntax argumentList = invocation.ArgumentList;
        if (argumentList == null || argumentList.Arguments.Count == 0)
        {
            return null;
        }

        // If we have the method symbol, use it to find the connection parameter
        if (context.Method != null)
        {
            Console.Error.WriteLine($"[ExtractConnectionFromInvocation] Method: {context.Method.Name}, Total parameters: {context.Method.Parameters.Length}");

            // Find the parameter with [ConnectionName] attribute
            IParameterSymbol? connectionParameter = context.Method.Parameters.FirstOrDefault(p => IsConnectionParameter(p));

            if (connectionParameter != null)
            {
                int connectionParameterIndex = connectionParameter.Ordinal;
                if (connectionParameterIndex < argumentList.Arguments.Count)
                {
                    ArgumentSyntax connectionArgument = argumentList.Arguments[connectionParameterIndex];
                    return ExtractConnectionNameFromArgument(connectionArgument);
                }
            }
            else if (IsMethodInConnectionClass(context.Method))
            {
                // New SDK pattern: The connection is passed to the constructor, not the method
                // Try to find the object creation expression for this instance
                Console.Error.WriteLine($"[ExtractConnectionFromInvocation] Method '{context.Method.Name}' is in a connection class, looking for constructor call");

                // The invocation is like: teamsActions.GetAllTeams()
                // We need to find where teamsActions was created: new TeamsActions("connectionId")
                if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
                {
                    string? connectionFromInstance = ExtractConnectionFromInstanceExpression(memberAccess.Expression);
                    if (!string.IsNullOrEmpty(connectionFromInstance))
                    {
                        Console.Error.WriteLine($"[ExtractConnectionFromInvocation] Found connection from instance creation: {connectionFromInstance}");
                        return connectionFromInstance;
                    }
                }
            }
        }

        // Fallback: Look for the first string literal (likely the connection name)
        return ExtractFirstStringLiteral(invocation);
    }

    /// <summary>
    /// Extracts the connection name from an instance expression by looking for object creation.
    /// Handles patterns like: new TeamsActions("connectionId") or variable references.
    /// </summary>
    private static string? ExtractConnectionFromInstanceExpression(ExpressionSyntax expression)
    {
        Console.Error.WriteLine($"[ExtractConnectionFromInstanceExpression] Analyzing expression: {expression.GetType().Name}");

        // Direct object creation: new TeamsActions("connectionId")
        if (expression is ObjectCreationExpressionSyntax objectCreation)
        {
            Console.Error.WriteLine("[ExtractConnectionFromInstanceExpression] Found ObjectCreationExpression");
            return ExtractFirstStringLiteralFromArguments(objectCreation.ArgumentList);
        }

        // Invocation that returns an instance: SomeFactory.Create("connectionId")
        if (expression is InvocationExpressionSyntax invocationExpr)
        {
            Console.Error.WriteLine("[ExtractConnectionFromInstanceExpression] Found InvocationExpression");
            return ExtractFirstStringLiteralFromArguments(invocationExpr.ArgumentList);
        }

        // Variable or property: teamsActions (need to trace back to assignment)
        if (expression is IdentifierNameSyntax identifier)
        {
            Console.Error.WriteLine($"[ExtractConnectionFromInstanceExpression] Found identifier: {identifier.Identifier.ValueText}");
            // For now, we can't easily trace variable assignments without more complex analysis
            // This would require finding the variable declaration and tracing its initialization
            return null;
        }

        return null;
    }

    /// <summary>
    /// Extracts the first string literal from an argument list.
    /// </summary>
    private static string? ExtractFirstStringLiteralFromArguments(ArgumentListSyntax? argumentList)
    {
        if (argumentList == null)
        {
            return null;
        }

        foreach (ArgumentSyntax arg in argumentList.Arguments)
        {
            if (arg.Expression is LiteralExpressionSyntax literal &&
                literal.Token.IsKind(SyntaxKind.StringLiteralToken))
            {
                return literal.Token.ValueText;
            }
        }

        return null;
    }

    /// <summary>
    /// Extracts the first string literal from an invocation's arguments.
    /// </summary>
    private static string? ExtractFirstStringLiteral(InvocationExpressionSyntax invocation)
    {
        if (invocation?.ArgumentList == null)
        {
            return null;
        }

        foreach (ArgumentSyntax arg in invocation.ArgumentList.Arguments)
        {
            if (arg.Expression is LiteralExpressionSyntax literal &&
                literal.Token.IsKind(SyntaxKind.StringLiteralToken))
            {
                return literal.Token.ValueText;
            }
        }

        return null;
    }

    /// <summary>
    /// Extracts the connection name from an argument expression.
    /// </summary>
    private static string? ExtractConnectionNameFromArgument(ArgumentSyntax connectionArgument)
    {
        // Extract the string literal value from the argument
        if (connectionArgument.Expression is LiteralExpressionSyntax literal &&
            literal.Token.IsKind(Microsoft.CodeAnalysis.CSharp.SyntaxKind.StringLiteralToken))
        {
            return literal.Token.ValueText;
        }

        // Handle invocation expressions (like method calls that return a string)
        if (connectionArgument.Expression is InvocationExpressionSyntax)
        {
            Console.Error.WriteLine("[ExtractConnectionName] Connection parameter is a method call, cannot extract static value");
            return null;
        }

        // Handle identifier (variable reference)
        if (connectionArgument.Expression is IdentifierNameSyntax identifier)
        {
            Console.Error.WriteLine($"[ExtractConnectionName] Connection parameter is a variable: {identifier.Identifier.ValueText}");

            // We could potentially trace this variable, but for now just return null
            return null;
        }

        return null;
    }

    /// <summary>
    /// Builds the payload object for the dynamicInvoke API call based on connector and operation.
    /// The payload contains the API details (path, method, query parameters) for the dynamic operation.
    /// </summary>
    private static HoverHandlerTypes.DynamicInvokePayload? BuildDynamicApiPayload(string connectorName, string operationName, HoverHandlerTypes.ParameterContext context)
    {
        Console.Error.WriteLine($"[BuildDynamicApiPayload] Building payload for connector: {connectorName}, operation: {operationName}");

        // Get API details for the operation from registry
        DynamicOperationMetadata? metadata = DynamicOperationsRegistry.GetOperationMetadata(connectorName, operationName);

        if (metadata == null)
        {
            Console.Error.WriteLine($"[BuildDynamicApiPayload] No metadata found for {connectorName}:{operationName}");
            return null;
        }

        Console.Error.WriteLine($"[BuildDynamicApiPayload] Found metadata - Path: {metadata.Path}, Method: {metadata.Method}");

        // Build the payload object with nested request structure
        var payload = new HoverHandlerTypes.DynamicInvokePayload
        {
            Request = new HoverHandlerTypes.DynamicInvokeRequest
            {
                Method = metadata.Method.ToLowerInvariant(),
                Path = metadata.Path,
                Queries = metadata.QueryParameters.Count > 0 ? metadata.QueryParameters : null,
            },
        };

        Console.Error.WriteLine($"[BuildDynamicApiPayload] Generated payload: {System.Text.Json.JsonSerializer.Serialize(payload)}");

        return payload;
    }

    /// <summary>
    /// Appends enum values for Input enum types to the hover information.
    /// Shows both the C# enum member names and their EnumMember attribute values if present.
    /// </summary>
    private static void AppendEnumValues(StringBuilder result, INamedTypeSymbol enumType)
    {
        result.AppendLine("**Available Values:**");
        result.AppendLine();

        foreach (IFieldSymbol member in enumType.GetMembers().OfType<IFieldSymbol>())
        {
            if (!member.IsStatic || !member.IsConst)
            {
                continue;
            }

            // Get the EnumMember attribute value if present
            string? enumMemberValue = GetEnumMemberAttributeValue(member);

            if (!string.IsNullOrEmpty(enumMemberValue))
            {
                result.AppendLine($"- `{enumType.Name}.{member.Name}` → API Value: `\"{enumMemberValue}\"`");
            }
            else
            {
                result.AppendLine($"- `{enumType.Name}.{member.Name}`");
            }
        }

        result.AppendLine();
    }

    /// <summary>
    /// Extracts the Value property from an [EnumMember(Value = "...")] attribute if present.
    /// Returns null if the attribute is not found or has no Value property.
    /// </summary>
    private static string? GetEnumMemberAttributeValue(IFieldSymbol member)
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

    /// <summary>
    /// Unwraps Expression&lt;Func&lt;T&gt;&gt; to get the inner type T.
    /// This is used to extract enum types from parameters like Expression&lt;Func&lt;CurrentWeatherunitsInput&gt;&gt;.
    /// Note: This duplicates UnwrapCommonWrapperTypes but is kept separate for clarity and potential different behavior.
    /// </summary>
    private static ITypeSymbol UnwrapExpressionFuncType(ITypeSymbol type)
    {
        if (type is not INamedTypeSymbol nts)
        {
            return type;
        }

        // Check for Expression<Func<T>>
        if (nts.Name == "Expression" &&
            nts.ContainingNamespace?.ToDisplayString() == "System.Linq.Expressions" &&
            nts.TypeArguments.Length == 1)
        {
            ITypeSymbol inner = nts.TypeArguments[0];

            // Check if inner is Func<T>
            if (inner is INamedTypeSymbol func &&
                func.Name == "Func" &&
                func.ContainingNamespace?.ToDisplayString() == "System" &&
                func.TypeArguments.Length >= 1)
            {
                // Return the last type argument (return type of Func)
                return func.TypeArguments.Last();
            }

            // Expression<T> where T is not Func
            return inner;
        }

        // Direct Func<T> (not wrapped in Expression)
        return nts.Name == "Func" &&
            nts.ContainingNamespace?.ToDisplayString() == "System" &&
            nts.TypeArguments.Length >= 1
            ? nts.TypeArguments.Last()
            : type;
    }
}
