import type { RunAfterActionDetailsProps } from './runafteractiondetails';
export * from './runafteractiondetails';
export interface RunAfterProps {
    items: RunAfterActionDetailsProps[];
    readOnly?: boolean;
    onEdgeAddition: (parent: string) => void;
}
export declare const RunAfter: ({ items, readOnly }: RunAfterProps) => import("react/jsx-runtime").JSX.Element;
