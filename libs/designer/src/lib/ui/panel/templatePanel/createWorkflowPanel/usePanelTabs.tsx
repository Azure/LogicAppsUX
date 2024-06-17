import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { connectionsTab } from './tabs/connectionsTab';
import { parametersTab } from './tabs/parametersTab';
import { nameStateTab } from './tabs/nameStateTab';
import { reviewCreateTab } from './tabs/reviewCreateTab';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';

export const usePanelTabs = (onCreateClick: () => Promise<void>) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { parameters } = useSelector((state: RootState) => state.template);

  const connectionsTabItem = useMemo(
    () => ({
      ...connectionsTab(intl, dispatch),
    }),
    [intl, dispatch]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl, dispatch),
    }),
    [intl, dispatch]
  );

  const nameStateTabItem = useMemo(
    () => ({
      ...nameStateTab(intl, dispatch),
    }),
    [intl, dispatch]
  );

  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl, dispatch, onCreateClick),
    }),
    [intl, dispatch, onCreateClick]
  );

  const tabs = useMemo(() => {
    if (!parameters) {
      return [connectionsTabItem, nameStateTabItem, reviewCreateTabItem];
    }
    return [connectionsTabItem, parametersTabItem, nameStateTabItem, reviewCreateTabItem];
  }, [parameters, connectionsTabItem, parametersTabItem, nameStateTabItem, reviewCreateTabItem]);

  return tabs;
};
