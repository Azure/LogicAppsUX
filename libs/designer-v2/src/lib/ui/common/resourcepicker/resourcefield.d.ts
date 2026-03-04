import { type Resource } from '@microsoft/logic-apps-shared';
export declare const ResourceField: ({ id, label, resources, defaultKey, errorMessage, isLoading, onSelect, lockField, }: {
    id: string;
    label: string;
    defaultKey: string;
    resources: Resource[];
    onSelect: (value: any) => void;
    isLoading?: boolean | undefined;
    errorMessage?: string | undefined;
    lockField: boolean;
}) => import("react/jsx-runtime").JSX.Element;
