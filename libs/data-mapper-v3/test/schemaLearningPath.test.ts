import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadLearningPathMap } from './e2etests/fixtures/learningPath';
import { LinkEndpointType } from '../src/model/mapModel';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { linkSchemaPath, normalizeSingleSourcePath, SchemaPathResolver } from '../src/schema/schemaPathResolver';

const compatibleMaps = [
  'Basics-principles-of-Maps\\HowMapsWorks\\Maps\\BasicsOfMaps.btm',
  'Basics-principles-of-Maps\\HowMapsWorks\\Maps\\HowMapsWorks.btm',
  'Content-Enricher-Pattern\\JoinMultipleMessages\\1-TryingFunctoids\\TransformUsingFunctoids.btm',
  'Content-Enricher-Pattern\\JoinMultipleMessages\\2-UsingFunctoidsandCSharp\\TransformUsingFunctoids2Approach.btm',
  'Content-Enricher-Pattern\\JoinMultipleMessages\\3-UsingXSLTTemplate\\TransformUserAndAddressToOutput.btm',
  'Grouping-Pattern-Group-elements-from-different-messages-BizTalk-Maps\\JoinMultipleMessages\\Transform_User_and_Addresses_In_Output.btm',
  'Ignore-Namespaces-for-Links-property\\IgnoreNamespacesForLinks\\IgnoreNamespacesForLinks.btm',
  'Looping-Pattern\\LoopingPattern\\LoopValueMappingFlatteningFunctoid\\LoppingFlatMap.btm',
  'Looping-Pattern\\LoopingPattern\\LoopValueMappingFunctoid\\LoopingMap.btm',
  'Looping-Pattern\\LoopingPattern\\X1EDISample\\Maps\\Enrollment_to_5010_834.btm',
];

describe('Learning Path schema compatibility', () => {
  test.each(compatibleMaps)('resolves every schema endpoint in %s', async (relativePath) => {
    const payload = await loadLearningPathMap(path.join(...relativePath.split('\\')));
    const unresolved: string[] = [];
    for (const side of ['source', 'target'] as const) {
      const resolver = new SchemaPathResolver(payload[`${side}Schema`] ?? undefined, payload.map.options?.ignoreNamespacesForLinks);
      for (const link of payload.map.pages.flatMap((page) => page.links)) {
        if (link[`${side}Type`] === LinkEndpointType.SchemaNode) {
          const endpoint = linkSchemaPath(link, side);
          if (!resolver.resolve(endpoint)) {
            unresolved.push(`${side}: ${endpoint}`);
          }
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  test.each(['UsingFunctoid\\OrderToSAPOrderAccessOrcVarFunctoids.btm', 'UsingHelperClass\\OrderToSAPOrderAccOrcVarHC.btm'])(
    'rebases obsolete single-source aliases without inventing an orchestration envelope for %s',
    async (relativePath) => {
      const payload = await loadLearningPathMap(
        path.join('How-to-Access-Orchestration-Variables-from-Maps', 'HowToSendOrchestrationVariablesIntoMaps', ...relativePath.split('\\'))
      );
      expect(payload.sourceSchema?.rootElement.name).toBe('Order');
      const resolver = new SchemaPathResolver(payload.sourceSchema ?? undefined, payload.map.options?.ignoreNamespacesForLinks);
      const envelopeLinks = payload.map.pages
        .flatMap((page) => page.links)
        .filter((link) => link.sourceType === LinkEndpointType.SchemaNode);
      expect(envelopeLinks).toHaveLength(7);
      for (const link of envelopeLinks) {
        expect(link.sourcePath).toMatch(/^\/Order\//);
        expect(link.sourceBtmPath).toContain("local-name()='InputMessagePart_0'");
        expect(resolver.resolve(normalizeSingleSourcePath(linkSchemaPath(link, 'source'), 'Order'))).toBeDefined();
      }
      const serializer = new BtmSerializer();
      const reopened = serializer.deserialize(serializer.serialize(payload.map));
      expect(
        reopened.pages
          .flatMap((page) => page.links)
          .filter((link) => link.sourceType === LinkEndpointType.SchemaNode)
          .map((link) => link.sourceBtmPath)
      ).toEqual(envelopeLinks.map((link) => link.sourceBtmPath));
    }
  );
});
