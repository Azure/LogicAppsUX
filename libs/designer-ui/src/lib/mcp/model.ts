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
  onTabClick?: () => void;
  isPrimaryButtonDisabled: boolean;
  onPrimaryButtonClick?: () => void;
  isPrimaryButtonLoading?: boolean;
  previousTabId?: string;
}

export interface McpCreateAppTabProps extends McpConnectorTabProps {
  tabStatusIcon?: 'error';
  isSecondaryButtonDisabled?: boolean;
}
