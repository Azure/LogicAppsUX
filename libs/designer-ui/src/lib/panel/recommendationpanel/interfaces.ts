export interface OperationActionData {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  category?: string;
  connectorName?: string;
  brandColor?: string;
  iconUri?: string;
  isTrigger: boolean;
}
