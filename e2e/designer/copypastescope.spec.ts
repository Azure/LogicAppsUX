import { test, expect } from '@playwright/test';

test(
  'Expect Copy and Paste of Scopes to work on single workflow',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await page.getByText('Select an option').click();
    await page.getByRole('option', { name: 'Panel' }).click();
    await page.getByRole('button', { name: 'Toolbox' }).click();
    await page.getByTestId('rf__edge-Parse_JSON-Filter_array').getByLabel('Insert a new step between').click();
    await page.getByText('Add an action').click();
    await page.getByPlaceholder('Search').fill('sw');
    await page.getByLabel('Switch Identifies a single').click();
    await page.getByRole('paragraph').click();
    await page.getByLabel('On', { exact: true }).fill('test');
    await page.getByLabel('Add Case').click();
    await page.getByRole('paragraph').click();
    await page.getByLabel('Equals').fill('test');
    await page.getByLabel('Equals').press('F2');
    await page.getByLabel('Insert a new step in Case').click();
    await page.getByText('Add an actionPaste an action').click();
    await page.getByText('Add an action').click();
    await page.getByPlaceholder('Search').fill('http');
    await page.getByLabel('HTTP Choose a REST API to').click();
    await page.getByLabel('URI').getByRole('paragraph').click();
    await page.getByLabel('URI').fill('http://test.com');
    await page.getByRole('button', { name: 'Method' }).click();
    await page.getByRole('option', { name: 'GET' }).click();
    await page.getByLabel('Add Case').click();
    await page.getByRole('paragraph').click();
    await page.getByLabel('Equals').fill('test4');
    await page.getByLabel('Insert a new step in Case').click();
    await page.getByText('Add an action').click();
    await page.getByPlaceholder('Search').fill('for ');
    await page.getByLabel('For each Executes a block of').click();
    await page.getByRole('paragraph').click();
    await page.locator('button').filter({ hasText: '' }).click();
    await page.getByRole('button', { name: 'ArrayVariable', exact: true }).click();
    await page.getByLabel('Insert a new step in For each').click();
    await page.getByText('Add an action').click();
    await page.getByPlaceholder('Search').fill('termina');
    await page.getByLabel('Terminate Terminate the').click();
    await page.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'Succeeded' }).click();
    await page.getByTestId('rf__node-Switch-#scope').getByRole('button', { name: 'Switch' }).click({
      button: 'right',
    });
    await page.getByText('Copy Switch').click();
    await page.getByTestId('rf__edge-Parse_JSON-Switch').getByLabel('Insert a new step between').click();
    await page.getByText('Paste an action').click();
    await page.getByTestId('card-Terminate 1').getByLabel('Terminate operation, Control').click();
    await expect(page.getByRole('combobox', { name: 'Status' })).toHaveValue('Succeeded');
    await page.getByTestId('rf__node-Case_2-#subgraph').getByRole('button', { name: 'Case' }).click();
    await expect(page.getByLabel('Equals').locator('span')).toContainText('test4');
    await page.getByTestId('card-HTTP 2').getByLabel('HTTP operation, HTTP connector').click();
    await expect(page.getByLabel('URI').locator('span')).toContainText('http://test.com');
    await expect(page.getByRole('combobox', { name: 'Method' })).toHaveValue('GET');
    await page.getByRole('button', { name: 'Code View' }).click();
    const serialized: any = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const state = (window as any).DesignerStore.getState();
          resolve((window as any).DesignerModule.serializeBJSWorkflow(state));
        }, 5000);
      });
    });

    expect({
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: {
          Initialize_ArrayVariable: {
            type: 'InitializeVariable',
            inputs: {
              variables: [
                {
                  name: 'ArrayVariable',
                  type: 'array',
                },
              ],
            },
            runAfter: {},
          },
          Parse_JSON: {
            type: 'ParseJson',
            inputs: {
              content: "@{triggerBody()?['string']}@{variables('ArrayVariable')}",
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    document: {
                      type: 'string',
                    },
                    min: {
                      type: 'integer',
                    },
                    policy: {
                      type: 'string',
                    },
                  },
                  required: ['document', 'min', 'policy'],
                },
              },
            },
            runAfter: {
              Initialize_ArrayVariable: ['SUCCEEDED'],
            },
          },
          Filter_array: {
            type: 'Query',
            inputs: {
              from: "@body('Parse_JSON')",
              where: "@not(contains(length(split(item(), '|')?[0]),length(split(item(), '|')?[0])))",
            },
            runAfter: {
              Switch: ['SUCCEEDED'],
            },
          },
          HTTP: {
            type: 'Http',
            inputs: {
              uri: 'http://test.com',
              method: 'GET',
              body: "@variables('ArrayVariable')",
            },
            runAfter: {
              Filter_array: ['SUCCEEDED'],
            },
            runtimeConfiguration: {
              contentTransfer: {
                transferMode: 'Chunked',
              },
            },
          },
          Switch: {
            type: 'Switch',
            expression: 'test',
            default: {
              actions: {},
            },
            cases: {
              Case: {
                actions: {
                  HTTP_1: {
                    type: 'Http',
                    inputs: {
                      uri: 'http://test.com',
                      method: 'GET',
                    },
                    runtimeConfiguration: {
                      contentTransfer: {
                        transferMode: 'Chunked',
                      },
                    },
                  },
                },
                case: 'test',
              },
              'Case 2': {
                actions: {
                  For_each: {
                    type: 'Foreach',
                    foreach: "@variables('ArrayVariable')",
                    actions: {
                      Terminate: {
                        type: 'Terminate',
                        inputs: {
                          runStatus: 'Succeeded',
                        },
                      },
                    },
                  },
                },
                case: 'test4',
              },
            },
            runAfter: {
              'Switch-copy': ['SUCCEEDED'],
            },
          },
          'Switch-copy': {
            type: 'Switch',
            expression: 'test',
            default: {
              actions: {},
            },
            cases: {
              Case_1: {
                actions: {
                  HTTP_2: {
                    type: 'Http',
                    inputs: {
                      uri: 'http://test.com',
                      method: 'GET',
                    },
                    runtimeConfiguration: {
                      contentTransfer: {
                        transferMode: 'Chunked',
                      },
                    },
                  },
                },
                case: 'test',
              },
              Case_2: {
                actions: {
                  For_each_1: {
                    type: 'Foreach',
                    foreach: "@variables('ArrayVariable')",
                    actions: {
                      Terminate_1: {
                        type: 'Terminate',
                        inputs: {
                          runStatus: 'Succeeded',
                        },
                      },
                    },
                  },
                },
                case: 'test4',
              },
            },
            runAfter: {
              Parse_JSON: ['SUCCEEDED'],
            },
          },
        },
        contentVersion: '1.0.0.0',
        outputs: {},
        triggers: {
          manual: {
            type: 'Request',
            kind: 'Http',
            inputs: {
              schema: {
                type: 'object',
                properties: {
                  array: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        item1: {
                          type: 'string',
                        },
                      },
                      required: ['item1'],
                    },
                  },
                  string: {
                    type: 'string',
                  },
                  number: {
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
      },
      connectionReferences: {},
      parameters: {},
    }).toEqual(serialized as any);
  }
);
