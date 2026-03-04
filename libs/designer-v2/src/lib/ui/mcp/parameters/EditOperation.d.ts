interface EditOperationProps {
    description: string;
    handleDescriptionInputChange: (description: string) => void;
    onParameterVisibilityUpdate: () => void;
    userInputParamIds: Record<string, boolean>;
    setUserInputParamIds: (ids: Record<string, boolean>) => void;
    parameterErrors: Record<string, string | undefined>;
    setParameterErrors: (errors: Record<string, string | undefined>) => void;
}
export declare const EditOperation: ({ description, handleDescriptionInputChange, onParameterVisibilityUpdate, userInputParamIds, setUserInputParamIds, parameterErrors, setParameterErrors, }: EditOperationProps) => import("react/jsx-runtime").JSX.Element;
export {};
