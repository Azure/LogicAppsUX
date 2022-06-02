import { IfWithChildrenAndValueMapDefinitionMock } from './__mocks__';
import type { JsonInputStyle } from './types';
import yaml from 'js-yaml';

export async function mapDefinitionToJson1(inputMapDefinition: string): Promise<string> {
  try {
    const parsedYaml: any = yaml.load(IfWithChildrenAndValueMapDefinitionMock);
    const pyaml: JsonInputStyle = parsedYaml as JsonInputStyle;
    console.log(parsedYaml.sourceSchema);
  } catch (e) {
    console.log(e);
  }
  return '';
}
