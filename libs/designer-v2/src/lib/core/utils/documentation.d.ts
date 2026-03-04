import type { NodeOperation } from '../state/operation/operationMetadataSlice';
import type { NodeTokens } from '../state/tokens/tokensSlice';
import { type DocumentationMetadataState } from '@microsoft/logic-apps-shared';
export declare const downloadDocumentAsFile: (sampleResponseDocument: string) => void;
export declare const getDocumentationMetadata: (operationInfo: Record<string, NodeOperation>, _outputTokens: Record<string, NodeTokens>) => DocumentationMetadataState;
export declare const _getCopilotRegisteredCategoryString: (connector: string) => string;
