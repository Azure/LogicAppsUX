using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

using LogicAppsLanguageServer.Handlers.HoverHandler;

namespace LogicAppsLanguageServer.Tests;

public class HoverHandlerTests
{
    [Fact]
    public void CreateInsertValueCommandUri_UsesRegisteredExtensionCommand()
    {
        SyntaxTree tree = CSharpSyntaxTree.ParseText("""Call(connectionName: "old");""");
        ArgumentSyntax argument = tree.GetRoot().DescendantNodes().OfType<ArgumentSyntax>().Single();

        string commandUri = HoverHandler.CreateInsertValueCommandUri(argument, "\"new\"", isConnection: true);

        Assert.StartsWith($"command:{HoverHandler.ApplyEditsCommand}?", commandUri);
    }

    [Fact]
    public void EscapeMarkdownLinkText_PreventsCommandLinkInjection()
    {
        string escaped = HoverHandler.EscapeMarkdownLinkText("unsafe](command:workbench.action.reloadWindow)[label");

        Assert.DoesNotContain("](command:", escaped);
        Assert.Contains(@"\]", escaped);
        Assert.Contains(@"\[", escaped);
    }
}
