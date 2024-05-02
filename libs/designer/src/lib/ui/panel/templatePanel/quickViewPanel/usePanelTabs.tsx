import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { overviewTab } from './tabs/overviewTab';
import { workflowTab } from './tabs/workflowTab';

export const usePanelTabs = () => {
  const intl = useIntl();

  const overviewTabItem = useMemo(
    () => ({
      ...overviewTab(intl),
    }),
    [intl]
  );

  const workflowTabItem = useMemo(
    () => ({
      ...workflowTab(intl),
    }),
    [intl]
  );

  const tabs = useMemo(() => {
    return [overviewTabItem, workflowTabItem]
      .slice()
      .filter((a) => a.visible)
      .sort((a, b) => a.order - b.order);
  }, [overviewTabItem, workflowTabItem]);

  return tabs;
};
