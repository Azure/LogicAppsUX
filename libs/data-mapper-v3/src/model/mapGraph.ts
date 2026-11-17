import { LinkEndpointType, type MapDocument, type MapFunctoid, type MapPage, ParameterType } from './mapModel';

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}

export function reconcilePageFunctoidLinks(page: MapPage): void {
  for (const functoid of page.functoids) {
    const incomingLinks = page.links.filter((link) => link.targetType === LinkEndpointType.Functoid && link.targetId === functoid.id);
    const outgoingLinks = page.links.filter((link) => link.sourceType === LinkEndpointType.Functoid && link.sourceId === functoid.id);
    const incomingLinkIds = new Set(incomingLinks.map((link) => link.id));
    const previouslyConnectedLinkIds = new Set(functoid.inputLinks || []);
    const orderedIncomingLinkIds = uniqueValues([
      ...(functoid.parameters || [])
        .filter((parameter) => parameter.type === ParameterType.Link)
        .sort((left, right) => left.index - right.index)
        .map((parameter) => String(parameter.value)),
      ...(functoid.inputLinks || []),
      ...incomingLinks.map((link) => link.id),
    ]).filter((linkId) => incomingLinkIds.has(linkId));

    const usedLinkIds = new Set<string>();
    const seenLinkParameterIds = new Set<string>();
    const inputParameters = (functoid.parameters || [])
      .filter((parameter) => parameter.type === ParameterType.Link || parameter.type === ParameterType.Constant)
      .sort((left, right) => left.index - right.index)
      .filter((parameter) => {
        if (parameter.type === ParameterType.Constant) {
          return true;
        }
        const linkId = String(parameter.value);
        if (seenLinkParameterIds.has(linkId)) {
          return false;
        }
        seenLinkParameterIds.add(linkId);
        if (incomingLinkIds.has(linkId)) {
          usedLinkIds.add(linkId);
          return true;
        }
        return !previouslyConnectedLinkIds.has(linkId);
      });

    const occupiedIndices = new Set(inputParameters.map((parameter) => parameter.index));
    let nextInputIndex = 0;
    for (const linkId of orderedIncomingLinkIds) {
      if (!usedLinkIds.has(linkId)) {
        while (occupiedIndices.has(nextInputIndex)) {
          nextInputIndex++;
        }
        inputParameters.push({
          index: nextInputIndex,
          type: ParameterType.Link,
          value: linkId,
        });
        occupiedIndices.add(nextInputIndex);
        usedLinkIds.add(linkId);
      }
    }
    inputParameters.sort((left, right) => left.index - right.index);

    const nonInputParameters = (functoid.parameters || []).filter(
      (parameter) => parameter.type !== ParameterType.Link && parameter.type !== ParameterType.Constant
    );
    functoid.parameters = [...inputParameters.map((parameter, index) => ({ ...parameter, index })), ...nonInputParameters];
    functoid.inputLinks = inputParameters
      .filter((parameter) => parameter.type === ParameterType.Link && incomingLinkIds.has(String(parameter.value)))
      .map((parameter) => String(parameter.value));
    functoid.outputLinks = outgoingLinks.map((link) => link.id);
  }
}

export function reconcileMapFunctoidLinks(map: MapDocument): void {
  for (const page of map.pages) {
    reconcilePageFunctoidLinks(page);
  }
}

export function getConfiguredFunctoidInputCount(page: MapPage, functoid: MapFunctoid): number {
  const incomingLinkCount = page.links.filter(
    (link) => link.targetType === LinkEndpointType.Functoid && link.targetId === functoid.id
  ).length;
  const constantCount = functoid.parameters.filter((parameter) => parameter.type === ParameterType.Constant).length;
  return incomingLinkCount + constantCount;
}
