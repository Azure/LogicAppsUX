/// <reference types="react" />
import { type MessageBarIntent } from '@fluentui/react-components';
export interface MessageBarProps {
    type: MessageBarIntent;
    message: string;
    onWarningDismiss?: () => void;
}
export declare function CustomizableMessageBar({ type, message, onWarningDismiss }: MessageBarProps): JSX.Element;
