import { readdirSync } from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { FunctoidRegistry } from '../../src/functoids/functoidRegistry';
import { readTextFileSync } from '../../src/schema/schemaFileResolver';
import { loadSampleMap } from './testData';

const directory = path.resolve(__dirname, '../samples/LearningPath');
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  trimValues: false,
  isArray: (name) => ['Page', 'Link', 'Functoid'].includes(name),
});

interface OriginalLink {
  LinkID: string;
  LinkFrom: string;
  LinkTo: string;
}

interface OriginalFunctoid {
  FunctoidID: string;
  'Functoid-FID': string;
}

export interface OriginalPage {
  Name: string;
  Links?: { Link?: OriginalLink[] };
  Functoids?: { Functoid?: OriginalFunctoid[] };
}

function mapFiles(directoryPath: string): string[] {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directoryPath, entry.name);
    return entry.isDirectory() ? mapFiles(fullPath) : entry.name.endsWith('.btm') ? [path.relative(directory, fullPath)] : [];
  });
}

export const learningPathMaps = mapFiles(directory).sort();

export function originalPages(relativePath: string): OriginalPage[] {
  const content = readTextFileSync(path.join(directory, relativePath));
  if (!content) {
    throw new Error(`Missing learning-path fixture: ${relativePath}`);
  }
  const document: { mapsource: { Pages?: { Page?: OriginalPage[] } } } = parser.parse(content);
  return document.mapsource.Pages?.Page ?? [];
}

export async function loadLearningPathMap(relativePath: string, serializedContent?: string) {
  const payload = await loadSampleMap(path.join('LearningPath', relativePath), serializedContent);
  return {
    ...payload,
    functoids: FunctoidRegistry.getInstance()
      .getAllFunctoids()
      .map(({ id, name, category, description, minInputs, maxInputs, hasOutput, tooltip }) => ({
        id,
        name,
        category,
        description,
        minInputs,
        maxInputs,
        hasOutput,
        tooltip,
      })),
    availableSchemas: [payload.map.sourceSchema.location, payload.map.targetSchema.location].filter(Boolean),
  };
}

export const behaviorMaps = {
  direct: path.join(
    'Automatically-Link-Record-Elements-By-Structure-Name-or-Mass-Copy',
    'BizTalkMapperSemanticTranslatorPattern',
    'LinkByName',
    'MapByName.btm'
  ),
  filter: path.join(
    'Content-Filter-Pattern-Data-Cleaning-Pattern',
    'BizTalkMapperContentFilterPattern',
    'NormalizeAndRemoveUnnecessaryData',
    'mapNormalizeAndRemoveUnnecessaryData.btm'
  ),
  defaults: path.join(
    'GenerateDefaultFixedNodes-attribute-of-the-mapsource-element',
    'GenerateDefaultFixedNodes',
    'GenerateDefaultFixedNodesYes.btm'
  ),
  conditions: path.join('Conditional-Pattern', 'WorkingWithConditions', '03-IfThenElse', 'IfThenElseMap.btm'),
  loop: path.join('Looping-Pattern', 'LoopingPattern', '01-LoppingTypes', '01-OneToOne', 'OneToOneMapReadable.btm'),
  sort: path.join('Sorting-Pattern', 'BizTalkMapperSortingPattern', 'SortElementsDemoByNumber', 'SortElementsByNumber.btm'),
} as const;
