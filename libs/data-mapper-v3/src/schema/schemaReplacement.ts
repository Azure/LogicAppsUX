import { LinkEndpointType, type MapDocument, ParameterType, type SchemaReference } from '../model/mapModel';
import type { SchemaTree } from '../model/schemaModel';
import { SchemaPathResolver, linkSchemaPath } from './schemaPathResolver';
import type { SchemaSide } from '../protocol/mapEditorProtocol';

/** Reconcile only the replaced endpoint; link IDs are scoped to their page. */
export function replaceSchema(map: MapDocument, side: SchemaSide, schema: SchemaTree, reference: SchemaReference) {
  const paths = new SchemaPathResolver(schema, map.options.ignoreNamespacesForLinks);
  let removedLinkCount = 0;
  const pages = map.pages.map((page) => {
    const removed = new Set(
      page.links
        .filter((link) => {
          const type = side === 'source' ? link.sourceType : link.targetType;
          const endpoint = linkSchemaPath(link, side);
          return type === LinkEndpointType.SchemaNode && !paths.resolve(endpoint);
        })
        .map((link) => link.id)
    );
    removedLinkCount += removed.size;
    if (!removed.size) {
      return page;
    }
    return {
      ...page,
      links: page.links.filter((link) => !removed.has(link.id)),
      functoids: page.functoids.map((functoid) => {
        if (
          !functoid.inputLinks.some((id) => removed.has(id)) &&
          !functoid.outputLinks.some((id) => removed.has(id)) &&
          !functoid.parameters.some((parameter) => parameter.type === ParameterType.Link && removed.has(parameter.value))
        ) {
          return functoid;
        }
        const parameters = functoid.parameters.filter(
          (parameter) => parameter.type !== ParameterType.Link || !removed.has(parameter.value)
        );
        return {
          ...functoid,
          inputLinks: functoid.inputLinks.filter((id) => !removed.has(id)),
          outputLinks: functoid.outputLinks.filter((id) => !removed.has(id)),
          parameters:
            parameters.length === functoid.parameters.length
              ? functoid.parameters
              : parameters.map((parameter, index) => ({ ...parameter, index })),
        };
      }),
    };
  });
  return {
    map: { ...map, [`${side}Schema`]: reference, pages } as MapDocument,
    removedLinkCount,
  };
}
