import type { DiscoveryOpArray } from './operationDiscoveryResults';

export interface UiInteractionData {
  graphId?: string;
  parentId?: string;
  childId?: string;
  nodeId?: string;
  preloadedOperations?: DiscoveryOpArray;
  dispatch?: any;
}
