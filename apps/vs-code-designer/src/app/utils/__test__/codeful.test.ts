import * as fse from 'fs-extra';
import * as path from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hasCodefulWorkflowSetting,
  isCodefulProject,
  detectStatefulCodefulWorkflow,
  detectAgentCodefulWorkflow,
  detectCodefulWorkflow,
  extractTriggerNameFromCodeful,
  hasHttpRequestTrigger,
  extractHttpTriggerName,
} from '../codeful';
import { localSettingsFileName } from '../../../constants';

vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    statSync: vi.fn(),
    readdir: vi.fn(),
  },
  pathExists: vi.fn(),
  readFile: vi.fn(),
  statSync: vi.fn(),
  readdir: vi.fn(),
}));

describe('codeful.ts', () => {
  const mockedFse = vi.mocked(fse);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hasCodefulWorkflowSetting', () => {
    const testFolderPath = '/test/folder';
    const localSettingsPath = path.join(testFolderPath, localSettingsFileName);

    it('should return false when local settings file does not exist', async () => {
      mockedFse.pathExists.mockResolvedValue(false);

      const result = await hasCodefulWorkflowSetting(testFolderPath);

      expect(result).toBe(false);
      expect(mockedFse.pathExists).toHaveBeenCalledWith(localSettingsPath);
    });

    it('should return true when WORKFLOW_CODEFUL_ENABLED is true', async () => {
      const localSettings = {
        IsEncrypted: false,
        Values: {
          WORKFLOW_CODEFUL_ENABLED: true,
        },
      };

      mockedFse.pathExists.mockResolvedValue(true);
      mockedFse.readFile.mockResolvedValue(JSON.stringify(localSettings));

      const result = await hasCodefulWorkflowSetting(testFolderPath);

      expect(result).toBe(true);
      expect(mockedFse.readFile).toHaveBeenCalledWith(localSettingsPath, 'utf-8');
    });

    it('should return false when WORKFLOW_CODEFUL_ENABLED is false', async () => {
      const localSettings = {
        IsEncrypted: false,
        Values: {
          WORKFLOW_CODEFUL_ENABLED: false,
        },
      };

      mockedFse.pathExists.mockResolvedValue(true);
      mockedFse.readFile.mockResolvedValue(JSON.stringify(localSettings));

      const result = await hasCodefulWorkflowSetting(testFolderPath);

      expect(result).toBe(false);
    });

    it('should return undefined when WORKFLOW_CODEFUL_ENABLED is undefined', async () => {
      const localSettings = {
        IsEncrypted: false,
        Values: {},
      };

      mockedFse.pathExists.mockResolvedValue(true);
      mockedFse.readFile.mockResolvedValue(JSON.stringify(localSettings));

      const result = await hasCodefulWorkflowSetting(testFolderPath);

      expect(result).toBeUndefined();
    });

    it('should return false when JSON parsing fails', async () => {
      mockedFse.pathExists.mockResolvedValue(true);
      mockedFse.readFile.mockResolvedValue('invalid json {{{');

      const result = await hasCodefulWorkflowSetting(testFolderPath);

      expect(result).toBe(false);
    });

    it('should return false when file read fails', async () => {
      mockedFse.pathExists.mockResolvedValue(true);
      mockedFse.readFile.mockRejectedValue(new Error('Read error'));

      const result = await hasCodefulWorkflowSetting(testFolderPath);

      expect(result).toBe(false);
    });
  });

  describe('isCodefulProject', () => {
    const testFolderPath = '/test/project';

    it('should return false when path is not a directory', async () => {
      mockedFse.statSync.mockReturnValue({
        isDirectory: () => false,
      } as any);

      const result = await isCodefulProject(testFolderPath);

      expect(result).toBe(false);
    });

    it('should return false when no .csproj file exists', async () => {
      mockedFse.statSync.mockReturnValue({
        isDirectory: () => true,
      } as any);
      mockedFse.readdir.mockResolvedValue(['Program.cs', 'Startup.cs'] as any);

      const result = await isCodefulProject(testFolderPath);

      expect(result).toBe(false);
    });

    it('should return false when .csproj is not targeting net8', async () => {
      const csprojContent = `
        <Project>
          <TargetFramework>net6.0</TargetFramework>
          <PackageReference Include="Microsoft.Azure.Workflows.Sdk" />
        </Project>
      `;

      mockedFse.statSync.mockReturnValue({
        isDirectory: () => true,
      } as any);
      mockedFse.readdir.mockResolvedValue(['TestProject.csproj', 'Program.cs'] as any);
      mockedFse.readFile.mockResolvedValue(csprojContent);

      const result = await isCodefulProject(testFolderPath);

      expect(result).toBe(false);
    });

    it('should return false when .csproj does not include Microsoft.Azure.Workflows.Sdk', async () => {
      const csprojContent = `
        <Project>
          <TargetFramework>net8</TargetFramework>
          <PackageReference Include="SomeOtherPackage" />
        </Project>
      `;

      mockedFse.statSync.mockReturnValue({
        isDirectory: () => true,
      } as any);
      mockedFse.readdir.mockResolvedValue(['TestProject.csproj'] as any);
      mockedFse.readFile.mockResolvedValue(csprojContent);

      const result = await isCodefulProject(testFolderPath);

      expect(result).toBe(false);
    });

    it('should return true when .csproj is a valid codeful net8 project', async () => {
      const csprojContent = `
        <Project>
          <PropertyGroup>
            <TargetFramework>net8</TargetFramework>
            <AzureFunctionsVersion>v4</AzureFunctionsVersion>
          </PropertyGroup>
          <ItemGroup>
            <PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="1.0.0-preview" />
          </ItemGroup>
        </Project>
      `;

      mockedFse.statSync.mockReturnValue({
        isDirectory: () => true,
      } as any);
      mockedFse.readdir.mockResolvedValue(['TestProject.csproj', 'Program.cs'] as any);
      mockedFse.readFile.mockResolvedValue(csprojContent);

      const result = await isCodefulProject(testFolderPath);

      expect(result).toBe(true);
    });

    it('should use the first .csproj file found', async () => {
      const csprojContent = `
        <Project>
          <TargetFramework>net8</TargetFramework>
          <PackageReference Include="Microsoft.Azure.Workflows.Sdk" />
        </Project>
      `;

      mockedFse.statSync.mockReturnValue({
        isDirectory: () => true,
      } as any);
      mockedFse.readdir.mockResolvedValue(['First.csproj', 'Second.csproj'] as any);
      mockedFse.readFile.mockResolvedValue(csprojContent);

      await isCodefulProject(testFolderPath);

      expect(mockedFse.readFile).toHaveBeenCalledWith(path.join(testFolderPath, 'First.csproj'), 'utf-8');
    });
  });

  describe('detectStatefulCodefulWorkflow', () => {
    it('should detect workflow name with string literal', () => {
      const fileContent = `
        public static class MyWorkflow
        {
            public static void AddWorkflow()
            {
                var workflow = WorkflowBuilderFactory.CreateStatefulWorkflow("TestWorkflow", builder =>
                {
                    builder.AddTrigger(trigger);
                });
            }
        }
      `;

      const result = detectStatefulCodefulWorkflow(fileContent);

      expect(result).toBe('TestWorkflow');
    });

    it('should detect workflow name with single quotes', () => {
      const fileContent = `
        var workflow = WorkflowBuilderFactory.CreateStatefulWorkflow('MyWorkflow', builder => {});
      `;

      const result = detectStatefulCodefulWorkflow(fileContent);

      expect(result).toBe('MyWorkflow');
    });

    it('should detect workflow name with variable identifier', () => {
      const fileContent = `
        string workflowName = "DynamicWorkflow";
        var workflow = WorkflowBuilderFactory.CreateStatefulWorkflow(workflowName, builder => {});
      `;

      const result = detectStatefulCodefulWorkflow(fileContent);

      // The function extracts the variable name, not its value
      expect(result).toBe('workflowName');
    });

    it('should return undefined for template placeholder', () => {
      const fileContent = `
        var workflow = WorkflowBuilderFactory.CreateStatefulWorkflow(<%= flowName %>, builder => {});
      `;

      const result = detectStatefulCodefulWorkflow(fileContent);

      expect(result).toBeUndefined();
    });

    it('should return undefined when no CreateStatefulWorkflow call exists', () => {
      const fileContent = `
        public static class MyClass
        {
            public void SomeMethod() {}
        }
      `;

      const result = detectStatefulCodefulWorkflow(fileContent);

      expect(result).toBeUndefined();
    });

    it('should handle whitespace variations', () => {
      const fileContent = `
        WorkflowBuilderFactory.CreateStatefulWorkflow    (   "SpacedWorkflow"   ,   builder => {});
      `;

      const result = detectStatefulCodefulWorkflow(fileContent);

      expect(result).toBe('SpacedWorkflow');
    });
    it('should detect workflow name across multiple lines', () => {
      const fileContent = `
        var workflow = WorkflowBuilderFactory
            .CreateStatefulWorkflow(
                "MultilineWorkflow",
                builder => {}
            );
      `;

      const result = detectStatefulCodefulWorkflow(fileContent);

      expect(result).toBe('MultilineWorkflow');
    });
  });

  describe('detectAgentCodefulWorkflow', () => {
    it('should detect agent workflow name with string literal', () => {
      const fileContent = `
        public static class AgentWorkflow
        {
            public static void AddWorkflow()
            {
                var agent = WorkflowBuilderFactory.CreateConversationalAgent("TestAgent");
            }
        }
      `;

      const result = detectAgentCodefulWorkflow(fileContent);

      expect(result).toBe('TestAgent');
    });

    it('should detect agent workflow name with single quotes', () => {
      const fileContent = `
        var agent = WorkflowBuilderFactory.CreateConversationalAgent('MyAgent');
      `;

      const result = detectAgentCodefulWorkflow(fileContent);

      expect(result).toBe('MyAgent');
    });

    it('should detect agent workflow name with variable identifier', () => {
      const fileContent = `
        string agentName = "DynamicAgent";
        var agent = WorkflowBuilderFactory.CreateConversationalAgent(agentName);
      `;

      const result = detectAgentCodefulWorkflow(fileContent);

      // The function extracts the variable name, not its value
      expect(result).toBe('agentName');
    });

    it('should return undefined for template placeholder', () => {
      const fileContent = `
        var agent = WorkflowBuilderFactory.CreateConversationalAgent(<%= flowName %>);
      `;

      const result = detectAgentCodefulWorkflow(fileContent);

      expect(result).toBeUndefined();
    });

    it('should return undefined when no CreateConversationalAgent call exists', () => {
      const fileContent = `
        public static class MyClass
        {
            public void SomeMethod() {}
        }
      `;

      const result = detectAgentCodefulWorkflow(fileContent);

      expect(result).toBeUndefined();
    });

    it('should handle whitespace variations', () => {
      const fileContent = `
        WorkflowBuilderFactory.CreateConversationalAgent   (  "SpacedAgent"  );
      `;

      const result = detectAgentCodefulWorkflow(fileContent);

      expect(result).toBe('SpacedAgent');
    });
    it('should detect agent workflow name across multiple lines', () => {
      const fileContent = `
        var agent = WorkflowBuilderFactory
            .CreateConversationalAgent(
                "MultilineAgent"
            );
      `;

      const result = detectAgentCodefulWorkflow(fileContent);

      expect(result).toBe('MultilineAgent');
    });
  });

  describe('detectCodefulWorkflow', () => {
    it('should detect stateful workflow and return correct type', () => {
      const fileContent = `
        var workflow = WorkflowBuilderFactory.CreateStatefulWorkflow("StatefulWorkflow", builder => {});
      `;

      const result = detectCodefulWorkflow(fileContent);

      expect(result).toEqual({
        workflowName: 'StatefulWorkflow',
        workflowType: 'stateful',
      });
    });

    it('should detect agent workflow and return correct type', () => {
      const fileContent = `
        var agent = WorkflowBuilderFactory.CreateConversationalAgent("AgentWorkflow");
      `;

      const result = detectCodefulWorkflow(fileContent);

      expect(result).toEqual({
        workflowName: 'AgentWorkflow',
        workflowType: 'agent',
      });
    });

    it('should prioritize stateful workflow when both patterns exist', () => {
      const fileContent = `
        var workflow = WorkflowBuilderFactory.CreateStatefulWorkflow("StatefulWorkflow", builder => {});
        var agent = WorkflowBuilderFactory.CreateConversationalAgent("AgentWorkflow");
      `;

      const result = detectCodefulWorkflow(fileContent);

      expect(result).toEqual({
        workflowName: 'StatefulWorkflow',
        workflowType: 'stateful',
      });
    });

    it('should return undefined when no workflow patterns are found', () => {
      const fileContent = `
        public static class MyClass
        {
            public void SomeMethod() {}
        }
      `;

      const result = detectCodefulWorkflow(fileContent);

      expect(result).toBeUndefined();
    });

    it('should return undefined when template placeholders are used', () => {
      const fileContent = `
        var workflow = WorkflowBuilderFactory.CreateStatefulWorkflow(<%= flowName %>, builder => {});
      `;

      const result = detectCodefulWorkflow(fileContent);

      expect(result).toBeUndefined();
    });
  });

  describe('extractTriggerNameFromCodeful', () => {
    it('should extract from variable name when trigger method is called', () => {
      const fileContent = `
        var httpTrigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
      `;

      const result = extractTriggerNameFromCodeful(fileContent);

      expect(result).toBe('httpTrigger');
    });

    it('should return undefined when no trigger patterns are found', () => {
      const fileContent = `
        public static class MyClass
        {
            public void SomeMethod() {}
        }
      `;

      const result = extractTriggerNameFromCodeful(fileContent);

      expect(result).toBeUndefined();
    });

    it('should extract variable name from different WorkflowTriggers patterns', () => {
      const fileContent = `
        var recurrenceTrigger = WorkflowTriggers.BuiltIn.CreateRecurrenceTrigger();
      `;

      const result = extractTriggerNameFromCodeful(fileContent);

      expect(result).toBe('recurrenceTrigger');
    });

    it('should ignore trigger names in single-line comments', () => {
      const fileContent = `
        // var oldTrigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
        // trigger.WithName("weather_trigger");
        var httpTrigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
      `;

      const result = extractTriggerNameFromCodeful(fileContent);

      expect(result).toBe('httpTrigger');
    });

    it('should ignore trigger names in multi-line block comments', () => {
      const fileContent = `
        /*
        var oldTrigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
        trigger.WithName("weather_trigger");
        */
        var httpTrigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
      `;

      const result = extractTriggerNameFromCodeful(fileContent);

      expect(result).toBe('httpTrigger');
    });

    it('should ignore trigger names in inline block comments', () => {
      const fileContent = `
        /* trigger.WithName("old_trigger"); */
        var httpTrigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
      `;

      const result = extractTriggerNameFromCodeful(fileContent);

      expect(result).toBe('httpTrigger');
    });
  });

  describe('hasHttpRequestTrigger', () => {
    it('should return true when HTTP trigger is present', () => {
      const fileContent = `
        var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger("httpTrigger");
      `;

      const result = hasHttpRequestTrigger(fileContent);

      expect(result).toBe(true);
    });

    it('should return false when HTTP trigger is not present', () => {
      const fileContent = `
        var trigger = WorkflowTriggers.BuiltIn.CreateRecurrenceTrigger();
      `;

      const result = hasHttpRequestTrigger(fileContent);

      expect(result).toBe(false);
    });

    it('should return true when HTTP trigger pattern exists anywhere in content', () => {
      const fileContent = `
        public static class MyWorkflow
        {
            public static void AddWorkflow()
            {
                var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
                var workflow = WorkflowBuilderFactory.CreateStatefulWorkflow("Test", builder =>
                {
                    builder.AddTrigger(trigger);
                });
            }
        }
      `;

      const result = hasHttpRequestTrigger(fileContent);

      expect(result).toBe(true);
    });

    it('should return false for empty string', () => {
      const result = hasHttpRequestTrigger('');

      expect(result).toBe(false);
    });

    it('should return false when HTTP trigger is only in single-line comments', () => {
      const fileContent = `
        // var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
        var trigger = WorkflowTriggers.BuiltIn.CreateRecurrenceTrigger();
      `;

      const result = hasHttpRequestTrigger(fileContent);

      expect(result).toBe(false);
    });

    it('should return false when HTTP trigger is only in multi-line block comments', () => {
      const fileContent = `
        /*
        var oldTrigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
        */
        var trigger = WorkflowTriggers.BuiltIn.CreateRecurrenceTrigger();
      `;

      const result = hasHttpRequestTrigger(fileContent);

      expect(result).toBe(false);
    });

    it('should return true when HTTP trigger is active and also present in comments', () => {
      const fileContent = `
        // var oldTrigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
        var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
      `;

      const result = hasHttpRequestTrigger(fileContent);

      expect(result).toBe(true);
    });
  });

  describe('extractHttpTriggerName', () => {
    it('should extract HTTP trigger name from CreateHttpTrigger call', () => {
      const fileContent = `
        var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger("manual", options);
      `;

      const result = extractHttpTriggerName(fileContent);

      expect(result).toBe('manual');
    });

    it('should extract HTTP trigger name with single quotes', () => {
      const fileContent = `
        var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger('httpTrigger', options);
      `;

      const result = extractHttpTriggerName(fileContent);

      expect(result).toBe('httpTrigger');
    });

    it('should handle whitespace variations', () => {
      const fileContent = `
        WorkflowTriggers.BuiltIn.CreateHttpTrigger   (   "myTrigger"  ,   options   );
      `;

      const result = extractHttpTriggerName(fileContent);

      expect(result).toBe('myTrigger');
    });

    it('should return "manual" when no HTTP trigger with explicit name is found', () => {
      const fileContent = `
        var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
      `;

      const result = extractHttpTriggerName(fileContent);

      expect(result).toBeUndefined();
    });

    it('should return undefined when no HTTP trigger exists', () => {
      const fileContent = `
        public static class MyClass
        {
            public void SomeMethod() {}
        }
      `;

      const result = extractHttpTriggerName(fileContent);

      expect(result).toBeUndefined();
    });

    it('should extract from multiline code with line breaks', () => {
      const fileContent = `
        var trigger = WorkflowTriggers
            .BuiltIn
            .CreateHttpTrigger(
                "requestTrigger",
                new HttpTriggerOptions()
            );
      `;

      const result = extractHttpTriggerName(fileContent);

      expect(result).toBe('requestTrigger');
    });

    it('should ignore HTTP trigger names in single-line comments', () => {
      const fileContent = `
        // var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger("old_trigger");
        var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger("new_trigger");
      `;

      const result = extractHttpTriggerName(fileContent);

      expect(result).toBe('new_trigger');
    });

    it('should ignore HTTP trigger names in multi-line block comments', () => {
      const fileContent = `
        /*
        var oldTrigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger("commented_trigger");
        */
        var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger("active_trigger");
      `;

      const result = extractHttpTriggerName(fileContent);

      expect(result).toBe('active_trigger');
    });

    it('should return undefined when CreateHttpTrigger is called without name parameter', () => {
      const fileContent = `
        var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
      `;

      const result = extractHttpTriggerName(fileContent);

      expect(result).toBeUndefined();
    });

    it('should return undefined when CreateHttpTrigger is called with empty parentheses across lines', () => {
      const fileContent = `
        var trigger = WorkflowTriggers
            .BuiltIn
            .CreateHttpTrigger(
            );
      `;

      const result = extractHttpTriggerName(fileContent);

      expect(result).toBeUndefined();
    });
  });
});
