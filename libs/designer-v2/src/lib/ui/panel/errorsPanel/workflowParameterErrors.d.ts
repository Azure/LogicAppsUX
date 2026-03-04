interface WorkflowParameterErrorsProps {
    parameterNames?: Record<string, string>;
    errors?: Record<string, Record<string, string | undefined>>;
}
export declare const WorkflowParameterErrors: (props: WorkflowParameterErrorsProps) => import("react/jsx-runtime").JSX.Element;
export {};
