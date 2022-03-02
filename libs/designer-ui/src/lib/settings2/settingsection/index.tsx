export interface SettingSectionComponentProps extends Record<string, any> {
  id: string;
  title: string;
  expanded: boolean;
  renderContent: React.FC<any>;
  isInverted: boolean;
  isReadOnly: boolean;
}
