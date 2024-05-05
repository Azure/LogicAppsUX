export interface ValueProps {
  displayName: string;
  format?: string;
  language?: string;
  value: any;
  visible?: boolean;
  // only used when format is 'date-time'
  utcDateTime?: string;
}

export interface Xml {
  '$content-type': string;
  $content: string;
}
