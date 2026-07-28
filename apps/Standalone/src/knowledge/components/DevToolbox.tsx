import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AzureStandardLogicAppSelector } from '../../designer/app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureStandardLogicAppSelector';
import { environment } from '../../environments/environment';
import { SharedDevToolbox } from '../../shared/components/DevToolbox/SharedDevToolbox';
import type { AppDispatch, RootState } from '../state/Store';
import { setToolboxOpen, workflowLoaderSlice } from '../state/WorkflowLoader';
import { useDevToolboxStyles } from './styles';

export const DevToolbox = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { theme, toolboxOpen: isToolboxOpen } = useSelector((state: RootState) => state.workflowLoader);
  const styles = useDevToolboxStyles();

  const isLightMode = theme === ThemeType.Light;

  const handleThemeToggle = useCallback(
    (checked: boolean) => dispatch(workflowLoaderSlice.actions.changeTheme(checked ? ThemeType.Dark : ThemeType.Light)),
    [dispatch]
  );
  const handleToolboxToggle = useCallback((open: boolean) => dispatch(setToolboxOpen(open)), [dispatch]);

  return (
    <SharedDevToolbox
      styles={styles}
      isLightMode={isLightMode}
      isToolboxOpen={Boolean(isToolboxOpen)}
      hasArmToken={!!environment.armToken}
      onThemeToggle={handleThemeToggle}
      onToolboxToggle={handleToolboxToggle}
      headerTextSize={400}
      darkModeTextSize={300}
      panelBodyClassName={styles.mainContainer}
      panelExtra={<AzureStandardLogicAppSelector hideWorkflowSelection={true} />}
    />
  );
};
