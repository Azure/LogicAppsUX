import type { SectionProps } from '../';
import type { WorkflowEdge } from '../../../core/parsers/models/workflowNode';
import type { SettingSectionProps } from './';
import { SettingsSection } from './';
import type { RunAfterActionDetailsProps } from './runafterconfiguration';
import { useEffect, useState } from 'react';

// TODO: 14714481 We need to support all incoming edges and runAfterConfigMenu
interface RunAfterProps extends SectionProps {
  allEdges: WorkflowEdge[];
}

export const RunAfter = ({ runAfter, readOnly = false }: RunAfterProps): JSX.Element | null => {
  const [statuses, setStatuses] = useState<Record<string, string[]>>({});
  const graphEdges = runAfter?.value;

  useEffect(() => {
    setStatuses((): Record<string, string[]> => {
      const record: Record<string, string[]> = {};
      if (graphEdges) {
        graphEdges.forEach((edge) => {
          record[edge.predecessorId] = edge.statuses ?? [];
        });
      }
      return record;
    });
  }, [graphEdges]);

  const handleStatusChange = (key: string, status: string, checked?: boolean) => {
    const updatedStatus: string[] = [...statuses[key]];

    const index = updatedStatus?.findIndex((s) => s.toUpperCase() === status);
    if (index !== -1) {
      updatedStatus.splice(index, 1);
    }
    if (checked) {
      updatedStatus.push(status);
    }

    const updatedStatuses = { ...statuses };
    updatedStatuses[key] = updatedStatus;
    setStatuses(updatedStatuses);
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
        statuses: statuses[predecessorId] ?? [],
        onStatusChange: (status, checked) => {
          handleStatusChange(predecessorId, status, checked);
        },
      });
    });
    return items;
  };

  const runAfterSectionProps: SettingSectionProps = {
    id: 'runAfter',
    title: 'Run After',
    expanded: false,
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
