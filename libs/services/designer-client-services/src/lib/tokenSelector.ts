import type { ValueSegment } from '@microsoft/designer-ui';

export type TrackedProperty = {
  name: string;
  type: string;
  values?: ValueSegment[];
};

export interface TokenSelectorViewProps {
  trackedProperties: TrackedProperty[];
  onCompleted: (properties: TrackedProperty[], selectedNodeId: string, businessID: string) => void;
  businessID?: string;
}
