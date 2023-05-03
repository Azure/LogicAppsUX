export type TrackedProperty = {
  name: string;
  type: string;
  tokens?: any;
};

export interface TokenSelectorViewProps {
  trackedProperties: TrackedProperty[];
  onCompleted: (properties: TrackedProperty[], selectedNodeId: string, businessID: string) => void;
  businessID?: string;
}
