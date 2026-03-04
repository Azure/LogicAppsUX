import type { ConnectionParameterSets } from '@microsoft/logic-apps-shared';
import type { FormEvent } from 'react';
export interface ConnectionMultiAuthInputProps {
    isLoading: boolean;
    value: number;
    onChange: (_event: FormEvent<HTMLDivElement>, item: any) => void;
    connectionParameterSets: ConnectionParameterSets | undefined;
}
declare const ConnectionMultiAuthInput: ({ isLoading, value, onChange, connectionParameterSets }: ConnectionMultiAuthInputProps) => import("react/jsx-runtime").JSX.Element;
export default ConnectionMultiAuthInput;
