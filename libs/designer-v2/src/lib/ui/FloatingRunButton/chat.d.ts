import type { UseQueryResult } from '@tanstack/react-query';
import type { ButtonProps } from '@fluentui/react-components';
import type { AgentURL } from '@microsoft/logic-apps-shared';
export declare const useAgentUrl: (props: {
    isDraftMode?: boolean;
}) => UseQueryResult<AgentURL>;
export type ChatButtonProps = ButtonProps & {
    isDarkMode: boolean;
    isDraftMode?: boolean;
    siteResourceId?: string;
    workflowName?: string;
    tooltipText?: string;
    saveWorkflow: () => Promise<void>;
};
export declare const ChatButton: (props: ChatButtonProps) => import("react/jsx-runtime").JSX.Element;
