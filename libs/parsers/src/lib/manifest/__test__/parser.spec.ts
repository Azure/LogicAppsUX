import * as SwaggerConstants from '../../common/constants';
import type { DynamicListExtension, InputParameter, OutputParameter } from '../../models/operation';
import { DynamicSchemaType, DynamicValuesType } from '../../models/operation';
import { ManifestParser } from '../parser';
import { createItem, getEmails, onNewEmail } from './data/manifests';
import { equals } from '@microsoft-logic-apps/utils';

describe('Operation manifest parser tests', () => {
  describe('Input Parameters', () => {
    it('should return empty object when there is no inputs.', () => {
      const parser = new ManifestParser({
        properties: {
          iconUri: 'https://connectoricons-prod.azureedge.net/office365/icon_1.0.1008.1183.png',
          brandColor: '#0072c6',
          description: 'This operation gets emails from a folder.',
        },
      });

      const inputParameters = parser.getInputParameters(/* includeParentObject */ false, /* expandArrayPropertiesDepth */ 0);

      expect(Object.keys(inputParameters).length).toBe(0);
    });

    it('should return optional inputs when inputs is optional.', () => {
      const parser = new ManifestParser({
        properties: {
          iconUri: 'https://connectoricons-prod.azureedge.net/office365/icon_1.0.1008.1183.png',
          brandColor: '#0072c6',
          description: 'This operation gets emails from a folder.',
          isInputsOptional: true,
          inputs: {},
        },
      });

      const inputParameters = parser.getInputParameters(/* includeParentObject */ false, /* expandArrayPropertiesDepth */ 0);

      expect(Object.keys(inputParameters).length).toBe(1);
      expect(inputParameters['inputs.$'].required).toBe(false);
    });

    it('should parse primitive inputs which are children of objects correctly', () => {
      const parser = new ManifestParser(createItem);

      const inputParameters = parser.getInputParameters(/* includeParentObject */ false, /* expandArrayPropertiesDepth */ 0);

      const parameter = getInputByName(inputParameters, 'dataset');

      expect(parameter?.key).toBe('inputs.$.dataset');
      expect(parameter?.description).toBe('Example: https://contoso.sharepoint.com/sites/sitename');
      expect(parameter?.type).toBe('string');
      expect(parameter?.name).toBe('dataset');
      expect(parameter?.visibility).toBeFalsy();
    });

    it('should generate enum for boolean parameters', () => {
      const parser = new ManifestParser(createItem);

      const inputParameters = parser.getInputParameters(/* includeParentObject */ false, /* expandArrayPropertiesDepth */ 0);

      const parameter = getInputByName(inputParameters, 'bool');

      const enumValue = parameter?.enum;

      expect(enumValue?.[0].value).toBe('');
      expect(enumValue?.[1].value).toBeTruthy();
      expect(enumValue?.[2].value).toBeFalsy();
    });

    it('should determine when inputs are required', () => {
      const parser = new ManifestParser(createItem);

      const inputParameters = parser.getInputParameters(/* includeParentObject */ false, /* expandArrayPropertiesDepth */ 0);

      const toParameter = getInputByName(inputParameters, 'emailMessage/To');

      expect(toParameter?.required).toBeTruthy();
    });

    it('should determine when inputs are not required', () => {
      const parser = new ManifestParser(createItem);

      const inputParameters = parser.getInputParameters(/* includeParentObject */ false, /* expandArrayPropertiesDepth */ 0);

      const fromParameter = getInputByName(inputParameters, 'emailMessage/From');

      expect(fromParameter?.required).toBeFalsy();
    });

    it('should not mark an input required when any ancestor is not required', () => {
      const parser = new ManifestParser(createItem);
      const inputParameters = parser.getInputParameters(/* includeParentObject */ false, /* expandArrayPropertiesDepth */ 0);
      expect(getInputByName(inputParameters, 'emailMessage/Object/P1')?.required).toBeFalsy();
    });

    it('should parse internal array parameters when selected', () => {
      const parser = new ManifestParser(createItem);

      const allInputParameters = parser.getInputParameters(/* includeParentObject */ true, /* expandArrayPropertiesDepth */ 100);

      expect(allInputParameters['inputs.$.nestedObject.emailMessage.emailMessage/Attachments']).toBeDefined();
      expect(allInputParameters['inputs.$.nestedObject.emailMessage.emailMessage/Attachments.[*]']).toBeDefined();
      expect(allInputParameters['inputs.$.nestedObject.emailMessage.emailMessage/Attachments.[*].Name']).toBeDefined();
      expect(allInputParameters['inputs.$.nestedObject.emailMessage.emailMessage/Attachments.[*].ContentBytes']).toBeDefined();
    });

    it('should parse internal primitive array parameters when selected', () => {
      const parser = new ManifestParser(createItem);

      const allInputParameters = parser.getInputParameters(/* includeParentObject */ true, /* expandArrayPropertiesDepth */ 100);

      expect(allInputParameters['inputs.$.nestedObject.emailMessage.emailMessage/PrimitiveArray.[*]']).toBeDefined();
      expect(allInputParameters['inputs.$.nestedObject.emailMessage.emailMessage/PrimitiveArray.[*]'].type).toBe('string');
    });

    it('should pass through dynamic values', () => {
      const parser = new ManifestParser(createItem);

      const allInputParameters = parser.getInputParameters(/* includeParentObject */ true, /* expandArrayPropertiesDepth */ 100);

      expect(allInputParameters['inputs.$.dataset'].dynamicValues?.type).toBe(DynamicValuesType.DynamicList);
      expect(allInputParameters['inputs.$.dataset'].dynamicValues?.extension).toEqual({
        operationId: 'GetDataSets',
        parameters: {},
        itemsPath: 'value',
        itemValuePath: 'Name',
        itemTitlePath: 'DisplayName',
      });

      expect(allInputParameters['inputs.$.table'].dynamicValues?.type).toBe(DynamicValuesType.DynamicList);
      expect(allInputParameters['inputs.$.table'].dynamicValues?.extension).toEqual({
        operationId: 'GetTables',
        parameters: {
          dataset: {
            parameterReference: 'dataset',
          },
        },
        itemsPath: 'value',
        itemValuePath: 'Name',
        itemTitlePath: 'DisplayName',
      });
    });

    it('should pass through dynamic schema', () => {
      const parser = new ManifestParser(createItem);

      const allInputParameters = parser.getInputParameters(/* includeParentObject */ true, /* expandArrayPropertiesDepth */ 100);

      expect(allInputParameters['inputs.$.item'].dynamicSchema?.type).toBe(DynamicSchemaType.DynamicProperties);
      expect(allInputParameters['inputs.$.item'].dynamicSchema?.extension).toEqual({
        operationId: 'GetTable',
        itemValuePath: 'Schema/Items',
        parameters: {
          dataset: {
            parameterReference: 'dataset',
          },
          table: {
            parameterReference: 'table',
          },
        },
      });
    });

    it('should update dynamic extension parameters to reference aliases', () => {
      const parser = new ManifestParser(createItem);

      const allInputParameters = parser.getInputParameters(/* includeParentObject */ true, /* expandArrayPropertiesDepth */ 100);

      const parameter = allInputParameters['inputs.$.table'];

      expect((parameter.dynamicValues?.extension as DynamicListExtension).parameters['dataset'].parameterReference).toBe('dataset');
    });
  });

  describe('Output Parameters', () => {
    it('should return empty object when there is no outputs.', () => {
      const parser = new ManifestParser({
        properties: {
          iconUri: 'https://connectoricons-prod.azureedge.net/office365/icon_1.0.1008.1183.png',
          brandColor: '#0072c6',
          description: 'This operation gets emails from a folder.',
        },
      });

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      expect(Object.keys(outputParameters).length).toBe(0);
    });

    it('should return optional outputs when outputs is optional.', () => {
      const parser = new ManifestParser({
        properties: {
          iconUri: 'https://connectoricons-prod.azureedge.net/office365/icon_1.0.1008.1183.png',
          brandColor: '#0072c6',
          description: 'This operation gets emails from a folder.',
          isOutputsOptional: true,
          outputs: {},
          includeRootOutputs: true,
        },
      });

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      expect(Object.keys(outputParameters).length).toBe(1);
      expect(outputParameters['outputs.$'].required).toBe(false);
      expect(outputParameters['outputs.$'].name).toBe('key-outputs-output');
    });

    it('should return optional outputs when outputs is optional.', () => {
      const parser = new ManifestParser({
        properties: {
          iconUri: 'https://connectoricons-prod.azureedge.net/office365/icon_1.0.1008.1183.png',
          brandColor: '#0072c6',
          description: 'This operation gets emails from a folder.',
          isOutputsOptional: true,
          outputs: {},
          includeRootOutputs: true,
        },
      });

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      expect(Object.keys(outputParameters).length).toBe(1);
      expect(outputParameters['outputs.$'].required).toBe(false);
      expect(outputParameters['outputs.$'].name).toBe('key-outputs-output');
    });

    it('should not return alternative outputs if no runtime outputs are provided', () => {
      const parser = new ManifestParser({
        properties: {
          iconUri: 'https://connectoricons-prod.azureedge.net/office365/icon_1.0.1008.1183.png',
          brandColor: '#0072c6',
          description: 'This operation gets emails from a folder.',
          isOutputsOptional: true,
          outputs: {
            type: 'object',
            properties: {
              defaultProp: {
                type: 'string',
              },
            },
          },
          includeRootOutputs: true,
          alternativeOutputs: {
            keyPath: ['statusCode'],
            schemas: {
              200: {
                type: 'object',
                properties: {
                  altSuccessProp: {
                    type: 'string',
                  },
                },
              },
            },
            defaultSchema: {
              type: 'object',
              properties: {
                altDefaultProp: {
                  type: 'string',
                },
              },
            },
          },
        },
      });

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ false, /* expandArrayOutputsDepth */ 1);

      expect(Object.keys(outputParameters).length).toBe(1);
      expect(outputParameters['outputs.$.defaultProp']).toBeDefined();
    });

    it('should parse primitive outputs which are children of arrays correctly', () => {
      const parser = new ManifestParser(getEmails);

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      const toParameter = getOutputByName(outputParameters, 'To');

      expect(toParameter?.title).toBe('To');
      expect(toParameter?.visibility).toBe(SwaggerConstants.Visibility.Important);
      expect(toParameter?.key).toBe('outputs.$.body.[*].To');
      expect(toParameter?.isInsideArray).toBeTruthy();
      expect(toParameter?.type).toBe(SwaggerConstants.Types.String);
      expect(toParameter?.description).toBe('The recipients for the message');
    });

    it('should tell when an output is advanced', () => {
      const parser = new ManifestParser(getEmails);

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      const attachmentsParameter = getOutputByName(outputParameters, 'attachments');

      expect(attachmentsParameter?.visibility).toBe(SwaggerConstants.Visibility.Advanced);
    });

    it('should consider descendents of advanced parameters advanced', () => {
      const parser = new ManifestParser(getEmails);

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      const attachmentsParameter = getOutputByName(outputParameters, 'contentBytes');

      expect(attachmentsParameter?.visibility).toBe(SwaggerConstants.Visibility.Advanced);
    });

    it('should parse array outputs', () => {
      const parser = new ManifestParser(getEmails);

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      const attachmentsParameter = getOutputByName(outputParameters, 'attachments');

      expect(attachmentsParameter?.type).toBe(SwaggerConstants.Types.Array);
      expect(attachmentsParameter?.itemSchema).toBeDefined();
    });

    it('should determine the parent array', () => {
      const parser = new ManifestParser(onNewEmail);

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      const fromParameter = getOutputByName(outputParameters, 'From');
      expect(fromParameter?.parentArray).toBe('body/value');

      const valueParameter = getOutputByName(outputParameters, 'body/value');
      expect(valueParameter?.parentArray).toBeFalsy();

      const contentBytesParameter = getOutputByName(outputParameters, 'ContentBytes');
      expect(contentBytesParameter?.parentArray).toBe('Attachments');
    });

    it('should pass through dynamic schema', () => {
      const parser = new ManifestParser(createItem);

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      expect(outputParameters['outputs.$.body'].dynamicSchema?.type).toBe(DynamicSchemaType.DynamicProperties);
      expect(outputParameters['outputs.$.body'].dynamicSchema?.extension).toEqual({
        operationId: 'GetTable',
        itemValuePath: 'Schema/Items',
        parameters: {
          dataset: {
            parameterReference: 'dataset',
          },
          table: {
            parameterReference: 'table',
          },
        },
      });
    });

    it('should update dynamic extension parameters to reference aliases', () => {
      const parser = new ManifestParser(createItem);

      const allOutputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      const bodyParameter = allOutputParameters['outputs.$.body'];

      expect(bodyParameter.dynamicSchema?.extension.parameters['dataset'].parameterReference).toBe('dataset');
      expect(bodyParameter.dynamicSchema?.extension.parameters['table'].parameterReference).toBe('table');
    });

    it('should set title for primitive array children', () => {
      const parser = new ManifestParser(onNewEmail);

      const allOutputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      const interestItemParameter = allOutputParameters['outputs.$.body.body/value.[*].body/value/interests.[*]'];

      expect(interestItemParameter.title).toBe('Interests Item');
    });

    it('should not surface internal outputs', () => {
      const parser = new ManifestParser(onNewEmail);

      const outputParameters = parser.getOutputParameters(/* includeParentObject */ true, /* expandArrayOutputsDepth */ 1);

      expect(outputParameters).toBeDefined();

      for (const outputParameterKey of Object.keys(outputParameters)) {
        const output = outputParameters[outputParameterKey];

        expect(output.alias).not.toBe('Importance');
      }
    });
  });

  function getInputByName(inputParameters: Record<string, InputParameter>, inputName: string): InputParameter | null {
    for (const inputParameterKey of Object.keys(inputParameters)) {
      const inputParameter = inputParameters[inputParameterKey];

      if (equals(inputParameter.name, inputName, true)) {
        return inputParameter;
      }
    }

    return null;
  }

  function getOutputByName(outputParameters: Record<string, OutputParameter>, outputName: string): OutputParameter | null {
    for (const outputParameterKey of Object.keys(outputParameters)) {
      const outputParameter = outputParameters[outputParameterKey];

      if (equals(outputParameter.name, outputName, true)) {
        return outputParameter;
      }
    }

    return null;
  }
});
