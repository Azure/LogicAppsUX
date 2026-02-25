import { describe, it, expect } from 'vitest';
import {
  parseWorkflowRequest,
  parseProjectRequest,
  parseWorkflowSpecs,
  parseAdditionalWorkflowSpecs,
  parseIntentFromPrompt,
  mapExtractedType,
  mapParsedProjectType,
  mapParsedTargetFramework,
  isConfirmationResponse,
  extractProjectNamesFromAmbiguityResponse,
  extractTargetProjectFromPrompt,
  resolveSelectedProjectName,
  type ParsedIntent,
} from '../logicAppsChatParticipant';
import { WorkflowTypeOption, ProjectTypeOption, TargetFrameworkOption } from '../chatConstants';

describe('parseWorkflowRequest', () => {
  describe('workflow type extraction', () => {
    it('should extract stateful type', () => {
      const result = parseWorkflowRequest('create a stateful workflow');
      expect(result.type).toBe(WorkflowTypeOption.stateful);
    });

    it('should extract stateless type', () => {
      const result = parseWorkflowRequest('create a stateless workflow');
      expect(result.type).toBe(WorkflowTypeOption.stateless);
    });

    it('should extract agentic type', () => {
      const result = parseWorkflowRequest('create an agentic workflow');
      expect(result.type).toBe(WorkflowTypeOption.agentic);
    });

    it('should extract agentic type from "autonomous"', () => {
      const result = parseWorkflowRequest('create an autonomous agent');
      expect(result.type).toBe(WorkflowTypeOption.agentic);
    });

    it('should extract agent type', () => {
      const result = parseWorkflowRequest('create an agent workflow');
      expect(result.type).toBe(WorkflowTypeOption.agent);
    });

    it('should extract agent type from "conversational"', () => {
      const result = parseWorkflowRequest('create a conversational agent');
      expect(result.type).toBe(WorkflowTypeOption.agent);
    });

    it('should return undefined type when no type specified', () => {
      const result = parseWorkflowRequest('create a workflow');
      expect(result.type).toBeUndefined();
    });

    it('should be case insensitive for type extraction', () => {
      const result = parseWorkflowRequest('create a STATEFUL workflow');
      expect(result.type).toBe(WorkflowTypeOption.stateful);
    });
  });

  describe('workflow name extraction', () => {
    it('should extract name from quoted string (double quotes)', () => {
      const result = parseWorkflowRequest('create a workflow called "OrderProcessing"');
      expect(result.name).toBe('OrderProcessing');
    });

    it('should extract name from quoted string (single quotes)', () => {
      const result = parseWorkflowRequest("create a workflow called 'OrderProcessing'");
      expect(result.name).toBe('OrderProcessing');
    });

    it('should extract name after "called"', () => {
      const result = parseWorkflowRequest('create a workflow called OrderProcessing');
      expect(result.name).toBe('OrderProcessing');
    });

    it('should extract name after "named"', () => {
      const result = parseWorkflowRequest('create a workflow named OrderProcessing');
      expect(result.name).toBe('OrderProcessing');
    });

    it('should extract PascalCase name', () => {
      const result = parseWorkflowRequest('I want to create OrderProcessingWorkflow');
      expect(result.name).toBe('OrderProcessingWorkflow');
    });

    it('should extract name with underscores', () => {
      const result = parseWorkflowRequest('create workflow called Order_Processing');
      expect(result.name).toBe('Order_Processing');
    });

    it('should extract name with hyphens', () => {
      const result = parseWorkflowRequest('create workflow called Order-Processing');
      expect(result.name).toBe('Order-Processing');
    });

    it('should skip common words like "Stateful"', () => {
      const result = parseWorkflowRequest('Stateful OrderProcessor');
      expect(result.name).toBe('OrderProcessor');
    });

    it('should skip common words like "Workflow"', () => {
      const result = parseWorkflowRequest('Workflow MyProcessor');
      expect(result.name).toBe('MyProcessor');
    });

    it('should return undefined when no valid name found', () => {
      const result = parseWorkflowRequest('create a workflow please');
      expect(result.name).toBeUndefined();
    });

    it('should prefer quoted name over PascalCase word', () => {
      const result = parseWorkflowRequest('create "MyWorkflow" ProcessOrder');
      expect(result.name).toBe('MyWorkflow');
    });
  });

  describe('combined extraction', () => {
    it('should extract both name and type', () => {
      const result = parseWorkflowRequest('create a stateful workflow called OrderProcessor');
      expect(result.name).toBe('OrderProcessor');
      expect(result.type).toBe(WorkflowTypeOption.stateful);
    });

    it('should handle complex prompts', () => {
      const result = parseWorkflowRequest('I want to create a stateless workflow named "HighThroughputAPI" for processing requests');
      expect(result.name).toBe('HighThroughputAPI');
      expect(result.type).toBe(WorkflowTypeOption.stateless);
    });
  });
});

describe('parseProjectRequest', () => {
  describe('project type extraction', () => {
    it('should default to logicApp type', () => {
      const result = parseProjectRequest('create a project');
      expect(result.type).toBe(ProjectTypeOption.logicApp);
      expect(result.includeCustomCode).toBe(false);
    });

    it('should detect custom code from "custom code"', () => {
      const result = parseProjectRequest('create a project with custom code');
      expect(result.type).toBe(ProjectTypeOption.logicAppCustomCode);
      expect(result.includeCustomCode).toBe(true);
    });

    it('should detect custom code from "functions"', () => {
      const result = parseProjectRequest('create a project with functions support');
      expect(result.type).toBe(ProjectTypeOption.logicAppCustomCode);
      expect(result.includeCustomCode).toBe(true);
    });

    it('should detect custom code from "c#"', () => {
      const result = parseProjectRequest('create a project with c# support');
      expect(result.type).toBe(ProjectTypeOption.logicAppCustomCode);
      expect(result.includeCustomCode).toBe(true);
    });

    it('should detect custom code from "dotnet"', () => {
      const result = parseProjectRequest('create a dotnet project');
      expect(result.type).toBe(ProjectTypeOption.logicAppCustomCode);
      expect(result.includeCustomCode).toBe(true);
    });
  });

  describe('project name extraction', () => {
    it('should extract name from quoted string', () => {
      const result = parseProjectRequest('create a project named "MyLogicApp"');
      expect(result.name).toBe('MyLogicApp');
    });

    it('should extract name after "called"', () => {
      const result = parseProjectRequest('create a project called OrderManagement');
      expect(result.name).toBe('OrderManagement');
    });

    it('should extract name after "named"', () => {
      const result = parseProjectRequest('create a project named OrderManagement');
      expect(result.name).toBe('OrderManagement');
    });

    it('should extract PascalCase name from prompt', () => {
      const result = parseProjectRequest('I want to create OrderManagement');
      expect(result.name).toBe('OrderManagement');
    });

    it('should skip common words like "Logic", "App"', () => {
      const result = parseProjectRequest('Logic App project MyApp');
      expect(result.name).toBe('MyApp');
    });

    it('should skip common words like "Custom", "Code"', () => {
      const result = parseProjectRequest('Custom Code project MyProject');
      expect(result.name).toBe('MyProject');
    });

    it('should return undefined when no valid name found', () => {
      const result = parseProjectRequest('create a project please');
      expect(result.name).toBeUndefined();
    });
  });

  describe('combined extraction', () => {
    it('should extract name and detect custom code', () => {
      const result = parseProjectRequest('create a project named "OrderManagement" with custom code support');
      expect(result.name).toBe('OrderManagement');
      expect(result.type).toBe(ProjectTypeOption.logicAppCustomCode);
      expect(result.includeCustomCode).toBe(true);
    });

    it('should extract name without custom code', () => {
      const result = parseProjectRequest('create a project called MyWorkflows for automation');
      expect(result.name).toBe('MyWorkflows');
      expect(result.type).toBe(ProjectTypeOption.logicApp);
      expect(result.includeCustomCode).toBe(false);
    });
  });

  describe('workflow specifications', () => {
    it('should extract single workflow from prompt', () => {
      const result = parseProjectRequest('create a project called MyApp with a stateful workflow called OrderProcessing');
      expect(result.name).toBe('MyApp');
      expect(result.workflows).toBeDefined();
      expect(result.workflows?.length).toBe(1);
      expect(result.workflows?.[0]).toEqual({ name: 'OrderProcessing', type: WorkflowTypeOption.stateful });
    });

    it('should extract multiple workflows from range pattern', () => {
      const result = parseProjectRequest('create a project called MyApp with 5 stateful workflows from Workflow1 to Workflow5');
      expect(result.name).toBe('MyApp');
      expect(result.workflows?.length).toBe(5);
      expect(result.workflows?.[0]).toEqual({ name: 'Workflow1', type: WorkflowTypeOption.stateful });
      expect(result.workflows?.[4]).toEqual({ name: 'Workflow5', type: WorkflowTypeOption.stateful });
    });
  });
});

describe('parseWorkflowSpecs', () => {
  describe('range pattern', () => {
    it('should parse "N workflows from X1 to XN" pattern', () => {
      const result = parseWorkflowSpecs('5 stateful workflows from Workflow1 to Workflow5');
      expect(result.length).toBe(5);
      expect(result[0]).toEqual({ name: 'Workflow1', type: WorkflowTypeOption.stateful });
      expect(result[4]).toEqual({ name: 'Workflow5', type: WorkflowTypeOption.stateful });
    });

    it('should parse stateless workflows with range pattern', () => {
      const result = parseWorkflowSpecs('3 stateless workflows from Api1 to Api3');
      expect(result.length).toBe(3);
      expect(result[0]).toEqual({ name: 'Api1', type: WorkflowTypeOption.stateless });
      expect(result[2]).toEqual({ name: 'Api3', type: WorkflowTypeOption.stateless });
    });

    it('should parse agentic workflows with range pattern', () => {
      const result = parseWorkflowSpecs('2 agentic workflows from Agent1 to Agent2');
      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ name: 'Agent1', type: WorkflowTypeOption.agentic });
      expect(result[1]).toEqual({ name: 'Agent2', type: WorkflowTypeOption.agentic });
    });

    it('should parse "from X1-5" shorthand with type', () => {
      const result = parseWorkflowSpecs('5 stateful workflows from Stateful1-5');
      expect(result.length).toBe(5);
      expect(result[0]).toEqual({ name: 'Stateful1', type: WorkflowTypeOption.stateful });
      expect(result[4]).toEqual({ name: 'Stateful5', type: WorkflowTypeOption.stateful });
    });

    it('should parse "from X1-5" shorthand without type', () => {
      const result = parseWorkflowSpecs('5 workflows from Workflow1-5');
      expect(result.length).toBe(5);
      expect(result[0]).toEqual({ name: 'Workflow1' });
      expect(result[0].type).toBeUndefined();
      expect(result[4]).toEqual({ name: 'Workflow5' });
    });

    it('should parse "from X1-5" in a full prompt with project reference', () => {
      const result = parseWorkflowSpecs('Create 5 stateful workflows under TonyProject from Stateful1-5');
      expect(result.length).toBe(5);
      expect(result[0]).toEqual({ name: 'Stateful1', type: WorkflowTypeOption.stateful });
      expect(result[4]).toEqual({ name: 'Stateful5', type: WorkflowTypeOption.stateful });
    });
  });

  describe('count with name pattern', () => {
    it('should parse "N workflows called X" pattern', () => {
      const result = parseWorkflowSpecs('3 stateful workflows called Order');
      expect(result.length).toBe(3);
      expect(result[0]).toEqual({ name: 'Order1', type: WorkflowTypeOption.stateful });
      expect(result[1]).toEqual({ name: 'Order2', type: WorkflowTypeOption.stateful });
      expect(result[2]).toEqual({ name: 'Order3', type: WorkflowTypeOption.stateful });
    });

    it('should parse single workflow without number suffix', () => {
      const result = parseWorkflowSpecs('1 stateful workflow called OrderProcessor');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ name: 'OrderProcessor', type: WorkflowTypeOption.stateful });
    });
  });

  describe('single workflow pattern', () => {
    it('should parse "a stateful workflow called X" pattern', () => {
      const result = parseWorkflowSpecs('a stateful workflow called OrderProcessing');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ name: 'OrderProcessing', type: WorkflowTypeOption.stateful });
    });

    it('should parse "an agentic workflow named X" pattern', () => {
      const result = parseWorkflowSpecs('an agentic workflow named MyAgent');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ name: 'MyAgent', type: WorkflowTypeOption.agentic });
    });

    it('should parse "one stateless workflow called X" pattern', () => {
      const result = parseWorkflowSpecs('one stateless workflow called HighThroughput');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ name: 'HighThroughput', type: WorkflowTypeOption.stateless });
    });
  });

  describe('workflows without explicit type (type left undefined for confirmation)', () => {
    it('should parse "one workflow called X" with undefined type', () => {
      const result = parseWorkflowSpecs('one workflow called stateful');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ name: 'stateful' });
      expect(result[0].type).toBeUndefined();
    });

    it('should parse "a workflow called OrderProcessor" with undefined type', () => {
      const result = parseWorkflowSpecs('a workflow called OrderProcessor');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ name: 'OrderProcessor' });
      expect(result[0].type).toBeUndefined();
    });

    it('should parse "3 workflows called Order" with undefined type', () => {
      const result = parseWorkflowSpecs('3 workflows called Order');
      expect(result.length).toBe(3);
      expect(result[0]).toEqual({ name: 'Order1' });
      expect(result[1]).toEqual({ name: 'Order2' });
      expect(result[2]).toEqual({ name: 'Order3' });
      expect(result.every((w) => w.type === undefined)).toBe(true);
    });

    it('should parse full prompt "Create new rule engine logic app with one workflow called stateful"', () => {
      const result = parseWorkflowSpecs('Create new rule engine logic app with one workflow called stateful');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ name: 'stateful' });
      expect(result[0].type).toBeUndefined();
    });
  });

  describe('simple workflow specification', () => {
    it('should parse "with a stateful workflow" and use default name', () => {
      const result = parseWorkflowSpecs('with a stateful workflow');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ name: 'Workflow1', type: WorkflowTypeOption.stateful });
    });

    it('should parse "with a stateless workflow" and use default name', () => {
      const result = parseWorkflowSpecs('with a stateless workflow');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ name: 'Workflow1', type: WorkflowTypeOption.stateless });
    });
  });

  describe('edge cases', () => {
    it('should return empty array for no workflow specifications', () => {
      const result = parseWorkflowSpecs('create a project called MyApp');
      expect(result.length).toBe(0);
    });

    it('should handle case insensitivity for workflow types', () => {
      const result = parseWorkflowSpecs('a STATEFUL workflow called MyWorkflow');
      expect(result.length).toBe(1);
      expect(result[0].type).toBe(WorkflowTypeOption.stateful);
    });

    it('should avoid duplicate workflow names', () => {
      const result = parseWorkflowSpecs('a stateful workflow called TestWorkflow and another stateful workflow called TestWorkflow');
      // Should only have one TestWorkflow due to deduplication
      const testWorkflows = result.filter((w) => w.name === 'TestWorkflow');
      expect(testWorkflows.length).toBe(1);
    });
  });

  describe('complex patterns', () => {
    it('should handle multiple workflow types in one prompt', () => {
      const result = parseWorkflowSpecs('3 stateful workflows called Order and 2 agentic workflows called Agent');
      expect(result.length).toBe(5);

      const statefulWorkflows = result.filter((w) => w.type === WorkflowTypeOption.stateful);
      const agenticWorkflows = result.filter((w) => w.type === WorkflowTypeOption.agentic);

      expect(statefulWorkflows.length).toBe(3);
      expect(agenticWorkflows.length).toBe(2);
    });

    it('should correctly name workflows with count pattern', () => {
      const result = parseWorkflowSpecs('2 stateful workflows called Payment');
      expect(result[0].name).toBe('Payment1');
      expect(result[1].name).toBe('Payment2');
    });
  });
});

describe('parseAdditionalWorkflowSpecs', () => {
  describe('range pattern (X workflows Name1-N)', () => {
    it('should parse "5 workflows Order4-8" to Order4 through Order8', () => {
      const result = parseAdditionalWorkflowSpecs('5 workflows Order4-8');
      expect(result.workflows.length).toBe(5);
      expect(result.workflows.map((w) => w.name)).toEqual(['Order4', 'Order5', 'Order6', 'Order7', 'Order8']);
      expect(result.baseName).toBe('Order');
    });

    it('should parse "3 additional workflows Test1-3" to Test1 through Test3', () => {
      const result = parseAdditionalWorkflowSpecs('3 additional workflows Test1-3');
      expect(result.workflows.length).toBe(3);
      expect(result.workflows.map((w) => w.name)).toEqual(['Test1', 'Test2', 'Test3']);
    });

    it('should parse "5 stateful workflows Order4-8" with type', () => {
      const result = parseAdditionalWorkflowSpecs('5 stateful workflows Order4-8');
      expect(result.workflows.length).toBe(5);
      expect(result.workflows.every((w) => w.type === WorkflowTypeOption.stateful)).toBe(true);
    });

    it('should parse "2 stateless workflows API1-2" with type', () => {
      const result = parseAdditionalWorkflowSpecs('2 stateless workflows API1-2');
      expect(result.workflows.length).toBe(2);
      expect(result.workflows.every((w) => w.type === WorkflowTypeOption.stateless)).toBe(true);
    });

    it('should parse "3 agentic workflows Agent1-3" with type', () => {
      const result = parseAdditionalWorkflowSpecs('3 agentic workflows Agent1-3');
      expect(result.workflows.length).toBe(3);
      expect(result.workflows.every((w) => w.type === WorkflowTypeOption.agentic)).toBe(true);
    });
  });

  describe('simple range pattern (Name1-N)', () => {
    it('should parse "Order4-8" to Order4 through Order8', () => {
      const result = parseAdditionalWorkflowSpecs('Order4-8');
      expect(result.workflows.length).toBe(5);
      expect(result.workflows.map((w) => w.name)).toEqual(['Order4', 'Order5', 'Order6', 'Order7', 'Order8']);
    });

    it('should parse "Workflow1-3" to Workflow1 through Workflow3', () => {
      const result = parseAdditionalWorkflowSpecs('Workflow1-3');
      expect(result.workflows.length).toBe(3);
      expect(result.workflows.map((w) => w.name)).toEqual(['Workflow1', 'Workflow2', 'Workflow3']);
    });

    it('should return undefined type when no type specified', () => {
      const result = parseAdditionalWorkflowSpecs('Order4-8');
      expect(result.workflows.every((w) => w.type === undefined)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return empty workflows for prompts without range patterns', () => {
      const result = parseAdditionalWorkflowSpecs('create a single workflow');
      expect(result.workflows.length).toBe(0);
    });

    it('should handle single workflow range (Order1-1)', () => {
      const result = parseAdditionalWorkflowSpecs('Order1-1');
      expect(result.workflows.length).toBe(1);
      expect(result.workflows[0].name).toBe('Order1');
    });

    it('should be case insensitive for count pattern', () => {
      const result = parseAdditionalWorkflowSpecs('5 ADDITIONAL WORKFLOWS Order4-8');
      expect(result.workflows.length).toBe(5);
    });
  });
});

describe('parseIntentFromPrompt', () => {
  describe('project creation intent', () => {
    it('should detect "create project"', () => {
      const result = parseIntentFromPrompt('create a new project');
      expect(result.action).toBe('createProject');
      expect(result.confidence).toBe('high');
    });

    it('should detect "new project"', () => {
      const result = parseIntentFromPrompt('I want a new project called MyApp');
      expect(result.action).toBe('createProject');
      expect(result.confidence).toBe('high');
    });

    it('should detect "create logic app" without workflow', () => {
      const result = parseIntentFromPrompt('create a logic app');
      expect(result.action).toBe('createProject');
      expect(result.confidence).toBe('high');
    });

    it('should detect project creation when creating logic app WITH workflows', () => {
      const result = parseIntentFromPrompt('Create new rule engine logic app with one workflow called stateful');
      expect(result.action).toBe('createProject');
      expect(result.confidence).toBe('high');
    });

    it('should detect project creation for "new logic app with 3 workflows"', () => {
      const result = parseIntentFromPrompt('new logic app with 3 workflows');
      expect(result.action).toBe('createProject');
      expect(result.confidence).toBe('high');
    });

    it('should detect project creation for "new workspace with custom code logic app"', () => {
      const result = parseIntentFromPrompt('create new logic app workspace with a custom code logic app');
      expect(result.action).toBe('createProject');
      expect(result.confidence).toBe('high');
    });

    it('should detect project creation for "create a rules engine project"', () => {
      const result = parseIntentFromPrompt('create a rules engine project');
      expect(result.action).toBe('createProject');
      expect(result.confidence).toBe('high');
    });

    it('should detect project creation for "new rule engine logic app"', () => {
      const result = parseIntentFromPrompt('create new rule engine logic app');
      expect(result.action).toBe('createProject');
      expect(result.confidence).toBe('high');
    });

    it('should detect project creation for "create custom code logic app"', () => {
      const result = parseIntentFromPrompt('create custom code logic app');
      expect(result.action).toBe('createProject');
      expect(result.confidence).toBe('high');
    });

    it('should NOT detect project when "logic app workflow" is mentioned', () => {
      const result = parseIntentFromPrompt('create a logic app workflow');
      expect(result.action).toBe('createWorkflows');
    });
  });

  describe('workflow creation intent', () => {
    it('should detect "create workflow"', () => {
      const result = parseIntentFromPrompt('create a workflow');
      expect(result.action).toBe('createWorkflows');
      expect(result.confidence).toBe('high');
    });

    it('should detect "new workflow"', () => {
      const result = parseIntentFromPrompt('I need a new workflow called OrderProcessor');
      expect(result.action).toBe('createWorkflows');
      expect(result.confidence).toBe('high');
    });

    it('should detect "add workflow"', () => {
      const result = parseIntentFromPrompt('add a workflow to the project');
      expect(result.action).toBe('createWorkflows');
      expect(result.confidence).toBe('high');
    });

    it('should detect count pattern "5 workflows"', () => {
      const result = parseIntentFromPrompt('5 workflows');
      expect(result.action).toBe('createWorkflows');
      expect(result.confidence).toBe('high');
    });

    it('should detect count pattern "3 additional workflows"', () => {
      const result = parseIntentFromPrompt('3 additional workflows');
      expect(result.action).toBe('createWorkflows');
      expect(result.confidence).toBe('high');
    });

    it('should detect range pattern "Order4-8"', () => {
      const result = parseIntentFromPrompt('Order4-8');
      expect(result.action).toBe('createWorkflows');
      expect(result.confidence).toBe('high');
    });

    it('should detect range pattern "Workflow1-5"', () => {
      const result = parseIntentFromPrompt('Workflow1-5');
      expect(result.action).toBe('createWorkflows');
      expect(result.confidence).toBe('high');
    });

    it('should detect "create workflows under TonyProject" as workflow creation', () => {
      const result = parseIntentFromPrompt('Create 5 stateful workflows under TonyProject from Stateful1-5');
      expect(result.action).toBe('createWorkflows');
      expect(result.confidence).toBe('high');
    });

    it('should detect "create a workflow in ProjectName" as workflow creation', () => {
      const result = parseIntentFromPrompt('Create a workflow in TonyProject');
      expect(result.action).toBe('createWorkflows');
      expect(result.confidence).toBe('high');
    });

    it('should detect "add workflows for ProjectName" as workflow creation', () => {
      const result = parseIntentFromPrompt('add 3 workflows for MyApp');
      expect(result.action).toBe('createWorkflows');
      expect(result.confidence).toBe('high');
    });
  });

  describe('modification intent', () => {
    it('should detect "modify" keyword', () => {
      const result = parseIntentFromPrompt('modify the action');
      expect(result.action).toBe('modifyAction');
      expect(result.confidence).toBe('medium');
    });

    it('should detect "change" keyword', () => {
      const result = parseIntentFromPrompt('change the timeout setting');
      expect(result.action).toBe('modifyAction');
      expect(result.confidence).toBe('medium');
    });

    it('should detect "update" keyword', () => {
      const result = parseIntentFromPrompt('update the HTTP action');
      expect(result.action).toBe('modifyAction');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('help intent', () => {
    it('should detect "help" keyword', () => {
      const result = parseIntentFromPrompt('help');
      expect(result.action).toBe('help');
      expect(result.confidence).toBe('high');
    });

    it('should detect "what can you" pattern', () => {
      const result = parseIntentFromPrompt('what can you do?');
      expect(result.action).toBe('help');
      expect(result.confidence).toBe('high');
    });

    it('should detect "help me" pattern', () => {
      const result = parseIntentFromPrompt('can you help me with logic apps?');
      expect(result.action).toBe('help');
      expect(result.confidence).toBe('high');
    });
  });

  describe('unknown intent', () => {
    it('should return unknown for unrecognized prompts', () => {
      const result = parseIntentFromPrompt('what is the weather today?');
      expect(result.action).toBe('unknown');
      expect(result.confidence).toBe('low');
    });

    it('should return unknown for vague questions', () => {
      const result = parseIntentFromPrompt('tell me about logic apps');
      expect(result.action).toBe('unknown');
      expect(result.confidence).toBe('low');
    });
  });

  describe('case insensitivity', () => {
    it('should handle uppercase', () => {
      const result = parseIntentFromPrompt('CREATE A NEW WORKFLOW');
      expect(result.action).toBe('createWorkflows');
    });

    it('should handle mixed case', () => {
      const result = parseIntentFromPrompt('Create A New Project');
      expect(result.action).toBe('createProject');
    });
  });
});

describe('mapExtractedType', () => {
  describe('valid type mappings', () => {
    it('should map "stateful" to WorkflowTypeOption.stateful', () => {
      expect(mapExtractedType('stateful')).toBe(WorkflowTypeOption.stateful);
    });

    it('should map "stateless" to WorkflowTypeOption.stateless', () => {
      expect(mapExtractedType('stateless')).toBe(WorkflowTypeOption.stateless);
    });

    it('should map "agentic" to WorkflowTypeOption.agentic', () => {
      expect(mapExtractedType('agentic')).toBe(WorkflowTypeOption.agentic);
    });

    it('should map "agent" to WorkflowTypeOption.agent', () => {
      expect(mapExtractedType('agent')).toBe(WorkflowTypeOption.agent);
    });
  });

  describe('case insensitivity', () => {
    it('should handle uppercase "STATEFUL"', () => {
      expect(mapExtractedType('STATEFUL')).toBe(WorkflowTypeOption.stateful);
    });

    it('should handle mixed case "Stateless"', () => {
      expect(mapExtractedType('Stateless')).toBe(WorkflowTypeOption.stateless);
    });

    it('should handle "AGENTIC"', () => {
      expect(mapExtractedType('AGENTIC')).toBe(WorkflowTypeOption.agentic);
    });
  });

  describe('undefined/invalid handling', () => {
    it('should return undefined for undefined input', () => {
      expect(mapExtractedType(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(mapExtractedType('')).toBeUndefined();
    });

    it('should return undefined for unknown type', () => {
      expect(mapExtractedType('invalid')).toBeUndefined();
    });

    it('should return undefined for partial match', () => {
      expect(mapExtractedType('state')).toBeUndefined();
    });

    it('should return undefined for typo', () => {
      expect(mapExtractedType('statefull')).toBeUndefined();
    });
  });
});

describe('isConfirmationResponse', () => {
  describe('positive confirmations', () => {
    it('should recognize "yes"', () => {
      expect(isConfirmationResponse('yes')).toBe(true);
    });

    it('should recognize "yeah"', () => {
      expect(isConfirmationResponse('yeah')).toBe(true);
    });

    it('should recognize "sure"', () => {
      expect(isConfirmationResponse('sure')).toBe(true);
    });

    it('should recognize "ok"', () => {
      expect(isConfirmationResponse('ok')).toBe(true);
    });

    it('should recognize "okay"', () => {
      expect(isConfirmationResponse('okay')).toBe(true);
    });

    it('should recognize "sounds good"', () => {
      expect(isConfirmationResponse('sounds good')).toBe(true);
    });

    it('should recognize "go ahead"', () => {
      expect(isConfirmationResponse('go ahead')).toBe(true);
    });

    it('should recognize "perfect"', () => {
      expect(isConfirmationResponse('perfect')).toBe(true);
    });

    it('should recognize "great"', () => {
      expect(isConfirmationResponse('great')).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    it('should recognize "YES"', () => {
      expect(isConfirmationResponse('YES')).toBe(true);
    });

    it('should recognize "Sure"', () => {
      expect(isConfirmationResponse('Sure')).toBe(true);
    });

    it('should recognize "OKAY"', () => {
      expect(isConfirmationResponse('OKAY')).toBe(true);
    });
  });

  describe('with additional text', () => {
    it('should recognize "yes please"', () => {
      expect(isConfirmationResponse('yes please')).toBe(true);
    });

    it('should recognize "sure thing"', () => {
      expect(isConfirmationResponse('sure thing')).toBe(true);
    });

    it('should recognize "that sounds good"', () => {
      expect(isConfirmationResponse('that sounds good')).toBe(true);
    });
  });

  describe('negative cases', () => {
    it('should not recognize "no"', () => {
      expect(isConfirmationResponse('no')).toBe(false);
    });

    it('should not recognize random text', () => {
      expect(isConfirmationResponse('create a workflow')).toBe(false);
    });

    it('should not recognize project names', () => {
      expect(isConfirmationResponse('MyLogicApp')).toBe(false);
    });
  });
});

describe('parseProjectRequest - name it patterns', () => {
  it('should extract name from "Name it MyLogicApp"', () => {
    const result = parseProjectRequest('Name it MyLogicApp');
    expect(result.name).toBe('MyLogicApp');
  });

  it('should extract name from "Call it OrderSystem"', () => {
    const result = parseProjectRequest('Call it OrderSystem');
    expect(result.name).toBe('OrderSystem');
  });

  it('should extract name from "name it MyProject"', () => {
    const result = parseProjectRequest('name it MyProject');
    expect(result.name).toBe('MyProject');
  });

  it('should handle "call it" with lowercase', () => {
    const result = parseProjectRequest('call it TestApp');
    expect(result.name).toBe('TestApp');
  });

  it('should prioritize "name it" over PascalCase word extraction', () => {
    const result = parseProjectRequest('Name it FinalProject please');
    expect(result.name).toBe('FinalProject');
  });

  it('should NOT extract "Name" as project name', () => {
    const result = parseProjectRequest('Name');
    expect(result.name).toBeUndefined();
  });

  it('should NOT extract "Call" as project name', () => {
    const result = parseProjectRequest('Call');
    expect(result.name).toBeUndefined();
  });

  it('should NOT extract "New" as project name', () => {
    const result = parseProjectRequest('New');
    expect(result.name).toBeUndefined();
  });

  it('should detect rules engine project type', () => {
    const result = parseProjectRequest('create a rules engine logic app called RulesApp');
    expect(result.type).toBe(ProjectTypeOption.rulesEngine);
    expect(result.includeCustomCode).toBe(true);
    expect(result.name).toBe('RulesApp');
  });

  it('should detect business rules project type', () => {
    const result = parseProjectRequest('create a business rules project');
    expect(result.type).toBe(ProjectTypeOption.rulesEngine);
    expect(result.includeCustomCode).toBe(true);
  });

  it('should detect custom code project type', () => {
    const result = parseProjectRequest('create a custom code logic app called MyApp');
    expect(result.type).toBe(ProjectTypeOption.logicAppCustomCode);
    expect(result.includeCustomCode).toBe(true);
    expect(result.name).toBe('MyApp');
  });

  it('should detect C# project type', () => {
    const result = parseProjectRequest('create a C# logic app project');
    expect(result.type).toBe(ProjectTypeOption.logicAppCustomCode);
    expect(result.includeCustomCode).toBe(true);
  });

  it('should default to logicApp project type', () => {
    const result = parseProjectRequest('create a logic app called BasicApp');
    expect(result.type).toBe(ProjectTypeOption.logicApp);
    expect(result.includeCustomCode).toBe(false);
  });
});

describe('mapParsedProjectType', () => {
  it('should map rulesEngine', () => {
    expect(mapParsedProjectType('rulesEngine')).toBe(ProjectTypeOption.rulesEngine);
  });

  it('should map rules engine (with space)', () => {
    expect(mapParsedProjectType('rules engine')).toBe(ProjectTypeOption.rulesEngine);
  });

  it('should map logicAppCustomCode', () => {
    expect(mapParsedProjectType('logicAppCustomCode')).toBe(ProjectTypeOption.logicAppCustomCode);
  });

  it('should map customCode', () => {
    expect(mapParsedProjectType('customCode')).toBe(ProjectTypeOption.logicAppCustomCode);
  });

  it('should map custom code (with space)', () => {
    expect(mapParsedProjectType('custom code')).toBe(ProjectTypeOption.logicAppCustomCode);
  });

  it('should map logicApp', () => {
    expect(mapParsedProjectType('logicApp')).toBe(ProjectTypeOption.logicApp);
  });

  it('should return undefined for unknown', () => {
    expect(mapParsedProjectType('something')).toBeUndefined();
  });

  it('should return undefined for undefined', () => {
    expect(mapParsedProjectType(undefined)).toBeUndefined();
  });
});

describe('mapParsedTargetFramework', () => {
  it('should map net8', () => {
    expect(mapParsedTargetFramework('net8')).toBe(TargetFrameworkOption.net8);
  });

  it('should map .net 8', () => {
    expect(mapParsedTargetFramework('.net 8')).toBe(TargetFrameworkOption.net8);
  });

  it('should map net472', () => {
    expect(mapParsedTargetFramework('net472')).toBe(TargetFrameworkOption.netFx);
  });

  it('should map netfx', () => {
    expect(mapParsedTargetFramework('netfx')).toBe(TargetFrameworkOption.netFx);
  });

  it('should map .net framework', () => {
    expect(mapParsedTargetFramework('.net framework')).toBe(TargetFrameworkOption.netFx);
  });

  it('should return undefined for unknown', () => {
    expect(mapParsedTargetFramework('something')).toBeUndefined();
  });

  it('should return undefined for undefined', () => {
    expect(mapParsedTargetFramework(undefined)).toBeUndefined();
  });
});

describe('modify disambiguation helpers', () => {
  it('extracts project names from ambiguity response bullet list', () => {
    const text = 'Workflow "Workflow1" exists in multiple projects. Please specify projectName.\n- OrderManagement\n- TonyProject';

    expect(extractProjectNamesFromAmbiguityResponse(text)).toEqual(['OrderManagement', 'TonyProject']);
  });

  it('extracts project names from ambiguity response unicode bullets', () => {
    const text = 'Workflow "Workflow1" exists in multiple projects. Please specify projectName.\n• OrderManagement\n• TonyProject';

    expect(extractProjectNamesFromAmbiguityResponse(text)).toEqual(['OrderManagement', 'TonyProject']);
  });

  it('resolves exact project selection', () => {
    const selected = resolveSelectedProjectName('TonyProject', ['OrderManagement', 'TonyProject']);
    expect(selected).toBe('TonyProject');
  });

  it('resolves project selection from contextual reply', () => {
    const selected = resolveSelectedProjectName('@logicapps in TonyProject, please', ['OrderManagement', 'TonyProject']);
    expect(selected).toBe('TonyProject');
  });

  it('returns undefined when selection does not match available projects', () => {
    const selected = resolveSelectedProjectName('Contoso', ['OrderManagement', 'TonyProject']);
    expect(selected).toBeUndefined();
  });

  it('extracts project from initial modify prompt with workflow context', () => {
    const project = extractTargetProjectFromPrompt(
      '@logicapps in TonyProject, Workflow1, have a http trigger that reads the weather in seattle. then return the weather'
    );
    expect(project).toBe('TonyProject');
  });

  it('returns undefined when no project-like token exists', () => {
    const project = extractTargetProjectFromPrompt('modify Workflow1 to add a response');
    expect(project).toBeUndefined();
  });
});

describe('ProjectOtto parity contract', () => {
  describe('intent routing contract', () => {
    it.each([
      {
        prompt: 'Create 5 stateful workflows under TonyProject from Stateful1-5',
        expectedAction: 'createWorkflows',
        expectedConfidence: 'high',
      },
      {
        prompt: 'create new rule engine logic app with one workflow called stateful',
        expectedAction: 'createProject',
        expectedConfidence: 'high',
      },
      {
        prompt: 'add a workflow to the project',
        expectedAction: 'createWorkflows',
        expectedConfidence: 'high',
      },
      {
        prompt: 'modify the HTTP action timeout',
        expectedAction: 'modifyAction',
        expectedConfidence: 'medium',
      },
      {
        prompt: 'what can you help me with?',
        expectedAction: 'help',
        expectedConfidence: 'high',
      },
    ])('Given "$prompt" Then action=$expectedAction confidence=$expectedConfidence', ({ prompt, expectedAction, expectedConfidence }) => {
      const result = parseIntentFromPrompt(prompt);
      expect(result.action).toBe(expectedAction);
      expect(result.confidence).toBe(expectedConfidence);
    });
  });

  describe('workflow name expansion contract', () => {
    it('Given "Order4-8" in follow-up Then expands to 5 workflows', () => {
      const result = parseAdditionalWorkflowSpecs('Order4-8');
      expect(result.baseName).toBe('Order');
      expect(result.workflows.map((w) => w.name)).toEqual(['Order4', 'Order5', 'Order6', 'Order7', 'Order8']);
    });

    it('Given "5 workflows from Workflow1-5" Then preserves unspecified type', () => {
      const result = parseWorkflowSpecs('5 workflows from Workflow1-5');
      expect(result).toHaveLength(5);
      expect(result.every((w) => w.type === undefined)).toBe(true);
    });

    it('Given mixed batch "3 stateful... and 2 agentic..." Then keeps both types', () => {
      const result = parseWorkflowSpecs('3 stateful workflows called Order and 2 agentic workflows called Agent');
      expect(result).toHaveLength(5);
      expect(result.filter((w) => w.type === WorkflowTypeOption.stateful)).toHaveLength(3);
      expect(result.filter((w) => w.type === WorkflowTypeOption.agentic)).toHaveLength(2);
    });
  });

  describe('project defaults contract', () => {
    it('Given rules engine prompt Then classify as rulesEngine with custom code', () => {
      const result = parseProjectRequest('create a business rules project called RulesApp');
      expect(result.type).toBe(ProjectTypeOption.rulesEngine);
      expect(result.includeCustomCode).toBe(true);
    });

    it('Given conversational confirmation Then recognizes yes/ok style response', () => {
      expect(isConfirmationResponse('yes please')).toBe(true);
      expect(isConfirmationResponse('sounds good')).toBe(true);
      expect(isConfirmationResponse('no')).toBe(false);
    });

    it('Given parsed framework aliases Then map to expected framework', () => {
      expect(mapParsedTargetFramework('net8')).toBe(TargetFrameworkOption.net8);
      expect(mapParsedTargetFramework('.net framework')).toBe(TargetFrameworkOption.netFx);
    });
  });

  describe('orchestration parity TODOs', () => {
    it.todo('Given existing workflow conflicts Then skip existing and only create remaining with clear summary output');
    it.todo('Given mixed create outcomes Then final message includes created and failed workflow breakdown');
    it.todo('Given cancellation during batch create Then stop creating additional workflows and return partial outcome safely');
    it.todo('Given concurrent workflow creation Then stream per-workflow progress lifecycle (queued/creating/created/failed)');
  });
});
