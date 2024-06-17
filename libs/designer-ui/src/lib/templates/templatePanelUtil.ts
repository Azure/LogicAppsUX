import type { IntlShape } from 'react-intl';

export type TemplatePanelTabFn = (intl: IntlShape) => TemplatePanelTab;
export interface TemplatePanelTab {
  id: string;
  title: string;
  description?: string;
  visible?: boolean;
  order: number;
  content: React.ReactElement;
}
