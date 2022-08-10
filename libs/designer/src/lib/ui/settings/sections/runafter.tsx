import type { SectionProps } from '../';
import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import type { WorkflowEdge } from '../../../core/parsers/models/workflowNode';
import { addEdge, updateRunAfter } from '../../../core/state/workflow/workflowSlice';
import type { SettingSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import type { RunAfterActionDetailsProps } from './runafterconfiguration';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

// TODO: 14714481 We need to support all incoming edges and runAfterConfigMenu

interface RunAfterProps extends SectionProps {
  allEdges: WorkflowEdge[];
}

export const RunAfter = ({ runAfter, readOnly = false, expanded, onHeaderClick, nodeId }: RunAfterProps): JSX.Element | null => {
  const nodeData = useSelector((state: RootState) => state.workflow.operations[nodeId] as LogicAppsV2.ActionDefinition);
  const dispatch = useDispatch<AppDispatch>();

  const handleStatusChange = (predecessorId: string, status: string, checked?: boolean) => {
    if (!nodeData.runAfter) {
      return;
    }
    const updatedStatus: string[] = [...nodeData.runAfter[predecessorId]].filter((x) => x !== status);

    if (checked) {
      updatedStatus.push(status);
    }

    dispatch(
      updateRunAfter({
        childOperation: nodeId,
        parentOperation: predecessorId,
        statuses: updatedStatus,
      })
    );
  };

  const GetRunAfterProps = (): RunAfterActionDetailsProps[] => {
    const items: RunAfterActionDetailsProps[] = [];
    Object.entries(nodeData?.runAfter ?? {}).forEach(([id, value]) => {
      items.push({
        collapsible: true,
        expanded: false,
        id: id,
        isDeleteVisible: true,
        readOnly: readOnly,
        title: id,
        statuses: value,
        onStatusChange: (status, checked) => {
          handleStatusChange(id, status, checked);
        },
      });
    });
    return items;
  };
  const intl = useIntl();
  const runAfterTitle = intl.formatMessage({
    defaultMessage: 'Run After',
    description: 'title for run after setting section',
  });

  const runAfterSectionProps: SettingSectionProps = {
    id: 'runAfter',
    title: runAfterTitle,
    sectionName: constants.SETTINGSECTIONS.RUNAFTER,
    expanded,
    onHeaderClick,
    settings: [
      {
        settingType: 'RunAfter',
        settingProp: {
          items: GetRunAfterProps(),
          onEdgeAddition: (parentNode: string) => {
            dispatch(
              addEdge({
                parentOperationId: parentNode,
                childOperationId: nodeId,
              })
            );
          },
        },
        visible: runAfter?.isSupported,
      },
    ],
  };

  return <SettingsSection {...runAfterSectionProps} />;
};
