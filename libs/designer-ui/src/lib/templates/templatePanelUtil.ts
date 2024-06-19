import type { IntlShape } from 'react-intl';
import type { TemplatePanelFooterProps } from './templatesPanelFooter';

export type TemplatePanelTabFn = (intl: IntlShape) => TemplatePanelTab;
export interface TemplatePanelTab {
  id: string;
  title: string;
  description?: string;
  visible?: boolean;
  order: number;
  content: React.ReactElement;
  footerContent: TemplatePanelFooterProps;
}
