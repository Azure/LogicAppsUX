
import type { DiscoveryOpArray } from "./operationDiscoveryResults";

export interface UiInteractionData{
    graphId: string,
    parentId?: string,
    childId?: string,
    preloadedOperations?: DiscoveryOpArray,
    dispatch?: any
}