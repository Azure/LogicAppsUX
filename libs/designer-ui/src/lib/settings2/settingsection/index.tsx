export interface SettingSectionComponentProps {
  id: string;
  title: string;
  renderContent: any;
  isInverted: boolean;
  [name: string]: any;
}

export interface SettingSectionTextFieldProps {
  value: string;
}
