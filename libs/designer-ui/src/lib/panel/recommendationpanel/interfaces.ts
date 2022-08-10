export interface OperationActionData {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  category: 'Built-in' | 'Azure' | '';
  connectorName?: string;
  brandColor?: string;
  iconUri?: string;
}
