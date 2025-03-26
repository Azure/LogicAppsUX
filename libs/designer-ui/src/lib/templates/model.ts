import type { TemplatePanelFooterProps } from './templatesPanelFooter';
import type { ReactNode } from 'react';

export interface TemplateTabProps {
  id: string;
  title: string;
  description?: string | ReactNode;
  hasError?: boolean;
  disabled?: boolean;
  content: React.ReactElement;
  footerContent: TemplatePanelFooterProps;
}
