import { type Template } from '@microsoft/logic-apps-shared';
export declare const ParameterEditor: ({ item, onChange, disabled, error, }: {
    item: Template.ParameterDefinition;
    onChange: (newItem: Template.ParameterDefinition) => void;
    disabled?: boolean | undefined;
    error?: string | undefined;
}) => import("react/jsx-runtime").JSX.Element;
