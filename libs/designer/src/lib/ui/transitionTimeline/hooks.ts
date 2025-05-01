import { useMemo } from 'react';
// import sampleData from './sampleData.json';
// import sampleData from './sampleData-looping.json';
import sampleData from './sampleData-multiAction.json';
import type { WorkflowRunAction } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';

export interface TransitionRepetition {
  id: string;
  name: string;
  properties: {
    actions: Record<string, WorkflowRunAction>;
    canResubmit: boolean;
    correlation: any;
    startTime: string;
    status: string;
  };
  type: string;
}

export const useTransitionRepetitions = () =>
  useMemo(() => {
    const parsedData: TransitionRepetition[] = JSON.parse(JSON.stringify(sampleData)).value;
    return parsedData.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, []);
