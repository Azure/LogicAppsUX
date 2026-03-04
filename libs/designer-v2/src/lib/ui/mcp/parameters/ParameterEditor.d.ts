import { type ChangeState } from '@microsoft/designer-ui';
import { type ParameterInfo } from '@microsoft/logic-apps-shared';
interface ParameterEditorProps {
    operationId: string;
    groupId: string;
    parameter: ParameterInfo;
    onParameterVisibilityUpdate: () => void;
    onParameterValueChange: (newState: ChangeState) => void;
}
export declare const ParameterEditor: ({ operationId, groupId, parameter, onParameterVisibilityUpdate, onParameterValueChange, }: ParameterEditorProps) => import("react/jsx-runtime").JSX.Element;
export {};
