export interface ValueProps {
  displayName: string;
  format?: string;
  language?: string;
  value: any;
  visible?: boolean;
}

export interface Xml {
  '$content-type': string;
  $content: string;
}
