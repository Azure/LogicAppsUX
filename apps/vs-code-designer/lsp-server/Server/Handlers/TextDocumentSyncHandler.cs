using System.Reflection;

using MediatR;

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

using OmniSharp.Extensions.LanguageServer.Protocol;
using OmniSharp.Extensions.LanguageServer.Protocol.Client.Capabilities;
using OmniSharp.Extensions.LanguageServer.Protocol.Document;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;
using OmniSharp.Extensions.LanguageServer.Protocol.Server;
using OmniSharp.Extensions.LanguageServer.Protocol.Server.Capabilities;
using OmniSharp.Extensions.LanguageServer.Protocol.Window;

namespace LogicAppsLanguageServer.Handlers;

internal class TextDocumentSyncHandler(ILanguageServerFacade router, DocumentBufferStore documentBufferStore, WorkflowSdkMetadataIndex? sdkMetadataIndex) : TextDocumentSyncHandlerBase
{
    private readonly ILanguageServerFacade router = router;
    private readonly DocumentBufferStore documentBufferStore = documentBufferStore;
    private readonly WorkflowSdkMetadataIndex? sdkMetadataIndex = sdkMetadataIndex;
    private bool supportsCodeLensRefresh;

    public TextDocumentSyncKind Change { get; } = TextDocumentSyncKind.Full;

    public TextDocumentSelector DocumentSelector { get; } = new TextDocumentSelector(
        new TextDocumentFilter()
        {
            Pattern = "**/*.cs",
        });

    public static TextDocumentAttributes GetTextDocumentAttributes(Uri uri)
    {
        return new TextDocumentAttributes(uri, "csharp");
    }

    public override TextDocumentAttributes GetTextDocumentAttributes(DocumentUri uri)
    {
        return new TextDocumentAttributes(uri, "csharp");
    }

    protected override TextDocumentSyncRegistrationOptions CreateRegistrationOptions(TextSynchronizationCapability capability, ClientCapabilities clientCapabilities)
    {
        supportsCodeLensRefresh = CodeLensRefreshService.IsSupported(clientCapabilities);

        return new TextDocumentSyncRegistrationOptions()
        {
            DocumentSelector = DocumentSelector,
            Change = Change,
            Save = new SaveOptions() { IncludeText = true }
        };
    }

    public override Task<Unit> Handle(DidChangeTextDocumentParams request, CancellationToken cancellationToken)
    {
        string documentPath = request.TextDocument.Uri.ToString();
        string? text = request.ContentChanges.FirstOrDefault()?.Text;

        documentBufferStore.UpdateBuffer(documentPath, text ?? string.Empty);

        router.Window.LogInfo($"[TextDocumentSyncHandler] Updated buffer for document: {documentPath}");

        // Always trigger CodeLens refresh on document changes
        // The CodeLensHandler will determine if any lenses should be shown based on the current document state
        CodeLensRefreshService.TryRequest(router, supportsCodeLensRefresh);

        return Unit.Task;
    }

    public override Task<Unit> Handle(DidOpenTextDocumentParams request, CancellationToken cancellationToken)
    {
        documentBufferStore.UpdateBuffer(request.TextDocument.Uri.ToString(), request.TextDocument.Text);

        router.Window.LogInfo($"[TextDocumentSyncHandler] Opened document: {request.TextDocument.Uri}");

        // Always trigger CodeLens refresh when opening a document
        CodeLensRefreshService.TryRequest(router, supportsCodeLensRefresh);

        return Unit.Task;
    }

    public override Task<Unit> Handle(DidSaveTextDocumentParams request, CancellationToken cancellationToken)
    {
        router.Window.LogInfo($"[TextDocumentSyncHandler] Saved document: {request.TextDocument.Uri}");

        // On save, trigger a refresh to ensure lenses appear immediately
        CodeLensRefreshService.TryRequest(router, supportsCodeLensRefresh);
        return Unit.Task;
    }

    public override Task<Unit> Handle(DidCloseTextDocumentParams request, CancellationToken cancellationToken)
    {
        documentBufferStore.RemoveBuffer(request.TextDocument.Uri.ToString());

        router.Window.LogInfo($"[TextDocumentSyncHandler] Closed document: {request.TextDocument.Uri}");
        return Unit.Task;
    }

    private static bool ContainsSdkConnectorAccess(ExpressionSyntax expression)
    {
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

    private bool MightContainSdkUsage(string text)
    {
        // Prefer a fast, semantic check via Roslyn. If that fails, fall back to a quick substring heuristic.
        try
        {
            if (MightContainSdkUsageRoslyn(text))
            {
                return true;
            }
        }
        catch
        {
            // ignore and try heuristic below
        }

        try
        {
            return !string.IsNullOrEmpty(text) && (
                text.Contains("WorkflowActions.Managed", StringComparison.Ordinal)
                || text.Contains("WorkflowTriggers.Managed", StringComparison.Ordinal)
                || text.Contains("ServiceProviders", StringComparison.Ordinal)
                || text.Contains("ConnectorOperation", StringComparison.Ordinal)
                || text.Contains("ConnectionName", StringComparison.Ordinal));
        }
        catch
        {
            return false;
        }
    }

    private bool MightContainSdkUsageRoslyn(string documentText)
    {
        // Parse
        SyntaxTree tree = CSharpSyntaxTree.ParseText(documentText);
        CompilationUnitSyntax root = tree.GetCompilationUnitRoot();

        // Quick syntactic short-circuit: if there are no invocations or member accesses, skip
        if (!root.DescendantNodes().Any(n => n is InvocationExpressionSyntax || n is MemberAccessExpressionSyntax))
        {
            return false;
        }

        // Create minimal compilation
        var references = new List<MetadataReference>();

        // Use AppContext.BaseDirectory for single-file deployment compatibility
        string baseDir = AppContext.BaseDirectory;

        try
        {
            // Try to add basic runtime references
            string runtimeDir = Path.GetDirectoryName(typeof(object).Assembly.Location) ?? baseDir;

            // Add core runtime references if available
            string[] coreRefs =
            [
                Path.Combine(runtimeDir, "System.Runtime.dll"),
                Path.Combine(runtimeDir, "System.Console.dll"),
                Path.Combine(runtimeDir, "System.Linq.dll"),
                Path.Combine(runtimeDir, "mscorlib.dll"),
                Path.Combine(runtimeDir, "System.Private.CoreLib.dll"),
            ];

            foreach (string refPath in coreRefs)
            {
                if (File.Exists(refPath))
                {
                    references.Add(MetadataReference.CreateFromFile(refPath));
                }
            }

            // Fallback: use basic references from loaded assemblies if locations are available
            Assembly[] fallbackAssemblies = [typeof(string).Assembly, typeof(Console).Assembly, typeof(Enumerable).Assembly];
            foreach (Assembly? assembly in fallbackAssemblies)
            {
                if (!string.IsNullOrEmpty(assembly.Location) && File.Exists(assembly.Location))
                {
                    references.Add(MetadataReference.CreateFromFile(assembly.Location));
                }
            }
        }
        catch
        {
            // If all else fails, continue with empty references - Roslyn can still work for basic syntax analysis
        }

        if (sdkMetadataIndex != null)
        {
            foreach (string assemblyPath in sdkMetadataIndex.AssemblyPaths)
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
                }
            }
        }

        var compilation = CSharpCompilation.Create(
            "CodeLensRefreshScan",
            [tree],
            references);

        SemanticModel semantic = compilation.GetSemanticModel(tree);

        // 1) Detect direct calls to SDK connector methods
        foreach (InvocationExpressionSyntax inv in root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            SymbolInfo si = semantic.GetSymbolInfo(inv);
            IMethodSymbol? method = si.Symbol as IMethodSymbol ?? si.CandidateSymbols.OfType<IMethodSymbol>().FirstOrDefault();
            if (method is null)
            {
                continue;
            }

            if (IsSymbolFromSdk(method))
            {
                return true;
            }

            if (method.GetAttributes().Any(a => string.Equals(a.AttributeClass?.Name, "ConnectorOperationAttribute", StringComparison.Ordinal)
                                             || string.Equals(a.AttributeClass?.Name, "ConnectorOperation", StringComparison.Ordinal)))
            {
                return true;
            }
        }

        // 2) Detect member access chains that include Managed or ServiceProviders containers
        foreach (MemberAccessExpressionSyntax ma in root.DescendantNodes().OfType<MemberAccessExpressionSyntax>())
        {
            if (ContainsSdkConnectorAccess(ma.Expression))
            {
                return true;
            }
        }

        return false;
    }

    private bool IsSymbolFromSdk(ISymbol symbol)
    {
        if (sdkMetadataIndex is null)
        {
            return false;
        }

        string? assemblyName = symbol.ContainingAssembly?.Name;
        return !string.IsNullOrEmpty(assemblyName)
            && sdkMetadataIndex.AssemblyPaths.Any(path =>
            Path.GetFileNameWithoutExtension(path)
                .Equals(assemblyName, StringComparison.OrdinalIgnoreCase));
    }
}
