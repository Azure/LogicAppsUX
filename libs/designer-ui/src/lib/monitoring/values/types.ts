export interface ValueProps {
  displayName: string;
  format?: string;
  language?: string;
  value: any;
  visible?: boolean;
  // only used when format is 'date-time'
  utcProps?: UTCDateTimeProps;
}
export interface UTCDateTimeProps {
  toggleUTC: React.Dispatch<React.SetStateAction<boolean>>;
  showUTC: boolean;
}

export interface Xml {
  '$content-type': string;
  $content: string;
}
