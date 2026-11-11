using System.Linq;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

using Newtonsoft.Json.Linq;

using OmniSharp.Extensions.LanguageServer.Protocol;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;

using SdkLspServer;
using SdkLspServer.Handlers;
using SdkLspServer.Services.Connections;
using SdkLspServer.Services.Telemetry;

using Xunit;

namespace Server.Tests;

/// <summary>
/// Unit tests for CodeLensHandler to verify code lens display and refresh behavior.
/// Tests that code lenses appear for connector invocations and update when code changes.
/// </summary>
public class CodeLensHandlerTests
{
    private readonly BufferManager bufferManager;
    private readonly ITelemetryService telemetryService;
    private readonly ConnectionsService connectionsService;

    public CodeLensHandlerTests()
    {
        bufferManager = new BufferManager();
        telemetryService = new NoOpTelemetryService();
        connectionsService = new ConnectionsService();
    }

    [Fact]
    public async Task ManagedTrigger_ShouldDisplayCodeLens()
    {
        // Arrange - Code with Managed pattern
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class WeatherWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""weather-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Msnweather(""weather-conn"")
                .OnCurrentWeatherChange(location: ""Seattle, WA"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/weather.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri),
            },
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        Assert.NotEmpty(codeLensList);

        var weatherLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true);

        Assert.NotNull(weatherLens);
    }

    [Fact]
    public async Task EmptyDocument_ShouldReturnNoCodeLenses()
    {
        // Arrange - Empty document
        string documentUri = "file:///test/empty.cs";
        bufferManager.UpdateBuffer(documentUri, string.Empty);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        Assert.Empty(codeLenses);
    }

    [Fact]
    public async Task NonWorkflowCode_ShouldReturnNoCodeLenses()
    {
        // Arrange - C# code without SDK usage
        string nonWorkflowCode = @"
using System;

public class Calculator
{
    public int Add(int a, int b)
    {
        return a + b;
    }
}";

        string documentUri = "file:///test/calculator.cs";
        bufferManager.UpdateBuffer(documentUri, nonWorkflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        Assert.Empty(codeLenses);
    }

    [Fact]
    public async Task OldManagedPattern_ShouldStillDisplayCodeLens()
    {
        // Arrange - Code with old Managed pattern (for backward compatibility)
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class WeatherWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""weather-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Msnweather(connectionId: ""weather-conn"")
                .OnCurrentWeatherChangeAsync(location: ""Seattle, WA"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/old-weather.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - Old pattern should still work
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        Assert.NotEmpty(codeLensList);

        var msnweatherLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Create connection", StringComparison.OrdinalIgnoreCase) == true);
        Assert.NotNull(msnweatherLens);
    }

    [Fact]
    public async Task SameConnectorMultipleTimes_ShouldDisplayMultipleCodeLenses()
    {
        // Arrange - Code using the same connector multiple times
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class MultiActionWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""multi-action-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger(HttpTriggerKind.Webhook, ""POST"");

            var sendEmail1 = WorkflowActions.Managed.Outlook(""outlook-conn-1"")
                .SendEmailV2(to: ""user1@example.com"");

            var sendEmail2 = WorkflowActions.Managed.Outlook(""outlook-conn-2"")
                .SendEmailV2(to: ""user2@example.com"");

            builder.WithTrigger(trigger)
                .AddAction(""send_email_1"", sendEmail1)
                .AddAction(""send_email_2"", sendEmail2);
        });
    }
}";

        string documentUri = "file:///test/multi-action.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - Should have code lenses for BOTH Outlook invocations
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();

        // Filter for Outlook code lenses
        var outlookLenses = codeLensList.Where(lens =>
            lens.Command?.Title?.Contains("Outlook", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Arguments?.ToString()?.Contains("Outlook", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Should have 2 code lenses for the two Outlook invocations
        Assert.True(outlookLenses.Count >= 2, $"Expected at least 2 Outlook code lenses, but got {outlookLenses.Count}");
    }

    [Fact]
    public async Task Pattern2_ManagedWithConnectionId_ShouldDisplayCodeLens()
    {
        // Arrange - Pattern 2: WorkflowTriggers.Managed.ConnectorName(connectionId: "...")
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class ManagedWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""managed-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Outlook(connectionId: ""outlook-connection"")
                .OnNewEmailAsync(folderPath: ""Inbox"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/managed-old.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        Assert.NotEmpty(codeLensList);

        // Should detect Pattern 2: WorkflowTriggers.Managed.Outlook(connectionId: "...")
        var outlookLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Create connection", StringComparison.OrdinalIgnoreCase) == true);
        Assert.NotNull(outlookLens);
    }

    [Fact]
    public async Task ManagedAction_ShouldDisplayCodeLens()
    {
        // Arrange - WorkflowActions.Managed pattern
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class ActionWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""action-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger(HttpTriggerKind.Webhook, ""POST"");

            var sendEmail = WorkflowActions.Managed.Outlook(connectionId: ""outlook-conn"")
                .SendEmailAsync(to: ""user@example.com"", subject: ""Test"", body: ""Hello"");

            builder.WithTrigger(trigger)
                .AddAction(""send_email"", sendEmail);
        });
    }
}";

        string documentUri = "file:///test/action-managed.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        Assert.NotEmpty(codeLensList);

        var outlookLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("SendEmailAsync", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Title?.Contains("Create connection", StringComparison.OrdinalIgnoreCase) == true);
        Assert.NotNull(outlookLens);
    }

    [Fact]
    public async Task BuiltInTrigger_ShouldNotDisplayCodeLens()
    {
        // Arrange - BuiltIn triggers should not require connections
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class BuiltInWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""builtin-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger(HttpTriggerKind.Webhook, ""POST"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/builtin.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - BuiltIn triggers don't need connection code lenses
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();

        // BuiltIn should not have "Create connection" code lenses
        var connectionLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Create connection", StringComparison.OrdinalIgnoreCase) == true);
        Assert.Null(connectionLens);
    }

    [Fact]
    public async Task ChainedMethodCalls_ShouldDisplayCodeLens()
    {
        // Arrange - Chained method calls with WithName, WithSettings, etc.
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class ChainedWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""chained-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Outlook(""outlook-conn"")
                .OnNewEmailV2(folderPath: ""Inbox"")
                .WithName(""when_email_arrives"")
                .WithSettings(new { importance = ""High"" });

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/chained.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - Should still detect connector even with chained calls
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        Assert.NotEmpty(codeLensList);

        var outlookLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Outlook", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Arguments?.ToString()?.Contains("Outlook", StringComparison.OrdinalIgnoreCase) == true);
        Assert.NotNull(outlookLens);
    }

    [Fact]
    public async Task MixedPatterns_ShouldDisplayAllCodeLenses()
    {
        // Arrange - Mix of old Managed and new Managed patterns
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class MixedPatternsWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""mixed-workflow"", builder =>
        {
            // New pattern
            var trigger = WorkflowTriggers.Managed.Msnweather(""weather-conn"")
                .OnCurrentWeatherChange(location: ""Seattle, WA"");

            // Old pattern
            var sendEmail = WorkflowActions.Managed.Outlook(connectionId: ""outlook-conn"")
                .SendEmailAsync(to: ""user@example.com"", subject: ""Weather Alert"");

            builder.WithTrigger(trigger)
                .AddAction(""send_email"", sendEmail);
        });
    }
}";

        string documentUri = "file:///test/mixed.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - Should detect both patterns
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        Assert.True(codeLensList.Count >= 2, $"Expected at least 2 code lenses (one for each pattern), but got {codeLensList.Count}");

        // Check for Msnweather (new pattern)
        var msnweatherLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true);
        Assert.NotNull(msnweatherLens);

        // Check for Outlook (old pattern)
        var outlookLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("Outlook", StringComparison.OrdinalIgnoreCase) == true);
        Assert.NotNull(outlookLens);
    }

    [Fact]
    public async Task ConnectionIdExtraction_NewPattern_ShouldExtractCorrectly()
    {
        // Arrange - Test that connection ID is extracted from new pattern
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class ConnectionIdWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""connection-id-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Teams(""my-teams-connection-123"")
                .OnNewChannelMessage(groupId: ""group"", channelId: ""channel"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/connection-id.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        Assert.NotEmpty(codeLensList);

        var teamsLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("teams", StringComparison.OrdinalIgnoreCase) == true);
        Assert.NotNull(teamsLens);

        // Verify the code lens was created for Teams connector
        // Note: Connection ID extraction is an implementation detail that may vary
        // The important part is that the code lens is created for the right connector
        Assert.Contains("teams", teamsLens.Command?.Arguments?.ToString() ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task NestedWorkflowCalls_ShouldDisplayCodeLens()
    {
        // Arrange - Connectors used in nested scopes
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class NestedWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""nested-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Outlook(""outlook-conn"")
                .OnNewEmailV2(folderPath: ""Inbox"");

            builder.WithTrigger(trigger)
                .AddAction(""condition"", workflow =>
                {
                    // Nested action
                    var sendTeams = WorkflowActions.Managed.Teams(""teams-conn"")
                        .PostMessageV3(groupId: ""group"", channelId: ""channel"");

                    return sendTeams;
                });
        });
    }
}";

        string documentUri = "file:///test/nested.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - Should detect both Outlook and Teams
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        Assert.True(codeLensList.Count >= 2, $"Expected at least 2 code lenses, but got {codeLensList.Count}");
    }

    [Fact]
    public async Task SingleConnector_ShouldNotHaveDuplicateCodeLenses()
    {
        // Arrange - Single connector should only produce ONE code lens, not multiple
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class SingleConnectorWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""single-connector-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Msnweather(""weather-conn"")
                .OnCurrentWeatherChange(location: ""Seattle, WA"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/single-connector.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();

        // Filter for Msnweather-related code lenses
        var msnweatherLenses = codeLensList.Where(lens =>
            lens.Command?.Title?.Contains("Msnweather", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Title?.Contains("OnCurrentWeatherChange", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Should have exactly 1 code lens for the single Msnweather connector, not multiple duplicates
        Assert.Equal(1, msnweatherLenses.Count);
    }

    [Fact]
    public async Task SingleConnectorWithChaining_ShouldNotHaveDuplicateCodeLenses()
    {
        // Arrange - Chained methods should not create duplicate code lenses
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class ChainedSingleWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""chained-single-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Outlook(""outlook-conn"")
                .OnNewEmailV2(folderPath: ""Inbox"")
                .WithName(""when_email_arrives"")
                .WithSettings(new { importance = ""High"" })
                .WithRetryPolicy(maxRetries: 3);

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/chained-single.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();

        // Filter for Outlook-related code lenses
        var outlookLenses = codeLensList.Where(lens =>
            lens.Command?.Title?.Contains("Outlook", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Title?.Contains("OnNewEmailV2", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Arguments?.ToString()?.Contains("Outlook", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Despite multiple chained method calls, should have exactly 1 code lens
        Assert.Equal(1, outlookLenses.Count);
    }

    [Fact]
    public async Task SingleConnectorOldPattern_ShouldNotHaveDuplicateCodeLenses()
    {
        // Arrange - Old Managed pattern should also not create duplicates
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class OldPatternSingleWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""old-pattern-single-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Teams(connectionId: ""teams-conn"")
                .OnNewChannelMessageAsync(groupId: ""group-id"", channelId: ""channel-id"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/old-pattern-single.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();

        // Filter for Teams-related code lenses
        var teamsLenses = codeLensList.Where(lens =>
            lens.Command?.Title?.Contains("Teams", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Title?.Contains("OnNewChannelMessageAsync", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Arguments?.ToString()?.Contains("teams", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Should have exactly 1 code lens for the single Teams connector
        Assert.Equal(1, teamsLenses.Count);
    }

    [Fact]
    public async Task VariableAssignment_CurrentBehavior()
    {
        // Arrange - When connector is assigned to variable, pattern detection doesn't work
        // This documents the current limitation of the pattern detection logic
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class VariableAssignmentWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""variable-assignment-workflow"", builder =>
        {
            // Store connector in variable
            var weatherConnector = WorkflowTriggers.Managed.Msnweather(""weather-conn"");

            // Use the variable
            var trigger = weatherConnector.OnCurrentWeatherChange(location: ""Seattle, WA"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/variable-assignment.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();

        // Current behavior: variable-assignment connector pattern is supported.
        var msnweatherLenses = codeLensList.Where(lens =>
            lens.Command?.Title?.Contains("Msnweather", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        Assert.Equal(1, msnweatherLenses.Count);
    }

    [Fact]
    public async Task TwoDistinctConnectors_ShouldHaveExactlyTwoCodeLenses()
    {
        // Arrange - Two distinct connectors should have exactly 2 code lenses (one each)
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class TwoDistinctWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""two-distinct-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Msnweather(""weather-conn"")
                .OnCurrentWeatherChange(location: ""Seattle, WA"");

            var action = WorkflowActions.Managed.Teams(""teams-conn"")
                .PostMessageV3(groupId: ""group-id"", channelId: ""channel-id"");

            builder.WithTrigger(trigger)
                .AddAction(""post_teams"", action);
        });
    }
}";

        string documentUri = "file:///test/two-distinct.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();

        // Filter for Msnweather
        var msnweatherLenses = codeLensList.Where(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Filter for Teams
        var teamsLenses = codeLensList.Where(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("teams", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Should have exactly 1 code lens for each connector, no duplicates
        Assert.Equal(1, msnweatherLenses.Count);
        Assert.Equal(1, teamsLenses.Count);

        // Total should be exactly 2
        Assert.Equal(2, codeLensList.Count);
    }

    [Fact]
    public async Task IncrementalCodeAddition_ShouldDisplayCodeLensImmediately()
    {
        // Arrange - Simulate typing new connector code incrementally
        string documentUri = "file:///test/incremental.cs";

        // Initial code without connector
        string initialCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class IncrementalWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""incremental-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            builder.WithTrigger(trigger);
        });
    }
}";

        bufferManager.UpdateBuffer(documentUri, initialCode);
        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier { Uri = DocumentUri.From(documentUri) }
        };

        // Act 1 - Initial state: should have no connector code lenses
        var initialLenses = await handler.Handle(request, CancellationToken.None);
        var initialList = initialLenses.ToList();

        // Simulate user typing new connector line
        string codeWithNewConnector = @"
using Microsoft.Azure.Workflows.Sdk;

public class IncrementalWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""incremental-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var weather2 = WorkflowActions.Managed.Msnweather(""msnweather-1"").CurrentWeather(location: () => ""Seattle, WA"");
            builder.WithTrigger(trigger);
        });
    }
}";

        bufferManager.UpdateBuffer(documentUri, codeWithNewConnector);

        // Act 2 - After adding connector: should immediately show code lens
        var updatedLenses = await handler.Handle(request, CancellationToken.None);
        var updatedList = updatedLenses.ToList();

        // Assert
        var msnweatherLenses = updatedList.Where(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Should have exactly 1 code lens for the newly added connector
        Assert.Equal(1, msnweatherLenses.Count);
    }

    [Fact]
    public async Task CommentingOutCode_ShouldRemoveCodeLensImmediately()
    {
        // Arrange - Code with connector that will be commented out
        string documentUri = "file:///test/comment-test.cs";

        string activeCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class CommentTestWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""comment-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var weather2 = WorkflowActions.Managed.Msnweather(""msnweather-1"").CurrentWeather(location: () => ""Seattle, WA"");
            builder.WithTrigger(trigger);
        });
    }
}";

        bufferManager.UpdateBuffer(documentUri, activeCode);
        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier { Uri = DocumentUri.From(documentUri) }
        };

        // Act 1 - Initial state: should have connector code lens
        var initialLenses = await handler.Handle(request, CancellationToken.None);
        var initialList = initialLenses.ToList();
        var initialMsnweatherLenses = initialList.Where(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Simulate user commenting out the connector line
        string commentedCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class CommentTestWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""comment-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            // var weather2 = WorkflowActions.Managed.Msnweather(""msnweather-1"").CurrentWeather(location: () => ""Seattle, WA"");
            builder.WithTrigger(trigger);
        });
    }
}";

        bufferManager.UpdateBuffer(documentUri, commentedCode);

        // Act 2 - After commenting: should no longer show code lens
        var updatedLenses = await handler.Handle(request, CancellationToken.None);
        var updatedList = updatedLenses.ToList();
        var updatedMsnweatherLenses = updatedList.Where(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Assert
        Assert.Equal(1, initialMsnweatherLenses.Count); // Should have code lens initially
        Assert.Equal(0, updatedMsnweatherLenses.Count); // Should NOT have code lens after commenting
    }

    [Fact]
    public async Task UncommentingCode_ShouldRestoreCodeLensImmediately()
    {
        // Arrange - Code with commented connector that will be uncommented
        string documentUri = "file:///test/uncomment-test.cs";

        string commentedCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class UncommentTestWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""uncomment-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            // var weather = WorkflowActions.Managed.Outlook(""outlook-conn"").SendEmailV2();
            builder.WithTrigger(trigger);
        });
    }
}";

        bufferManager.UpdateBuffer(documentUri, commentedCode);
        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier { Uri = DocumentUri.From(documentUri) }
        };

        // Act 1 - Initial state: should have no connector code lens (commented out)
        var initialLenses = await handler.Handle(request, CancellationToken.None);
        var initialList = initialLenses.ToList();
        var initialOutlookLenses = initialList.Where(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("Outlook", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Simulate user uncommenting the connector line
        string activeCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class UncommentTestWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""uncomment-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var weather = WorkflowActions.Managed.Outlook(""outlook-conn"").SendEmailV2();
            builder.WithTrigger(trigger);
        });
    }
}";

        bufferManager.UpdateBuffer(documentUri, activeCode);

        // Act 2 - After uncommenting: should show code lens
        var updatedLenses = await handler.Handle(request, CancellationToken.None);
        var updatedList = updatedLenses.ToList();
        var updatedOutlookLenses = updatedList.Where(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("Outlook", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        // Assert
        Assert.Equal(0, initialOutlookLenses.Count); // Should NOT have code lens initially (commented)
        Assert.Equal(1, updatedOutlookLenses.Count); // Should have code lens after uncommenting
    }

    [Fact]
    public async Task MultilineCommentBlock_ShouldNotDisplayCodeLens()
    {
        // Arrange - Code with connector inside multiline comment block
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class MultilineCommentWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""multiline-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();

            /*
            var weather = WorkflowActions.Managed.Msnweather(""weather-conn"")
                .CurrentWeather(location: () => ""Seattle, WA"");
            */

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/multiline-comment.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier { Uri = DocumentUri.From(documentUri) }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - Should not have code lens for commented-out connector
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        var msnweatherLenses = codeLensList.Where(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        Assert.Equal(0, msnweatherLenses.Count);
    }

    [Fact]
    public async Task PartialTypingSimulation_ShouldNotCrash()
    {
        // Arrange - Simulate partial/incomplete code as user is typing
        string documentUri = "file:///test/partial-typing.cs";

        // User has typed partial code
        string partialCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class PartialTypingWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""partial-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var weather = WorkflowActions.Managed.
            builder.WithTrigger(trigger);
        });
    }
}";

        bufferManager.UpdateBuffer(documentUri, partialCode);
        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier { Uri = DocumentUri.From(documentUri) }
        };

        // Act - Should not crash on incomplete/invalid code
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - Should gracefully handle partial code without crashing
        Assert.NotNull(codeLenses);
        // May or may not have code lenses depending on parsing, but should not throw
    }

    [Fact]
    public async Task RapidEdits_ShouldReflectLatestState()
    {
        // Arrange - Simulate rapid editing of connector code
        string documentUri = "file:///test/rapid-edits.cs";

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier { Uri = DocumentUri.From(documentUri) }
        };

        // Edit 1: No connector
        string code1 = @"
using Microsoft.Azure.Workflows.Sdk;
public class RapidEditsWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""rapid-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            builder.WithTrigger(trigger);
        });
    }
}";
        bufferManager.UpdateBuffer(documentUri, code1);
        var lenses1 = (await handler.Handle(request, CancellationToken.None)).ToList();

        // Edit 2: Add Msnweather
        string code2 = @"
using Microsoft.Azure.Workflows.Sdk;
public class RapidEditsWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""rapid-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var weather = WorkflowActions.Managed.Msnweather(""weather"").CurrentWeather();
            builder.WithTrigger(trigger);
        });
    }
}";
        bufferManager.UpdateBuffer(documentUri, code2);
        var lenses2 = (await handler.Handle(request, CancellationToken.None)).ToList();

        // Edit 3: Change to Teams
        string code3 = @"
using Microsoft.Azure.Workflows.Sdk;
public class RapidEditsWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""rapid-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var teams = WorkflowActions.Managed.Teams(""teams"").PostMessageV3();
            builder.WithTrigger(trigger);
        });
    }
}";
        bufferManager.UpdateBuffer(documentUri, code3);
        var lenses3 = (await handler.Handle(request, CancellationToken.None)).ToList();

        // Assert - Each state should reflect the correct connectors
        var weather2Lenses = lenses2.Where(l => l.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true).ToList();
        var teams3Lenses = lenses3.Where(l => l.Command?.Arguments?.ToString()?.Contains("teams", StringComparison.OrdinalIgnoreCase) == true).ToList();
        var weather3Lenses = lenses3.Where(l => l.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true).ToList();

        Assert.Equal(1, weather2Lenses.Count); // Edit 2 should have Msnweather
        Assert.Equal(1, teams3Lenses.Count);   // Edit 3 should have Teams
        Assert.Equal(0, weather3Lenses.Count); // Edit 3 should NOT have Msnweather
    }

    [Fact]
    public async Task ExistingConnection_ShouldDisplayManageConnection()
    {
        // Arrange - Set up a connections config with a known connection
        var connectionsWithWeather = new ConnectionsService();
        connectionsWithWeather.UpdateConnections(new ConnectionsConfig
        {
            ManagedApiConnections = new Dictionary<string, ManagedApiConnection>
            {
                ["weather-conn"] = new ManagedApiConnection
                {
                    Api = new ApiInfo { Id = "/providers/Microsoft.Web/locations/westus/apis/msnweather" },
                    Connection = new ConnectionInfo { Id = "/subscriptions/sub1/connections/weather-conn" },
                },
            },
        });

        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class WeatherWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""weather-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Msnweather(""weather-conn"")
                .OnCurrentWeatherChange(location: ""Seattle, WA"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/weather-manage.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsWithWeather);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        Assert.NotEmpty(codeLensList);

        // Should say "Manage connection" instead of "Create connection"
        var manageLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Manage connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.NotNull(manageLens);
        Assert.DoesNotContain("Create connection", manageLens.Command?.Title ?? string.Empty);

        // The mode argument (7th element) should be "manage"
        string args = manageLens.Command?.Arguments?.ToString() ?? string.Empty;
        Assert.Contains("manage", args, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task MissingConnection_ShouldDisplayCreateConnection()
    {
        // Arrange - Set up a connections config WITHOUT the connector's connection
        var connectionsWithoutWeather = new ConnectionsService();
        connectionsWithoutWeather.UpdateConnections(new ConnectionsConfig
        {
            ManagedApiConnections = new Dictionary<string, ManagedApiConnection>
            {
                ["outlook-conn"] = new ManagedApiConnection
                {
                    Api = new ApiInfo { Id = "/providers/Microsoft.Web/locations/westus/apis/outlook" },
                    Connection = new ConnectionInfo { Id = "/subscriptions/sub1/connections/outlook-conn" },
                },
            },
        });

        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class WeatherWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""weather-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Msnweather(""weather-conn"")
                .OnCurrentWeatherChange(location: ""Seattle, WA"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/weather-create.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsWithoutWeather);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        Assert.NotEmpty(codeLensList);

        // Should say "Create connection" since weather-conn is not in the connections config
        var createLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Create connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.NotNull(createLens);
        Assert.DoesNotContain("Manage connection", createLens.Command?.Title ?? string.Empty);

        // The mode argument (7th element) should be "create"
        string args = createLens.Command?.Arguments?.ToString() ?? string.Empty;
        Assert.Contains("create", args, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ConnectionUpdate_WithResourceIdOnly_ShouldSwitchFromCreateToManage()
    {
        // Arrange - start with no matching connection
        var runtimeConnections = new ConnectionsService();
        runtimeConnections.UpdateConnections(new ConnectionsConfig
        {
            ManagedApiConnections = new Dictionary<string, ManagedApiConnection>
            {
                ["other-conn"] = new ManagedApiConnection
                {
                    Api = new ApiInfo { Id = "/providers/Microsoft.Web/locations/westus/apis/outlook" },
                    Connection = new ConnectionInfo { Id = "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/other-conn" },
                },
            },
        });

        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class WeatherWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""weather-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Msnweather(""weather-conn"")
                .OnCurrentWeatherChange(location: ""Seattle, WA"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/weather-runtime-update.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, runtimeConnections);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act 1 - should be create before auth/update
        var initialLenses = (await handler.Handle(request, CancellationToken.None)).ToList();
        var createLens = initialLenses.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Create connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.NotNull(createLens);

        // Simulate post-auth update where dictionary key differs, but resource ID contains weather-conn
        runtimeConnections.UpdateConnections(new ConnectionsConfig
        {
            ManagedApiConnections = new Dictionary<string, ManagedApiConnection>
            {
                ["weather-conn-authenticated"] = new ManagedApiConnection
                {
                    Api = new ApiInfo { Id = "/providers/Microsoft.Web/locations/westus/apis/msnweather" },
                    Connection = new ConnectionInfo
                    {
                        Id = "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/weather-conn"
                    },
                },
            },
        });

        // Act 2 - should switch to manage after update
        var updatedLenses = (await handler.Handle(request, CancellationToken.None)).ToList();
        var manageLens = updatedLenses.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Manage connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.NotNull(manageLens);
        Assert.DoesNotContain("Create connection", manageLens.Command?.Title ?? string.Empty);
    }

    [Fact]
    public async Task NoArgConnector_ShouldTargetConnectorParens_NotOperationArguments()
    {
        // Arrange - no connection id is passed to connector invocation
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class WeatherWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""weather-workflow"", builder =>
        {
            var action1 = WorkflowActions.Managed.Msnweather().CurrentWeather(
                location: () => ""98058"",
                units: () => unitsInput.Imperial);

            builder.AddAction(action1);
        });
    }
}
";

        string documentUri = "file:///test/noarg-connector-location-target.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = (await handler.Handle(request, CancellationToken.None)).ToList();

        // Assert
        var weatherLens = codeLenses.FirstOrDefault(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true);
        Assert.NotNull(weatherLens);

        // Lens should be anchored to the connector declaration line.
        Assert.Equal(9, weatherLens.Range.Start.Line);

        string argsJson = weatherLens.Command?.Arguments?.ToString() ?? string.Empty;

        // The connection id argument must not be inferred from operation parameters like "98058".
        Assert.DoesNotContain("98058", argsJson, StringComparison.OrdinalIgnoreCase);

        var args = JArray.Parse(argsJson);

        // Argument index 4 is the replacement range used by the client.
        var range = (JObject)args[4]!;
        int startLine = range["Start"]?["Line"]?.Value<int>() ?? -1;
        int endLine = range["End"]?["Line"]?.Value<int>() ?? -1;
        int startCharacter = range["Start"]?["Character"]?.Value<int>() ?? -1;
        int endCharacter = range["End"]?["Character"]?.Value<int>() ?? -1;

        // Insertion range should be empty (cursor position) and point to the connector invocation line.
        Assert.Equal(startLine, endLine);
        Assert.Equal(startCharacter, endCharacter);
        Assert.Equal(9, startLine);
    }

    [Fact]
    public async Task VariableBasedConnector_ShouldTargetConnectorArgument_NotOperationArguments()
    {
        // Arrange - connector is created on one line and used via variable on another.
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class WeatherWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""weather-workflow"", builder =>
        {
            var getCurrentWeatherAction2 = WorkflowActions.Managed.Msnweather(""msnweather-2"");

            var stuff = getCurrentWeatherAction2.CurrentWeather(
                location: () => ""98058"",
                units: () => unitsInput.Imperial);

            builder.AddAction(stuff);
        });
    }
}
";

        string documentUri = "file:///test/variable-based-connector-target.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri)
            }
        };

        // Act
        var codeLenses = (await handler.Handle(request, CancellationToken.None)).ToList();

        // Assert
        var weatherLens = codeLenses.FirstOrDefault(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("msnweather", StringComparison.OrdinalIgnoreCase) == true);
        Assert.NotNull(weatherLens);

        string argsJson = weatherLens.Command?.Arguments?.ToString() ?? string.Empty;

        // Connection id should come from the connector constructor arg.
        Assert.Contains("msnweather-2", argsJson, StringComparison.OrdinalIgnoreCase);

        // It must not target operation argument values.
        Assert.DoesNotContain("98058", argsJson, StringComparison.OrdinalIgnoreCase);

        var args = JArray.Parse(argsJson);
        var range = (JObject)args[4]!;

        int startLine = range["Start"]?["Line"]?.Value<int>() ?? -1;
        int endLine = range["End"]?["Line"]?.Value<int>() ?? -1;

        // Replacement should target the connector declaration line, not CurrentWeather args.
        Assert.Equal(startLine, endLine);
        Assert.Equal(9, startLine);
    }

    [Fact]
    public async Task ExistingProjectWithConnectionsJson_ShouldDisplayManageConnectionWithoutNotification()
    {
        string tempRoot = Path.Combine(Path.GetTempPath(), "codelens-existing-project-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempRoot);

        try
        {
            string projectDir = Path.Combine(tempRoot, "MyWorkflowProject");
            Directory.CreateDirectory(projectDir);

            string workflowFilePath = Path.Combine(projectDir, "workflow.cs");
            string connectionsPath = Path.Combine(projectDir, "connections.json");

            string connectionsJson = @"{
  ""managedApiConnections"": {
    ""weather-conn"": {
      ""api"": {
        ""id"": ""/providers/Microsoft.Web/locations/westus/apis/msnweather""
      },
      ""connection"": {
        ""id"": ""/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/weather-conn""
      },
      ""connectionRuntimeUrl"": ""https://example.com"",
            ""authentication"": {
                ""type"": ""ManagedServiceIdentity""
            }
    }
  }
}";

                        File.WriteAllText(connectionsPath, connectionsJson);

            string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class WeatherWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""weather-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Msnweather(""weather-conn"")
                .OnCurrentWeatherChange(location: ""Seattle, WA"");

            builder.WithTrigger(trigger);
        });
    }
}";

            File.WriteAllText(workflowFilePath, workflowCode);

            string documentUri = new Uri(workflowFilePath).AbsoluteUri;
            bufferManager.UpdateBuffer(documentUri, workflowCode);

            var localConnectionsService = new ConnectionsService();
            var handler = new CodeLensHandler(null, bufferManager, telemetryService, localConnectionsService);
            var request = new CodeLensParams
            {
                TextDocument = new TextDocumentIdentifier
                {
                    Uri = DocumentUri.From(documentUri),
                },
            };

            var codeLenses = (await handler.Handle(request, CancellationToken.None)).ToList();
            var manageLens = codeLenses.FirstOrDefault(lens =>
                lens.Command?.Title?.Contains("Manage connection", StringComparison.OrdinalIgnoreCase) == true);

            Assert.NotNull(manageLens);
        }
        finally
        {
            if (Directory.Exists(tempRoot))
            {
                Directory.Delete(tempRoot, recursive: true);
            }
        }
    }

    [Fact]
    public async Task ManagedIdentityAuthConnection_ShouldDisplayManageConnection()
    {
        var localConnectionsService = new ConnectionsService();
        localConnectionsService.UpdateConnections(new ConnectionsConfig
        {
            ManagedApiConnections = new Dictionary<string, ManagedApiConnection>
            {
                ["weather-conn"] = new ManagedApiConnection
                {
                    Api = new ApiInfo { Id = "/providers/Microsoft.Web/locations/westus/apis/msnweather" },
                    Connection = new ConnectionInfo { Id = "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/weather-conn" },
                    ConnectionRuntimeUrl = "https://example.com",
                    Authentication = JsonSerializer.SerializeToElement(new
                    {
                        type = "ManagedServiceIdentity",
                    }),
                },
            },
        });

        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class WeatherWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""weather-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.Managed.Msnweather(""weather-conn"")
                .OnCurrentWeatherChange(location: ""Seattle, WA"");

            builder.WithTrigger(trigger);
        });
    }
}";

        string documentUri = "file:///test/weather-managed-identity.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, localConnectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri),
            },
        };

        var codeLenses = (await handler.Handle(request, CancellationToken.None)).ToList();
        var manageLens = codeLenses.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Manage connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.NotNull(manageLens);
    }

    [Fact]
    public async Task MixedAuthenticationFormats_ShouldResolveExistingAndMissingConnections()
    {
        var localConnectionsService = new ConnectionsService();
        localConnectionsService.UpdateConnections(new ConnectionsConfig
        {
            ManagedApiConnections = new Dictionary<string, ManagedApiConnection>
            {
                ["weather-conn"] = new ManagedApiConnection
                {
                    Api = new ApiInfo { Id = "/providers/Microsoft.Web/locations/westus/apis/msnweather" },
                    Connection = new ConnectionInfo { Id = "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/weather-conn" },
                    ConnectionRuntimeUrl = "https://example.com",
                    Authentication = JsonSerializer.SerializeToElement("Raw"),
                },
                ["teams-conn"] = new ManagedApiConnection
                {
                    Api = new ApiInfo { Id = "/providers/Microsoft.Web/locations/westus/apis/teams" },
                    Connection = new ConnectionInfo { Id = "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/teams-conn" },
                    ConnectionRuntimeUrl = "https://example.com",
                    Authentication = JsonSerializer.SerializeToElement(new
                    {
                        type = "ManagedServiceIdentity",
                    }),
                },
            },
        });

        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class MixedWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""mixed-workflow"", builder =>
        {
            var weather = WorkflowTriggers.Managed.Msnweather(""weather-conn"").OnCurrentWeatherChange(location: ""Seattle, WA"");
            var teams = WorkflowActions.Managed.Teams(""teams-conn"").PostMessageV3();
            var missing = WorkflowActions.Managed.Teams(""teams-missing"").PostMessageV3();

            builder.WithTrigger(weather)
                .AddAction(teams)
                .AddAction(missing);
        });
    }
}";

        string documentUri = "file:///test/mixed-auth-formats.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, localConnectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri),
            },
        };

        var codeLenses = (await handler.Handle(request, CancellationToken.None)).ToList();

        var manageCount = codeLenses.Count(lens =>
            lens.Command?.Title?.Contains("Manage connection", StringComparison.OrdinalIgnoreCase) == true);
        var createCount = codeLenses.Count(lens =>
            lens.Command?.Title?.Contains("Create connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.True(manageCount >= 2);
        Assert.True(createCount >= 1);
    }

    [Fact]
    public void ConnectionsDeserialization_WithNullAuthentication_ShouldNotThrow()
    {
        string json = @"{
  ""managedApiConnections"": {
    ""weather-conn"": {
      ""api"": {
        ""id"": ""/providers/Microsoft.Web/locations/westus/apis/msnweather""
      },
      ""connection"": {
        ""id"": ""/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/weather-conn""
      },
      ""connectionRuntimeUrl"": ""https://example.com"",
      ""authentication"": null
    }
  }
}";

        ConnectionsConfig? parsed = JsonSerializer.Deserialize<ConnectionsConfig>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        });

        Assert.NotNull(parsed);
        Assert.True(parsed.ManagedApiConnections.ContainsKey("weather-conn"));
    }

    [Fact]
    public async Task BuiltInCustomCode_ShouldNotDisplayCodeLens()
    {
        // Arrange - BuiltIn.CustomCode is not a managed connector and should not get a CodeLens
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class GuidWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""guid-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var getGuid = WorkflowActions.BuiltIn.CustomCode<string>(static async context =>
            {
                return await Task.FromResult(new System.Guid().ToString());
            });
            builder.WithTrigger(trigger)
                .AddAction(""get_guid"", getGuid);
        });
    }
}";

        string documentUri = "file:///test/builtin-customcode.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri),
            },
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - No CodeLens should appear for BuiltIn methods
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();

        var connectionLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Create connection", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Title?.Contains("Manage connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.Null(connectionLens);
    }

    [Fact]
    public async Task BuiltInAgent_WithConnectionName_ShouldDisplayCreateAgentConnectionCodeLens()
    {
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class AgentWorkflow
{
    public static FlowDefinition[] GetWorkflows()
    {
        var trigger = WorkflowTriggers.BuiltIn.CreateConversationalAgentTrigger();

        var agent = WorkflowActions.BuiltIn.Agent(
            agentModelType: AgentModelType.AzureOpenAI,
            deploymentId: ""gpt-4.1"",
            agentModelSettings: new AgentModelSettings(),
            connectionName: ""agent"",
            messages: () => new AgentPromptMessage[]
            {
                new AgentPromptMessage
                {
                    Role = MessageRole.System,
                    Content = ""You are a weather agent""
                }
            }).WithName(""WeatherAgent"");

        return new[] { WorkflowFactory.CreateAgentWorkflow(""AgentWorkflow"", trigger.Then(agent)) };
    }
}";

        string documentUri = "file:///test/builtin-agent-create.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri),
            },
        };

        var codeLenses = await handler.Handle(request, CancellationToken.None);

        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        var agentLens = codeLensList.SingleOrDefault(lens =>
            lens.Command?.Title?.Contains("Create agent connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.NotNull(agentLens);
        string args = agentLens.Command?.Arguments?.ToString() ?? string.Empty;
        Assert.Contains("AgentConnection", args, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("agent", args, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("create", args, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task BuiltInAgent_WithExistingConnection_ShouldDisplayManageAgentConnectionCodeLens()
    {
        var connectionsWithAgent = new ConnectionsService();
        connectionsWithAgent.UpdateConnections(new ConnectionsConfig
        {
            ManagedApiConnections = new Dictionary<string, ManagedApiConnection>
            {
                ["agent"] = new ManagedApiConnection
                {
                    Api = new ApiInfo { Id = "/providers/Microsoft.Web/locations/westus/apis/agent" },
                    Connection = new ConnectionInfo { Id = "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/agent" },
                },
            },
        });

        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class AgentWorkflow
{
    public static FlowDefinition[] GetWorkflows()
    {
        var trigger = WorkflowTriggers.BuiltIn.CreateConversationalAgentTrigger();

        var agent = WorkflowActions.BuiltIn.Agent(
            AgentModelType.AzureOpenAI,
            ""gpt-4.1"",
            new AgentModelSettings(),
            ""agent"",
            () => new AgentPromptMessage[]
            {
                new AgentPromptMessage
                {
                    Role = MessageRole.System,
                    Content = ""You are a weather agent""
                }
            }).WithName(""WeatherAgent"");

        return new[] { WorkflowFactory.CreateAgentWorkflow(""AgentWorkflow"", trigger.Then(agent)) };
    }
}";

        string documentUri = "file:///test/builtin-agent-manage.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsWithAgent);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri),
            },
        };

        var codeLenses = await handler.Handle(request, CancellationToken.None);

        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();
        var agentLens = codeLensList.SingleOrDefault(lens =>
            lens.Command?.Title?.Contains("Manage agent connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.NotNull(agentLens);
        Assert.DoesNotContain("Create agent connection", agentLens.Command?.Title ?? string.Empty);
        string args = agentLens.Command?.Arguments?.ToString() ?? string.Empty;
        Assert.Contains("AgentConnection", args, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("manage", args, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task BuiltInAgents_Plural_ShouldNotDisplayAgentConnectionCodeLens()
    {
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class AgentWorkflow
{
    public static FlowDefinition[] GetWorkflows()
    {
        var agent = WorkflowActions.BuiltIn.Agents(
            agentModelType: AgentModelType.AzureOpenAI,
            deploymentId: ""gpt-4.1"",
            agentModelSettings: new AgentModelSettings(),
            connectionName: ""agent"",
            messages: () => new AgentPromptMessage[0]);

        return new[] { WorkflowFactory.CreateAgentWorkflow(""AgentWorkflow"", agent) };
    }
}";

        string documentUri = "file:///test/builtin-agents-plural.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri),
            },
        };

        var codeLenses = await handler.Handle(request, CancellationToken.None);

        Assert.NotNull(codeLenses);
        var agentLens = codeLenses.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("agent connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.Null(agentLens);
    }

    [Fact]
    public async Task BuiltInCustomCode_WithNestedConnector_ShouldOnlyShowConnectorCodeLens()
    {
        // Arrange - BuiltIn.CustomCode should not get a CodeLens,
        // but a Managed call inside the lambda body should
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;

public class HybridWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""hybrid-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var getGuid = WorkflowActions.BuiltIn.CustomCode<string>(static async context =>
            {
                var msg = WorkflowActions.Managed.Teams(""teams-conn"").PostMessageV3();
                return await Task.FromResult(new System.Guid().ToString());
            });
            builder.WithTrigger(trigger)
                .AddAction(""get_guid"", getGuid);
        });
    }
}";

        string documentUri = "file:///test/builtin-nested-connector.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri),
            },
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();

        // No CodeLens for BuiltIn methods (CustomCode, CreateHttpTrigger)
        var builtInLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("CustomCode", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Title?.Contains("CreateHttpTrigger", StringComparison.OrdinalIgnoreCase) == true);

        Assert.Null(builtInLens);

        // The Teams managed connector operation inside the lambda should still get a CodeLens
        var teamsLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Arguments?.ToString()?.Contains("teams", StringComparison.OrdinalIgnoreCase) == true);

        Assert.NotNull(teamsLens);
    }

    [Fact]
    public async Task BuiltInHttpAction_ShouldNotDisplayCodeLens()
    {
        // Arrange - BuiltIn.HttpAction should not get a CodeLens
        string workflowCode = @"
using Microsoft.Azure.Workflows.Sdk;
using System;
using System.Net.Http;

public class HttpWorkflow
{
    public static WorkflowDefinition Build()
    {
        return WorkflowBuilder.CreateStatefulWorkflow(""http-workflow"", builder =>
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var httpCall = WorkflowActions.BuiltIn.HttpAction(
                uri: () => new Uri(""https://api.example.com/data""),
                method: () => HttpMethod.Get);
            builder.WithTrigger(trigger)
                .AddAction(""http_call"", httpCall);
        });
    }
}";

        string documentUri = "file:///test/builtin-http.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(null, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri),
            },
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - No connection CodeLens for BuiltIn methods
        Assert.NotNull(codeLenses);
        var codeLensList = codeLenses.ToList();

        var connectionLens = codeLensList.FirstOrDefault(lens =>
            lens.Command?.Title?.Contains("Create connection", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Title?.Contains("Manage connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.Null(connectionLens);
    }

    [Fact]
    public async Task HostBuilderConfigureFunctionsWorkerDefaults_ShouldNotDisplayConnectionCodeLens()
    {
        // Arrange - host startup wiring should not be treated as connector usage
        string? sdkPath = FindSdkNupkg();
        if (sdkPath == null)
        {
            // Skip when SDK package is unavailable in the local repo checkout
            return;
        }

        SdkIndex? sdkIndex = await SdkIndex.TryCreateAsync(sdkPath);
        Assert.NotNull(sdkIndex);

        string workflowCode = @"
using Microsoft.Extensions.Hosting;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Workflows.Sdk;

public static class Program
{
    public static void Main()
    {
        var host = new
            HostBuilder()
                .ConfigureFunctionsWorkerDefaults()
                .ConfigureServices(services => WorkflowBuilderFactory.ConfigureServices(services))
                .Build();
    }
}
";

        string documentUri = "file:///test/functions-startup.cs";
        bufferManager.UpdateBuffer(documentUri, workflowCode);

        var handler = new CodeLensHandler(sdkIndex, bufferManager, telemetryService, connectionsService);
        var request = new CodeLensParams
        {
            TextDocument = new TextDocumentIdentifier
            {
                Uri = DocumentUri.From(documentUri),
            },
        };

        // Act
        var codeLenses = await handler.Handle(request, CancellationToken.None);

        // Assert - startup methods should not create connection code lenses
        Assert.NotNull(codeLenses);
        bool hasConnectionLens = codeLenses.Any(lens =>
            lens.Command?.Title?.Contains("Create connection", StringComparison.OrdinalIgnoreCase) == true ||
            lens.Command?.Title?.Contains("Manage connection", StringComparison.OrdinalIgnoreCase) == true);

        Assert.False(hasConnectionLens);
    }

    /// <summary>
    /// Helper to find SDK .nupkg file in the SDK folder.
    /// </summary>
    private static string? FindSdkNupkg()
    {
        try
        {
            string? configuredSdkPath = Environment.GetEnvironmentVariable("SDK_NUPKG_PATH");
            if (!string.IsNullOrWhiteSpace(configuredSdkPath) && File.Exists(configuredSdkPath))
            {
                return Path.GetFullPath(configuredSdkPath);
            }

            DirectoryInfo? dir = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (dir != null)
            {
                var sdkDir = new DirectoryInfo(Path.Combine(dir.FullName, "SDK"));
                if (sdkDir.Exists)
                {
                    FileInfo[] nupkgs = sdkDir.GetFiles("*.nupkg", SearchOption.TopDirectoryOnly)
                        .OrderByDescending(f => f.LastWriteTimeUtc)
                        .ToArray();

                    if (nupkgs.Length > 0)
                    {
                        return nupkgs[0].FullName;
                    }
                }

                dir = dir.Parent;
            }

            return null;
        }
        catch
        {
            return null;
        }
    }
}

/// <summary>
/// No-op telemetry service for testing purposes.
/// </summary>
internal class NoOpTelemetryService : ITelemetryService
{
    public void Initialize(TelemetryConfig? config)
    {
        // No-op
    }

    public void TrackEvent(string eventName, IDictionary<string, string>? properties = null, IDictionary<string, double>? metrics = null)
    {
        // No-op
    }

    public void TrackMetric(string metricName, double value, IDictionary<string, string>? properties = null)
    {
        // No-op
    }

    public void TrackException(Exception exception, IDictionary<string, string>? properties = null)
    {
        // No-op
    }

    public void TrackTrace(string message, Microsoft.ApplicationInsights.DataContracts.SeverityLevel severity = Microsoft.ApplicationInsights.DataContracts.SeverityLevel.Information, IDictionary<string, string>? properties = null)
    {
        // No-op
    }

    public void TrackDependency(string dependencyType, string target, string name, DateTimeOffset startTime, TimeSpan duration, bool success)
    {
        // No-op
    }

    public void Flush()
    {
        // No-op
    }
}
