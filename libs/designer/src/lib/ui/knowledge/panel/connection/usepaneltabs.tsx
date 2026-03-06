import { useMemo, useCallback } from 'react';
import type { AppDispatch } from '../../../../core/state/knowledge/store';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import type { TemplatePanelFooterProps } from '@microsoft/designer-ui';
import constants from '../../../../common/constants';
import { basicsTab } from './tabs/basics';
import { modelTab } from './tabs/model';
import { selectPanelTab } from '../../../../core/state/mcp/panel/mcpPanelSlice';

export interface TabProps {
  id: string;
  title: string;
  onTabClick?: () => void;
  disabled?: boolean;
  tabStatusIcon?: 'error';
  content: React.ReactElement;
  footerContent: TemplatePanelFooterProps;
}

export const useCreateConnectionPanelTabs = (): TabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const handleMoveToModel = useCallback(() => {
    dispatch(selectPanelTab(constants.KNOWLEDGE_PANEL_TAB_NAMES.MODEL));
  }, [dispatch]);

  const handleCreate = useCallback(async () => {
    // Handle create action here, e.g. call an API or update state
  }, []);
  const basicsTabItem = useMemo(
    () =>
      basicsTab(intl, dispatch, {
        isTabDisabled: false,
        isPrimaryButtonDisabled: false,
        onPrimaryButtonClick: handleMoveToModel,
      }),
    [intl, dispatch, handleMoveToModel]
  );

  const modelTabItem = useMemo(
    () =>
      modelTab(intl, dispatch, {
        isTabDisabled: false,
        isPrimaryButtonDisabled: false,
        onPrimaryButtonClick: handleCreate,
      }),
    [intl, dispatch, handleCreate]
  );

  return useMemo(() => [basicsTabItem, modelTabItem], [basicsTabItem, modelTabItem]);
};
