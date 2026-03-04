/// <reference types="react" />
export type onChangeHandler = (status: string, checked?: boolean) => void;
interface LabelProps {
    label: string;
    status: string;
}
export interface RunAfterActionDetailsProps {
    collapsible?: boolean;
    expanded: boolean;
    id: string;
    disableDelete: boolean;
    disableStatusChange: boolean;
    readOnly: boolean;
    statuses: string[];
    visible?: boolean;
    onDelete?(): void;
    onRenderLabel?(props: LabelProps): JSX.Element | null;
    onStatusChange?: onChangeHandler;
}
export declare const RunAfterActionDetails: ({ id, collapsible, disableDelete, disableStatusChange, readOnly, statuses, onDelete, onStatusChange, }: RunAfterActionDetailsProps) => import("react/jsx-runtime").JSX.Element;
export {};
