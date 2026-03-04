import type { NodeInputs } from '../state/operation/operationMetadataSlice';
import type { NodeTokens, VariableDeclaration } from '../state/tokens/tokensSlice';
import type { OutputToken as Token } from '@microsoft/designer-ui';
export declare const setVariableMetadata: (icon: string, brandColor: string) => void;
export declare const getVariableDeclarations: (nodeInputs: NodeInputs) => VariableDeclaration[];
export declare const getAllVariables: (variables: Record<string, VariableDeclaration[]>) => VariableDeclaration[];
export declare const getAvailableVariables: (variables: Record<string, VariableDeclaration[]>, upstreamNodeIds: string[]) => VariableDeclaration[];
export declare const getVariableTokens: (variables: Record<string, VariableDeclaration[]>, nodeTokens: NodeTokens) => Token[];
export declare const convertVariableTypeToSwaggerType: (type: string | undefined) => string | undefined;
