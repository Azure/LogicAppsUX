import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { connectionsTab } from './tabs/connectionsTab';
import { parametersTab } from './tabs/parametersTab';
import { nameStateTab } from './tabs/nameStateTab';
import { reviewCreateTab } from './tabs/reviewCreateTab';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../core/state/templates/store';

export const usePanelTabs = (onCreateClick: () => Promise<void>) => {
  const intl = useIntl();
  const { parameters } = useSelector((state: RootState) => state.template);

  const connectionsTabItem = useMemo(
    () => ({
      ...connectionsTab(intl),
    }),
    [intl]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl),
    }),
    [intl]
  );

  const nameStateTabItem = useMemo(
    () => ({
      ...nameStateTab(intl),
    }),
    [intl]
  );

  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl, onCreateClick),
    }),
    [intl, onCreateClick]
  );

  const tabs = useMemo(() => {
    if (!parameters) {
      return [connectionsTabItem, nameStateTabItem, reviewCreateTabItem];
    }
    return [connectionsTabItem, parametersTabItem, nameStateTabItem, reviewCreateTabItem];
  }, [parameters, connectionsTabItem, parametersTabItem, nameStateTabItem, reviewCreateTabItem]);

  return tabs;
};
