/// <reference types="react" />
interface ConnectionParameterRowParameterRowSelfProps {
    parameterKey: string;
    displayName: string;
    tooltip?: string | JSX.Element;
    required?: boolean;
    disabled?: boolean;
    children: JSX.Element;
}
export type ConnectionParameterRowProps = React.PropsWithChildren<ConnectionParameterRowParameterRowSelfProps>;
export declare const ConnectionParameterRow: ({ parameterKey, displayName, tooltip, required, disabled, children, }: ConnectionParameterRowProps) => import("react/jsx-runtime").JSX.Element;
export {};
