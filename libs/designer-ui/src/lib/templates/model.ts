import type { IntlShape } from 'react-intl';
import type { TemplatePanelFooterProps } from './templatesPanelFooter';
import type { ReactNode } from 'react';

export type TemplatePanelTabFn = (intl: IntlShape) => TemplatePanelTab;
export interface TemplatePanelTab {
  id: string;
  title: string;
  description?: string | ReactNode;
  hasError?: boolean;
  content: React.ReactElement;
  footerContent: TemplatePanelFooterProps;
}
