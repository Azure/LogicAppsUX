import { expect, test } from '@playwright/test';
import { beforeEach } from 'node:test';

test.describe(
  'Copy and Paste of Scopes',
  {
    tag: '@real',
  },
  () => {
    beforeEach(async () => { });
    test('Expect Copy and Paste of Scopes to work on single workflow', async ({ page, context, browserName }) => {
      if (browserName === 'webkit') {
        context.grantPermissions(['clipboard-read'], { origin: 'http://localhost:4200' });
      }
      await page.goto('/');
      await page.getByPlaceholder('Select an App').click({ timeout: 20000 });
      await page.getByPlaceholder('Select an App').fill(`wapp-lauxtest${browserName}`, { timeout: 20000 });
      await page.getByPlaceholder('Select an App').press('Enter', { timeout: 20000 });
      await page.getByLabel('Workflow').locator('span').filter({ hasText: '' }).click({ timeout: 20000 });
      await page.getByRole('option', { name: 'CopyPaste' }).click({ timeout: 20000 });
      await page.getByRole('button', { name: 'Toolbox' }).click({ timeout: 20000 });

      await page.waitForLoadState('networkidle');
      await page.getByTestId('rf__node-For_each-#scope').getByRole('button', { name: 'For each' }).focus();
      await page.keyboard.press('Meta+C');
      await page.getByTestId('rf__edge-For_each-Filter_array').getByLabel('Insert a new step between For').focus();
      await page.keyboard.press('Meta+V');
      await page.waitForTimeout(1000);
      const serialized: any = await page.evaluate(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const state = (window as any).DesignerStore.getState();
            resolve((window as any).DesignerModule.serializeBJSWorkflow(state));
          }, 5000);
        });
      });
      expect(serialized.definition).toEqual(verificationWorkflow);
    });
  }
);

const verificationWorkflow = {
  "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
  "actions": {
    "Initialize_ArrayVariable": {
      "type": "InitializeVariable",
      "inputs": {
        "variables": [
          {
            "name": "ArrayVariable",
            "type": "array",
            "value": [
              {
                "document": "A",
                "min": 7500001,
                "policy": "X"
              },
              {
                "document": "B",
                "min": 7500001,
                "policy": "Y"
              },
              {
                "document": "C",
                "min": 7500001,
                "policy": "Z"
              }
            ]
          }
        ]
      },
      "runAfter": {}
    },
    "Filter_array": {
      "type": "Query",
      "inputs": {
        "from": "@body('Parse_JSON')",
        "where": "@not(contains(length(split(item(), '|')?[0]),length(split(item(), '|')?[0])))"
      },
      "runAfter": {
        "For_each-copy": [
          "SUCCEEDED"
        ]
      }
    },
    "HTTP": {
      "type": "Http",
      "inputs": {
        "uri": "http://test.com",
        "method": "GET",
        "body": "@variables('ArrayVariable')"
      },
      "runAfter": {
        "Filter_array": [
          "SUCCEEDED"
        ]
      },
      "runtimeConfiguration": {
        "contentTransfer": {
          "transferMode": "Chunked"
        }
      }
    },
    "For_each": {
      "type": "foreach",
      "foreach": "@triggerOutputs()?['body']?['array']",
      "actions": {
        "Parse_JSON": {
          "type": "ParseJson",
          "inputs": {
            "content": "@{triggerBody()?['string']}@{variables('ArrayVariable')}@{item()?['item1']}",
            "schema": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "document": {
                    "type": "string"
                  },
                  "min": {
                    "type": "integer"
                  },
                  "policy": {
                    "type": "string"
                  }
                },
                "required": [
                  "document",
                  "min",
                  "policy"
                ]
              }
            }
          }
        }
      },
      "runAfter": {
        "Initialize_ArrayVariable": [
          "SUCCEEDED"
        ]
      }
    },
    "For_each-copy": {
      "type": "foreach",
      "foreach": "@triggerOutputs()?['body']?['array']",
      "actions": {
        "Parse_JSON_1": {
          "type": "ParseJson",
          "inputs": {
            "content": "@{triggerBody()?['string']}@{variables('ArrayVariable')}@{item()?['item1']}",
            "schema": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "document": {
                    "type": "string"
                  },
                  "min": {
                    "type": "integer"
                  },
                  "policy": {
                    "type": "string"
                  }
                },
                "required": [
                  "document",
                  "min",
                  "policy"
                ]
              }
            }
          }
        }
      },
      "runAfter": {
        "For_each": [
          "SUCCEEDED"
        ]
      }
    }
  },
  "contentVersion": "1.0.0.0",
  "outputs": {},
  "triggers": {
    "manual": {
      "type": "Request",
      "kind": "Http",
      "inputs": {
        "schema": {
          "type": "object",
          "properties": {
            "array": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "item1": {
                    "type": "string"
                  }
                },
                "required": [
                  "item1"
                ]
              }
            },
            "string": {
              "type": "string"
            },
            "number": {
              "type": "integer"
            }
          }
        }
      }
    }
  }
};
