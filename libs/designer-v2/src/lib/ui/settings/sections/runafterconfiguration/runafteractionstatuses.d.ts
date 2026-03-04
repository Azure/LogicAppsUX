/// <reference types="react" />
import type { onChangeHandler } from './runafteractiondetails';
export interface RunAfterActionStatusesProps {
    isReadOnly: boolean;
    statuses: string[];
    onStatusChange?: onChangeHandler;
}
export declare function RunAfterActionStatuses({ isReadOnly, statuses, onStatusChange }: RunAfterActionStatusesProps): JSX.Element;
