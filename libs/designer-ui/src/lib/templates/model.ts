import type { TemplatePanelFooterProps } from './templatesPanelFooter';
import type { ReactNode } from 'react';

export interface TemplateTabProps {
  id: string;
  title: string;
  description?: string | ReactNode;
  tabStatusIcon?: 'error' | 'success' | 'in-progress' | undefined;
  disabled?: boolean;
  content: React.ReactElement;
  footerContent: TemplatePanelFooterProps;
}
