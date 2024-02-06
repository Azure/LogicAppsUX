import type { AppDispatch } from '../../core';
import { useIsDarkMode } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useCurrentPanelMode, useIsLoadingPanel, useIsPanelCollapsed } from '../../core/state/panel/panelSelectors';
import { clearPanel } from '../../core/state/panel/panelSlice';
import { AssertionsPanel } from './assertionsPanel/assertionsPanel';
import { ConnectionPanel } from './connectionsPanel/connectionsPanel';
import { ErrorsPanel } from './errorsPanel/errorsPanel';
import { NodeDetailsPanel } from './nodeDetailsPanel/nodeDetailsPanel';
import { NodeSearchPanel } from './nodeSearchPanel/nodeSearchPanel';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { WorkflowParametersPanel } from './workflowParametersPanel/workflowParametersPanel';
import { WorkflowParametersPanelFooter } from './workflowParametersPanel/workflowParametersPanelFooter';
import { Panel, PanelType } from '@fluentui/react';
import { Spinner, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { isUndefined } from '@microsoft/applicationinsights-core-js';
import type { CommonPanelProps, CustomPanelLocation } from '@microsoft/designer-ui';
import { PanelLocation, PanelSize } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

export interface PanelRootProps {
  panelLocation?: PanelLocation;
  customPanelLocations?: CustomPanelLocation[];
}

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

const useStyles = makeStyles({
  resizer: {
    ...shorthands.borderLeft('1px', 'solid', tokens.colorNeutralBackground5),

    width: '8px',
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    cursor: 'col-resize',
    resize: 'horizontal',

    ':hover': {
      borderLeftWidth: '4px',
    },
  },

  resizerActive: {
    borderLeftWidth: '4px',
    borderLeftColor: tokens.colorNeutralBackground5Pressed,
  },
});

export const PanelRoot = (props: PanelRootProps): JSX.Element => {
  const { panelLocation, customPanelLocations } = props;
  const dispatch = useDispatch<AppDispatch>();
  const isDarkMode = useIsDarkMode();
  const styles = useStyles();

  const collapsed = useIsPanelCollapsed();
  const currentPanelMode = useCurrentPanelMode();
  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState<any>(PanelSize.Auto);
  const [mouseX, setMouseX] = useState(0);
  const startResizing = useCallback((test: any) => {
    setMouseX(test.clientX);
    return setIsResizing(true);
  }, []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const animationFrame = useRef<number>(0);

  useEffect(() => {
    setWidth(collapsed ? PanelSize.Auto : PanelSize.Medium);
  }, [collapsed]);

  const dismissPanel = useCallback(() => dispatch(clearPanel()), [dispatch]);

  const commonPanelProps: CommonPanelProps = useMemo(() => {
    const customLocation = customPanelLocations?.find((x) => currentPanelMode === x.panelMode)?.panelLocation;
    return {
      isCollapsed: collapsed,
      toggleCollapse: dismissPanel,
      width,
      layerProps,
      panelLocation: customLocation ?? panelLocation ?? PanelLocation.Right,
    };
  }, [customPanelLocations, currentPanelMode, collapsed, dismissPanel, panelLocation, width]);

  const onRenderFooterContent = useMemo(
    () => (currentPanelMode === 'WorkflowParameters' ? () => <WorkflowParametersPanelFooter /> : undefined),
    [currentPanelMode]
  );

  const nonBlockingPanels = useMemo(() => ['Connection', 'Assertions'], []);

  const isLoadingPanel = useIsLoadingPanel();

  const LoadingComponent = () => (
    <div className="msla-loading-container">
      <Spinner size={'large'} />
    </div>
  );

  const resize = useCallback(
    ({ clientX }: MouseEvent) => {
      animationFrame.current = requestAnimationFrame(() => {
        if (isResizing) {
          const newSize = mouseX - clientX;
          console.log('charlie', newSize, mouseX);
          setWidth(newSize.toString() + 'px');
        }
      });
    },
    [isResizing, mouseX]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);

    return () => {
      cancelAnimationFrame(animationFrame.current);
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (!isLoadingPanel && isUndefined(currentPanelMode)) || currentPanelMode === 'Operation' ? (
    <NodeDetailsPanel {...commonPanelProps} />
  ) : (
    <Panel
      className={`msla-panel-root-${currentPanelMode}`}
      isLightDismiss
      isBlocking={!isLoadingPanel && !nonBlockingPanels.includes(currentPanelMode ?? '')}
      type={commonPanelProps.panelLocation === PanelLocation.Right ? PanelType.custom : PanelType.customNear}
      isOpen={!collapsed}
      onDismiss={dismissPanel}
      hasCloseButton={false}
      overlayProps={{ isDarkThemed: isDarkMode }}
      layerProps={layerProps}
      customWidth={width}
      onRenderFooterContent={onRenderFooterContent}
      isFooterAtBottom={true}
      styles={({ theme }) => ({
        footer: {
          backgroundColor: theme?.semanticColors.bodyBackground,
          borderTop: 0,
        },
      })}
    >
      <div className={mergeClasses(styles.resizer, isResizing && styles.resizerActive)} onMouseDown={startResizing} />
      {
        isLoadingPanel ? (
          <LoadingComponent />
        ) : currentPanelMode === 'WorkflowParameters' ? (
          <WorkflowParametersPanel {...commonPanelProps} />
        ) : currentPanelMode === 'Discovery' ? (
          <RecommendationPanelContext {...commonPanelProps} />
        ) : currentPanelMode === 'NodeSearch' ? (
          <NodeSearchPanel {...commonPanelProps} />
        ) : currentPanelMode === 'Connection' ? (
          <ConnectionPanel {...commonPanelProps} />
        ) : currentPanelMode === 'Error' ? (
          <ErrorsPanel {...commonPanelProps} />
        ) : currentPanelMode === 'Assertions' ? (
          <AssertionsPanel {...commonPanelProps} />
        ) : null // Caught above
      }
    </Panel>
  );
};
