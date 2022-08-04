import type { SectionProps } from '../';
import constants from '../../../common/constants';
import type { GraphEdge } from '../../../core/actions/bjsworkflow/settings';
import type { WorkflowEdge } from '../../../core/parsers/models/workflowNode';
import { updateNodeSettings } from '../../../core/state/operation/operationMetadataSlice';
import type { SettingSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import type { RunAfterActionDetailsProps } from './runafterconfiguration';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

// TODO: 14714481 We need to support all incoming edges and runAfterConfigMenu

interface RunAfterProps extends SectionProps {
  allEdges: WorkflowEdge[];
}

export const RunAfter = ({ runAfter, readOnly = false, expanded, onHeaderClick, nodeId }: RunAfterProps): JSX.Element | null => {
  const dispatch = useDispatch();
  const [statuses, setStatuses] = useState<Record<string, string[]>>({});
  const graphEdges = runAfter?.value;

  useEffect(() => {
    setStatuses((): Record<string, string[]> => {
      const record: Record<string, string[]> = {};
      if (graphEdges) {
        graphEdges.forEach((edge) => {
          record[edge.predecessorId] = edge.statuses ?? ['Succeeded'];
        });
      }
      return record;
    });
  }, [graphEdges]);

  const getGraphEdgesFromStatuses = (statuses: Record<string, string[]>, originalEdges?: GraphEdge[]): GraphEdge[] => {
    if (!originalEdges) {
      return [];
    }
    return originalEdges.map((edge) => {
      return { ...edge, statuses: statuses[edge.predecessorId] };
    });
  };

  const handleStatusChange = (predecessorId: string, status: string, checked?: boolean) => {
    const updatedStatus: string[] = [...statuses[predecessorId]];

    const index = updatedStatus?.findIndex((s) => s.toUpperCase() === status);
    if (index !== -1 && updatedStatus.length > 1) {
      // TODO (14427339): set validation here and alert user of last status
      updatedStatus.splice(index, 1);
    }
    if (checked) {
      updatedStatus.push(status);
    }

    const updatedStatuses: Record<string, string[]> = { ...statuses };
    updatedStatuses[predecessorId] = updatedStatus;
    setStatuses(updatedStatuses);
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          runAfter: {
            isSupported: !!runAfter?.isSupported,
            value: getGraphEdgesFromStatuses(updatedStatuses, graphEdges),
          },
        },
      })
    );
  };

  const GetRunAfterProps = (): RunAfterActionDetailsProps[] => {
    const items: RunAfterActionDetailsProps[] = [];
    graphEdges?.forEach((edge) => {
      const { predecessorId } = edge;
      items.push({
        collapsible: true,
        expanded: false,
        id: predecessorId,
        isDeleteVisible: true,
        readOnly: readOnly,
        title: predecessorId,
        statuses: statuses[predecessorId] ?? ['Succeeded'],
        onStatusChange: (status, checked) => {
          handleStatusChange(predecessorId, status, checked);
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
        },
        visible: runAfter?.isSupported,
      },
    ],
  };

  return <SettingsSection {...runAfterSectionProps} />;
};
