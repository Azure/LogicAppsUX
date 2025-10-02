import { Text, Drawer, DrawerBody, TabList, Tab, Button, mergeClasses } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import type { AppDispatch } from '../../../core';
import { clearPanel, useOperationPanelSelectedNodeId } from '../../../core';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { useRunLogPanelStyles } from './RunLogPanel.styles';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorSection } from '@microsoft/designer-ui';
import { idDisplayCase, RunService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { getMonitoringTabError } from '../../../common/utilities/error';
import { initializeInputsOutputsBinding } from '../../../core/actions/bjsworkflow/monitoring';
import { useRunData } from '../../../core/state/workflow/workflowSelectors';
import { useDispatch } from 'react-redux';
import { SettingsPanel } from '../../../ui/settings';
import { InputValues } from './tabs/inputValues';
import { PropertyValues } from './tabs/propertyValues';
import { OutputValues } from './tabs/outputValues';

import { bundleIcon, DismissFilled, DismissRegular } from '@fluentui/react-icons';

const DismissIcon = bundleIcon(DismissFilled, DismissRegular);

export interface RunLogPanelProps {
  collapsed?: boolean;
}

export const RunLogPanel = (props: RunLogPanelProps) => {
  const intl = useIntl();

  const styles = useRunLogPanelStyles();

  const selectedNodeId = useOperationPanelSelectedNodeId();
  const { iconUri } = useOperationVisuals(selectedNodeId ?? '');

  // MARK: Run data

  const runMetaData = useRunData(selectedNodeId);
  const dispatch = useDispatch<AppDispatch>();
  const { status: statusRun, error: errorRun, code: codeRun } = runMetaData ?? {};
  const error = getMonitoringTabError(errorRun, statusRun, codeRun);

  const getActionInputsOutputs = useCallback(() => {
    return RunService().getActionLinks(runMetaData, selectedNodeId);
  }, [selectedNodeId, runMetaData]);

  const {
    data: inputOutputs,
    error: ioError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery<any>(['actionInputsOutputs', { nodeId: selectedNodeId }], getActionInputsOutputs, {
    refetchOnWindowFocus: false,
    initialData: { inputs: {}, outputs: {} },
  });

  useEffect(() => {
    refetch();
  }, [runMetaData, refetch]);

  useEffect(() => {
    if (!isLoading) {
      dispatch(initializeInputsOutputsBinding({ nodeId: selectedNodeId, inputsOutputs: inputOutputs }));
    }
  }, [dispatch, inputOutputs, selectedNodeId, isLoading]);

  // MARK: INTL

  const inputTabText = intl.formatMessage({
    defaultMessage: 'Inputs',
    description: 'Tab label for inputs',
    id: 'S+efhe',
  });

  const outputTabText = intl.formatMessage({
    defaultMessage: 'Outputs',
    description: 'Tab label for outputs',
    id: '6MpYrr',
  });

  const propertiesTabText = intl.formatMessage({
    defaultMessage: 'Properties',
    description: 'Tab label for properties',
    id: 'cYfnk4',
  });

  const settingsTabText = intl.formatMessage({
    defaultMessage: 'Settings',
    description: 'Tab label for settings',
    id: '5IMy1t',
  });

  // MARK: Drawer resize width logic

  const animationFrame = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(520);

  const startResizingWidth = useCallback(() => setIsResizingWidth(true), []);
  const stopResizingWidth = useCallback(() => setIsResizingWidth(false), []);

  const resize = useCallback(
    ({ clientX }: { clientX: number }) => {
      animationFrame.current = requestAnimationFrame(() => {
        if (isResizingWidth && sidebarRef.current) {
          const newSidebarWidth = sidebarRef.current.getBoundingClientRect().right - clientX;
          if (newSidebarWidth < 240) {
            setSidebarWidth(240);
            return;
          }
          setSidebarWidth(newSidebarWidth);
        }
      });
    },
    [isResizingWidth]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizingWidth);

    return () => {
      cancelAnimationFrame(animationFrame.current);
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizingWidth);
    };
  }, [resize, stopResizingWidth]);

  // MARK: Rendering

  const [selectedTab, setSelectedTab] = useState<'inputs' | 'outputs' | 'properties' | 'settings'>('inputs');

  return (
    <Drawer
      ref={sidebarRef}
      open={!props.collapsed}
      type={'inline'}
      separator
      position="end"
      className={styles.drawer}
      style={{ width: `${sidebarWidth}px` }}
    >
      <Button
        className={mergeClasses(styles.resizer, styles.resizerVertical, isResizingWidth && styles.resizerActive)}
        onMouseDown={startResizingWidth}
        aria-label="Resize drawer"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={sidebarWidth * 0.01}
        aria-valuemin={240 * 0.01}
        aria-valuemax={100}
      />
      <DrawerBody className={styles.drawerBody}>
        <div className={styles.nodeDetailsContainer}>
          <div className={styles.nodeDetailsHeading}>
            <div className={styles.nodeDetailsTitle}>
              <img src={iconUri} alt="" className={styles.actionIcon} />
              <Text className={styles.actionName}>{idDisplayCase(selectedNodeId)}</Text>
              <Button appearance="subtle" onClick={() => dispatch(clearPanel())} icon={<DismissIcon />} />
            </div>
            <ErrorSection error={error} />
            <TabList selectedValue={selectedTab} onTabSelect={(_, data) => setSelectedTab(data.value as any)}>
              <Tab value={'inputs'}>{inputTabText}</Tab>
              <Tab value={'outputs'}>{outputTabText}</Tab>
              <Tab value={'properties'}>{propertiesTabText}</Tab>
              <Tab value={'settings'}>{settingsTabText}</Tab>
            </TabList>
          </div>
          <div className={styles.nodeDetailsContent}>
            {selectedTab === 'inputs' && (
              <InputValues runMetaData={runMetaData} isLoading={isFetching || isLoading} error={ioError} nodeId={selectedNodeId} />
            )}
            {selectedTab === 'outputs' && (
              <OutputValues runMetaData={runMetaData} isLoading={isFetching || isLoading} error={ioError} nodeId={selectedNodeId} />
            )}
            {selectedTab === 'properties' && <PropertyValues properties={runMetaData} />}
            {selectedTab === 'settings' && <SettingsPanel nodeId={selectedNodeId} />}
          </div>
        </div>
      </DrawerBody>
    </Drawer>
  );
};
