import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { overviewTab } from './tabs/overviewTab';
import { workflowTab } from './tabs/workflowTab';
import type { AppDispatch } from '../../../../core/state/templates/store';
import { useDispatch } from 'react-redux';
import type { TemplatePanelTab } from '@microsoft/designer-ui';

export const useQuickViewPanelTabs = (): TemplatePanelTab[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const overviewTabItem = useMemo(
    () => ({
      ...overviewTab(intl, dispatch),
    }),
    [intl, dispatch]
  );

  const workflowTabItem = useMemo(
    () => ({
      ...workflowTab(intl, dispatch),
    }),
    [intl, dispatch]
  );

  return [overviewTabItem, workflowTabItem];
};
