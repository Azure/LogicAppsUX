import type { OperationActionData } from '@microsoft/designer-ui';
export interface OperationsAccordionProps {
    triggers: OperationActionData[];
    actions: OperationActionData[];
    isTrigger: boolean;
    isLoading: boolean;
    onTriggerClick: (id: string, apiId?: string) => void;
    onActionClick: (id: string, apiId?: string) => void;
}
export declare const OperationsAccordion: ({ triggers, actions, isTrigger, isLoading, onTriggerClick, onActionClick, }: OperationsAccordionProps) => import("react/jsx-runtime").JSX.Element;
