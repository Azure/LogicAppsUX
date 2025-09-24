import {
	useMonitoringView,
	useHostOptions,
	useIsDarkMode,
} from '../../core/state/designerOptions/designerOptionsSelectors';
import { useWorkflowHasAgentLoop } from '../../core/state/designerView/designerViewSelectors';
import type { RootState } from '../../core/store';
import { PanelRoot } from '../panel/panelRoot';
import { setLayerHostSelector } from '@fluentui/react';
import { getDurationString, mergeClasses, PanelLocation } from '@microsoft/designer-ui';
import type { CustomPanelLocation } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { AgentChat } from '../panel/agentChat/agentChat';
import { useRunData, useRunInstance } from '../../core/state/workflow/workflowSelectors';
import { RunHistoryEntryInfo } from '../panel';
import { useDesignerTreeViewStyles } from './DesignerTreeView.styles';
import { Skeleton, SkeletonItem, Text, Tree, TreeItem, TreeItemLayout } from '@fluentui/react-components';
import { useAllIcons } from '../../core/state/operation/operationSelector';
import { changePanelNode, useOperationPanelSelectedNodeId } from '../../core';
import { sortRecord, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useDesignerStyles } from '../Designer.styles';
import StatusIndicator from './StatusIndicator';


export interface DesignerTreeViewProps {
	panelLocation?: PanelLocation;
	customPanelLocations?: CustomPanelLocation[];
}

export const DesignerTreeView = (props: DesignerTreeViewProps) => {
	const { panelLocation = PanelLocation.Right, customPanelLocations } = props;

	const dispatch = useDispatch();
	const isDarkMode = useIsDarkMode();
	const styles = useDesignerStyles();
	const treeViewStyles = useDesignerTreeViewStyles();
	const selectedRun = useRunInstance();
	const designerContainerRef = useRef<HTMLDivElement>(null);
	const icons = useAllIcons();

	useEffect(() => setLayerHostSelector('#msla-layer-host'), []);

	const actions = useMemo(() => {
		const trigger = selectedRun?.properties.trigger;
		return sortRecord(
			{
				[trigger?.name ?? '']: trigger,
				...selectedRun?.properties.actions
			}, 
			(_, a, __, b) => (
				a?.startTime && b?.startTime 
					? new Date(a.startTime).getTime() - new Date(b.startTime).getTime() 
					: 0
			));
	}, [selectedRun?.properties.actions, selectedRun?.properties.trigger]);

	const isMonitoringView = useMonitoringView();
	const workflowHasAgentLoop = useWorkflowHasAgentLoop();

	const hasChat = useMemo(() => {
		return workflowHasAgentLoop && isMonitoringView;
	}, [isMonitoringView, workflowHasAgentLoop]);

	const onTreeItemSelect = useCallback((id: string) => {
		dispatch(changePanelNode(id));
	}, [dispatch]);

	const selectedNode = useOperationPanelSelectedNodeId();

	// Adding recurrence interval to the query to access outside of functional components
	const recurrenceInterval = useHostOptions().recurrenceInterval;
	useQuery({
		queryKey: ['recurrenceInterval'],
		initialData: recurrenceInterval,
		queryFn: () => {
			return recurrenceInterval ?? null;
		},
	});

	// Adding workflowKind (stateful or stateless) to the query to access outside of functional components
	const workflowKind = useSelector((state: RootState) => state.workflow.workflowKind);
	// This delayes the query until the workflowKind is available
	useQuery({ queryKey: ['workflowKind'], initialData: undefined, enabled: !!workflowKind, queryFn: () => workflowKind });

	const isRunning = selectedRun?.properties.status === 'Running' || selectedRun?.properties.status === 'Waiting' || selectedRun?.properties.status === 'Resuming';

	if (!selectedRun) {
		return null;
	}

	return (
		<div
			ref={designerContainerRef}
			className={mergeClasses(treeViewStyles.treeViewContainer, 'msla-panel-mode', styles.vars, isDarkMode ? styles.darkVars : styles.lightVars)}
		>
			<div style={{ 
				flexGrow: 1,
				display: 'flex',
				flexDirection: 'column',
				position: 'relative',
				gap: '8px',
				padding: '12px',
			}}>
				<div style={{ padding: '8px 4px' }}>
					<RunHistoryEntryInfo run={selectedRun as any} />
				</div>
				<Tree defaultOpenItems={Object.keys(actions ?? {})} aria-label="">
					{Object.entries(actions ?? {}).map(([id, action]) => (
						<TreeActionItem
							key={id} 
							id={id} 
							action={action} 
							icon={icons[id]} 
							onClick={() => onTreeItemSelect(id)}
							selected={id === selectedNode}
						/>
					))}
					{isRunning ? (
						<Skeleton style={{ padding: '4px 0px', width: '280px' }}>
							<SkeletonItem size={24} />
						</Skeleton>
					) : null}
				</Tree>
			</div>
			<PanelRoot
				panelContainerRef={designerContainerRef}
				panelLocation={panelLocation}
				customPanelLocations={customPanelLocations}
				isResizeable={true}
			/>
			{hasChat ? <AgentChat panelLocation={PanelLocation.Right} panelContainerRef={designerContainerRef} /> : null}
			<div id={'msla-layer-host'} className={styles.layerHost} />
		</div>
	);
};

export interface TreeActionItemProps {
	id: string;
	action?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
	icon?: string;
	onClick?: () => void;
	selected?: boolean;
}

const TreeActionItem = ({ id, action, icon, onClick, selected }: TreeActionItemProps) => {
	const styles = useDesignerTreeViewStyles();

	const runData = useRunData(id);

	const duration = useMemo(() => {
		if (runData?.endTime && runData?.duration) {
			return runData?.duration;
		}
		const currentTime = Date.now();
		const activeDuration = getDurationString(currentTime - Date.parse(runData?.startTime ?? ''));

		return activeDuration;
	}, [runData]);

	return (
		<TreeItem itemType="leaf" onClick={() => {
			onClick?.()
			console.log('#> Action:', { id, action });
		}}>
			<TreeItemLayout className={mergeClasses(selected ? styles.treeItemSelected : styles.treeItem)}>
				{selected ? (
					<div className={styles.selectionIndicator} />
				) : null}
				<div className={styles.treeItemContent}>
					{icon ? (
						<img src={icon} alt={id} className={styles.treeItemIcon} />
					) : (
						<div className={styles.treeItemIcon} />
					)}
					<Text>{id}</Text>
					{runData?.status ? (
						<StatusIndicator status={runData.status} />
					) : undefined}
					{runData?.duration ? (
						// <Badge shape="rounded" appearance="ghost" color="informative">
						// 	{runData?.duration}
						// </Badge>
						<Text>{duration}</Text>
					) : null}
				</div>
			</TreeItemLayout>
		</TreeItem>
	);
};
