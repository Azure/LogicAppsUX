export type TrackedProperty = {
  name: string;
  type: string;
  token?: string;
};

export interface TokenSelectorViewProps {
  trackedProperties: TrackedProperty[];
  onCompleted: (properties: TrackedProperty[]) => void;
}
