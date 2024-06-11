import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { connectionsTab } from './tabs/connectionsTab';
import { parametersTab } from './tabs/parametersTab';
import { nameStateTab } from './tabs/nameStateTab';
import { reviewCreateTab } from './tabs/reviewCreateTab';

export const usePanelTabs = (
  // onCreateClick: () => Promise<void>
) => {
  const intl = useIntl();

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

  // const reviewCreateTabItem = useMemo(
  //   () => ({
  //     ...reviewCreateTab(intl, onCreateClick),
  //   }),
  //   [intl, onCreateClick]
  // );
  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl),
    }),
    [intl]
  );

  return [connectionsTabItem, parametersTabItem, nameStateTabItem, reviewCreateTabItem];
};
