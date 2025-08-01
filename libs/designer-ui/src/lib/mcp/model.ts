import type { TemplatePanelFooterProps } from '../templates/templatesPanelFooter';

export interface McpPanelTabProps {
  id: string;
  title: string;
  onTabClick?: () => void;
  disabled?: boolean;
  tabStatusIcon?: 'error';
  content: React.ReactElement;
  footerContent: TemplatePanelFooterProps;
}

export interface McpConnectorTabProps {
  isTabDisabled?: boolean;
  isPrimaryButtonDisabled: boolean;
  isPreviousButtonDisabled: boolean;
  onAddConnector?: () => void;
}
