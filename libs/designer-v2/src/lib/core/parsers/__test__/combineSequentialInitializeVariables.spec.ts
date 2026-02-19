import constants from '../../../common/constants';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { describe, it, expect } from 'vitest';
import { hasVariableReference, detectSequentialInitializeVariables, combineSequentialInitializeVariables } from '../ParseReduxAction';

// Helper to create a basic workflow definition for testing
const createBaseWorkflowDefinition = (): LogicAppsV2.WorkflowDefinition => ({
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  contentVersion: '1.0.0.0',
  actions: {},
  triggers: {
    manual: {
      type: 'Request',
      kind: 'Http',
    },
  },
});

// Helper to create an initialize variable action
const createInitializeVariableAction = (
  variables: Array<{ name: string; type: string; value: any }>,
  runAfter?: Record<string, string[]>,
  trackedProperties?: Record<string, any>
): LogicAppsV2.InitializeVariableAction => {
  const action: LogicAppsV2.InitializeVariableAction = {
    type: constants.SERIALIZED_TYPE.INITIALIZE_VARIABLE,
    inputs: { variables },
    runAfter: runAfter || {},
  };

  if (trackedProperties) {
    action.trackedProperties = trackedProperties;
  }

  return action;
};

describe('combineSequentialInitializeVariables', () => {
  describe('hasVariableReference detection', () => {
    it('should detect @{variables(...)} pattern', () => {
      const value = "@{variables('otherVar')}";
      expect(hasVariableReference(value)).toBe(true);
    });

    it('should detect @variables(...) pattern without braces', () => {
      const value = "@variables('otherVar')";
      expect(hasVariableReference(value)).toBe(true);
    });

    it('should detect @{variable(...)} pattern (singular)', () => {
      const value = "@{variable('otherVar')}";
      expect(hasVariableReference(value)).toBe(true);
    });

    it('should detect @variable(...) pattern without braces (singular)', () => {
      const value = "@variable('otherVar')";
      expect(hasVariableReference(value)).toBe(true);
    });

    it('should handle case insensitive matching', () => {
      const value = "@{VARIABLES('otherVar')}";
      expect(hasVariableReference(value)).toBe(true);
    });

    it('should handle whitespace after variable/variables', () => {
      const value = "@{variables ('otherVar')}";
      expect(hasVariableReference(value)).toBe(true);
    });

    it('should not match non-variable patterns', () => {
      expect(hasVariableReference('simple string')).toBe(false);
      expect(hasVariableReference('123')).toBe(false);
      expect(hasVariableReference(123)).toBe(false);
      expect(hasVariableReference('@{triggerBody()}')).toBe(false);
      expect(hasVariableReference("@parameters('param')")).toBe(false);
      expect(hasVariableReference(null)).toBe(false);
      expect(hasVariableReference(undefined)).toBe(false);
    });

    it('should detect variable references within complex expressions', () => {
      const value = "prefix @{variables('test')} suffix";
      expect(hasVariableReference(value)).toBe(true);
    });

    it('should detect variables() nested inside other functions (issue #1447)', () => {
      const value = "@{substring(variables('alert-resource-name'), 0, sub(length(variables('alert-resource-name')), 4)) }";
      expect(hasVariableReference(value)).toBe(true);
    });

    it('should detect variables() inside length()', () => {
      const value = "@{length(variables('myList'))}";
      expect(hasVariableReference(value)).toBe(true);
    });

    it('should detect variables() inside concat()', () => {
      const value = "@{concat('prefix-', variables('name'), '-suffix')}";
      expect(hasVariableReference(value)).toBe(true);
    });

    it('should detect variables() inside toLower()', () => {
      const value = "@{toLower(variables('myVar'))}";
      expect(hasVariableReference(value)).toBe(true);
    });
  });

  describe('sequential variable combining', () => {
    it('should combine simple sequential initialize variables', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: 'test2' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
        Initialize_var3: createInitializeVariableAction([{ name: 'var3', type: 'string', value: 'test3' }], {
          Initialize_var2: ['SUCCEEDED'],
        }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(1);
      expect(result.actions!.Initialize_var3).toBeDefined();
      const action = result.actions!.Initialize_var3 as LogicAppsV2.InitializeVariableAction;
      expect(action.inputs.variables).toHaveLength(3);
      expect(action.inputs.variables[0].name).toBe('var1');
      expect(action.inputs.variables[1].name).toBe('var2');
      expect(action.inputs.variables[2].name).toBe('var3');
    });

    it('should NOT combine variables that reference other variables with @{variables(...)}', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: "@{variables('var1')}" }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(2);
      expect(result.actions!.Initialize_var1).toBeDefined();
      expect(result.actions!.Initialize_var2).toBeDefined();
    });

    it('should NOT combine variables that reference other variables with @variables(...)', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: "@variables('var1')" }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(2);
      expect(result.actions!.Initialize_var1).toBeDefined();
      expect(result.actions!.Initialize_var2).toBeDefined();
    });

    it('should NOT combine when intermediate actions are referenced by external actions', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: 'test2' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
        Initialize_var3: createInitializeVariableAction(
          [{ name: 'var3', type: 'string', value: 'test3' }],
          { Initialize_var1: ['SUCCEEDED'] } // References var1, creating a parallel branch
        ),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(3);
      expect(result.actions!.Initialize_var1).toBeDefined();
      expect(result.actions!.Initialize_var2).toBeDefined();
      expect(result.actions!.Initialize_var3).toBeDefined();
    });

    it('should NOT combine when action runs after multiple parallel variables', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: 'test2' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
        Initialize_var3: createInitializeVariableAction([{ name: 'var3', type: 'string', value: 'test3' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
        Initialize_var4: createInitializeVariableAction([{ name: 'var4', type: 'string', value: 'test4' }], {
          Initialize_var2: ['SUCCEEDED'],
          Initialize_var3: ['SUCCEEDED'],
        }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(4);
      expect(result.actions!.Initialize_var1).toBeDefined();
      expect(result.actions!.Initialize_var2).toBeDefined();
      expect(result.actions!.Initialize_var3).toBeDefined();
      expect(result.actions!.Initialize_var4).toBeDefined();
    });

    it('should preserve trackedProperties when combining', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }], {}, { property1: 'value1' }),
        Initialize_var2: createInitializeVariableAction(
          [{ name: 'var2', type: 'string', value: 'test2' }],
          { Initialize_var1: ['SUCCEEDED'] },
          { property2: 'value2' }
        ),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(1);
      expect(result.actions!.Initialize_var2).toBeDefined();
      const action = result.actions!.Initialize_var2 as LogicAppsV2.InitializeVariableAction;
      expect(action.trackedProperties).toEqual({
        property1: 'value1',
        property2: 'value2',
      });
    });

    it('should handle non-InitializeVariable actions in the workflow', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        SomeOtherAction: {
          type: 'Http',
          inputs: { uri: 'https://example.com' },
          runAfter: { Initialize_var1: ['SUCCEEDED'] },
        },
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: 'test2' }], {
          SomeOtherAction: ['SUCCEEDED'],
        }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(3);
      expect(result.actions!.Initialize_var1).toBeDefined();
      expect(result.actions!.SomeOtherAction).toBeDefined();
      expect(result.actions!.Initialize_var2).toBeDefined();
    });

    it('should NOT combine when exceeding VARIABLE_EDITOR_MAX_VARIABLES limit', () => {
      const definition = createBaseWorkflowDefinition();

      // Create a sequence that would exceed the limit when combined
      const manyVariables = Array.from({ length: 100 }, (_, i) => ({
        name: `var${i}`,
        type: 'string',
        value: `value${i}`,
      }));

      definition.actions = {
        Initialize_var1: createInitializeVariableAction(manyVariables.slice(0, 50)),
        Initialize_var2: createInitializeVariableAction(manyVariables.slice(50, 100), { Initialize_var1: ['SUCCEEDED'] }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(2);
      expect(result.actions!.Initialize_var1).toBeDefined();
      expect(result.actions!.Initialize_var2).toBeDefined();
    });

    it('should handle empty runAfter (start of workflow)', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }], {}),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: 'test2' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(1);
      expect(result.actions!.Initialize_var2).toBeDefined();
      const action = result.actions!.Initialize_var2 as LogicAppsV2.InitializeVariableAction;
      expect(action.inputs.variables).toHaveLength(2);
    });

    it('should handle complex variable values with expressions', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: '@{triggerBody().property}' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
        Initialize_var3: createInitializeVariableAction([{ name: 'var3', type: 'integer', value: '@{add(1, 2)}' }], {
          Initialize_var2: ['SUCCEEDED'],
        }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(1);
      expect(result.actions!.Initialize_var3).toBeDefined();
      const action = result.actions!.Initialize_var3 as LogicAppsV2.InitializeVariableAction;
      expect(action.inputs.variables).toHaveLength(3);
    });

    it('should handle different variable types', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'integer', value: 42 }], { Initialize_var1: ['SUCCEEDED'] }),
        Initialize_var3: createInitializeVariableAction([{ name: 'var3', type: 'boolean', value: true }], {
          Initialize_var2: ['SUCCEEDED'],
        }),
        Initialize_var4: createInitializeVariableAction([{ name: 'var4', type: 'array', value: [] }], { Initialize_var3: ['SUCCEEDED'] }),
        Initialize_var5: createInitializeVariableAction([{ name: 'var5', type: 'object', value: {} }], { Initialize_var4: ['SUCCEEDED'] }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(1);
      expect(result.actions!.Initialize_var5).toBeDefined();
      const action = result.actions!.Initialize_var5 as LogicAppsV2.InitializeVariableAction;
      expect(action.inputs.variables).toHaveLength(5);
    });

    it('should maintain order of variables when combining', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'first', type: 'string', value: '1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'second', type: 'string', value: '2' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
        Initialize_var3: createInitializeVariableAction([{ name: 'third', type: 'string', value: '3' }], {
          Initialize_var2: ['SUCCEEDED'],
        }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      const action = result.actions!.Initialize_var3 as LogicAppsV2.InitializeVariableAction;
      const variables = action.inputs.variables;
      expect(variables[0].name).toBe('first');
      expect(variables[1].name).toBe('second');
      expect(variables[2].name).toBe('third');
    });

    it('should NOT combine if variable value contains variable reference in middle of string', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: "prefix @{variables('var1')} suffix" }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(2);
      expect(result.actions!.Initialize_var1).toBeDefined();
      expect(result.actions!.Initialize_var2).toBeDefined();
    });

    it('should NOT combine when variable references another variable inside nested functions (issue #1447)', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'alert-resource-name', type: 'string', value: 'thhhhhhhhhhhhhhhhhhhhhhhh' }]),
        Initialize_var2: createInitializeVariableAction(
          [
            {
              name: 'alert-logic-app-name',
              type: 'string',
              value: "@{substring(variables('alert-resource-name'), 0, sub(length(variables('alert-resource-name')), 4)) }",
            },
          ],
          {
            Initialize_var1: ['SUCCEEDED'],
          }
        ),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(2);
      expect(result.actions!.Initialize_var1).toBeDefined();
      expect(result.actions!.Initialize_var2).toBeDefined();
    });

    it('should handle multiple parallel branches from same parent', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: 'test2' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
        Initialize_var3: createInitializeVariableAction([{ name: 'var3', type: 'string', value: 'test3' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
        Initialize_var4: createInitializeVariableAction([{ name: 'var4', type: 'string', value: 'test4' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
      };

      const result = combineSequentialInitializeVariables(definition);
      expect(result.actions).toBeDefined();
      expect(Object.keys(result.actions!)).toHaveLength(4);
      expect(result.actions!.Initialize_var1).toBeDefined();
      expect(result.actions!.Initialize_var2).toBeDefined();
      expect(result.actions!.Initialize_var3).toBeDefined();
      expect(result.actions!.Initialize_var4).toBeDefined();
    });
  });

  describe('detectSequentialInitializeVariables', () => {
    it('should detect sequential initialize variables', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: 'test2' }], {
          Initialize_var1: ['SUCCEEDED'],
        }),
      };

      expect(detectSequentialInitializeVariables(definition)).toBe(true);
    });

    it('should return false when no sequential variables exist', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        SomeAction: {
          type: 'Http',
          inputs: { uri: 'https://example.com' },
          runAfter: { Initialize_var1: ['SUCCEEDED'] },
        },
      };

      expect(detectSequentialInitializeVariables(definition)).toBe(false);
    });

    it('should return false for parallel initialize variables', () => {
      const definition = createBaseWorkflowDefinition();
      definition.actions = {
        Initialize_var1: createInitializeVariableAction([{ name: 'var1', type: 'string', value: 'test1' }]),
        Initialize_var2: createInitializeVariableAction([{ name: 'var2', type: 'string', value: 'test2' }]),
      };

      expect(detectSequentialInitializeVariables(definition)).toBe(false);
    });
  });
});
