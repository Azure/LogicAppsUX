import { type McpServerCreateData } from '../../../core/mcp/utils/serializer';
export type RegisterMcpServerHandler = (workflowsData: McpServerCreateData, onCompleted?: () => void) => Promise<void>;
export declare const McpWizard: ({ registerMcpServer, onClose }: {
    registerMcpServer: RegisterMcpServerHandler;
    onClose: () => void;
}) => import("react/jsx-runtime").JSX.Element;
