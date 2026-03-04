/// <reference types="react" />
import { type ConnectionTableProps } from './connectionTable';
export declare const SelectConnectionWrapper: () => import("react/jsx-runtime").JSX.Element;
export declare const SelectConnection: ({ addButton, cancelButton, actionBar, errorMessage, connections, currentConnectionId, saveSelectionCallback, cancelSelectionCallback, isXrmConnectionReferenceMode, }: ConnectionTableProps & {
    addButton: {
        text: string;
        disabled?: boolean;
        onAdd: () => void;
    };
    cancelButton?: {
        onCancel: () => void;
    } | undefined;
    actionBar?: JSX.Element | undefined;
    errorMessage?: string | undefined;
}) => import("react/jsx-runtime").JSX.Element;
