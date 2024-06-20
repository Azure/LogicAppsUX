import type { IntlShape } from 'react-intl';
import type { ReactNode } from 'react';

export type TemplatePanelTabFn = (intl: IntlShape) => TemplatePanelTab;
export interface TemplatePanelTab {
  id: string;
  title: string;
  description?: string;
  visible?: boolean;
  order: number;
  content: React.ReactElement;
  footerContent: {
    primaryButtonText: string | ReactNode;
    primaryButtonOnClick: () => void | Promise<void>;
    primaryButtonDisabled?: boolean;
  };
}
