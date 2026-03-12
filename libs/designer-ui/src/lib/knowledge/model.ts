import type { TemplatePanelFooterProps } from '../templates/templatesPanelFooter';

type OnTabNavigation = () => void;

export interface KnowledgeTabProps {
  id: string;
  title: string;
  onTabClick?: OnTabNavigation;
  onPrimaryButtonClick?: OnTabNavigation;
  isPrimaryButtonDisabled?: boolean;
  disabled?: boolean;
  tabStatusIcon?: 'error';
  content: React.ReactElement;
  footerContent: TemplatePanelFooterProps;
}

export interface KnowledgeConnectionTabProps {
  isTabDisabled?: boolean;
  onPrimaryButtonClick?: OnTabNavigation;
  isPrimaryButtonDisabled: boolean;
  tabStatusIcon?: 'error';
}
