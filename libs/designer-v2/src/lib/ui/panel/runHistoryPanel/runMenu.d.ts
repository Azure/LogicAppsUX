import { type Run } from '@microsoft/logic-apps-shared';
import type { FilterTypes } from './runHistoryPanel';
export declare const RunMenu: (props: {
    run: Run;
    addFilterCallback?: (({ key, value }: {
        key: FilterTypes;
        value: string;
    }) => void) | undefined;
}) => import("react/jsx-runtime").JSX.Element;
