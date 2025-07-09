import type { TemplatePanelFooterProps } from '../templates/templatesPanelFooter';

export interface McpPanelTabProps {
  id: string;
  title: string;
  onTabClick?: () => void;
  disabled?: boolean;
  content: React.ReactElement;
  footerContent: TemplatePanelFooterProps;
}

export interface McpConnectorPanelProps {
  isTabDisabled?: boolean;
  isPrimaryButtonDisabled: boolean;
  isPreviousButtonDisabled: boolean;
  onAddConnector?: () => void;
}
