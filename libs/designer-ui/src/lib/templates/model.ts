import type { TemplatePanelFooterProps } from './templatesPanelFooter';
import type { ReactNode } from 'react';

export type TemplateTabStatusType = 'error' | 'success' | 'in-progress' | undefined;

export interface TemplateTabProps {
  id: string;
  title: string;
  onTabClick?: () => void;
  description?: string | ReactNode;
  tabStatusIcon?: TemplateTabStatusType;
  disabled?: boolean;
  content: React.ReactElement;
  footerContent: TemplatePanelFooterProps;
}
