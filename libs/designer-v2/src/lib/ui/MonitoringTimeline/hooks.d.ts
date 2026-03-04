import { type UseQueryResult } from '@tanstack/react-query';
export interface TimelineRepetition {
    properties: {
        agentMetadata: {
            taskSequenceId: string;
            agentName: string;
        };
        canResubmit: boolean;
        startTime: string;
        correlation: {
            actionTrackingId: string;
            clientTrackingId: string;
        };
        status: string;
        code: string;
        error?: any;
    };
    id: string;
    name: string;
    type: string;
}
export declare const useTimelineRepetitions: () => UseQueryResult<TimelineRepetition[]>;
export declare const useTimelineRepetitionCount: (actionId: string) => number;
