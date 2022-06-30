import type { BuiltInOutput, OperationManifest } from "@microsoft-logic-apps/utils";
import type { OutputToken} from "@microsoft/designer-ui";
import { TokenType } from "@microsoft/designer-ui";
import type { WorkflowNode } from "../parsers/models/workflowNode";
import type { NodesMetadata } from "../state/workflowSlice";
import { getAllNodesInsideNode, getUpstreamNodeIds } from "./graph";
import { getRepetitionContext, shouldIncludeSelfForRepetitionReference } from "./parameters/helper";
import type { OutputInfo } from "../state/operationMetadataSlice";
import { OutputKeys, parseEx } from "@microsoft-logic-apps/parsers";
import { hasSecureOutputs } from "./setting";
import type { NodeDataWithManifest } from "../actions/bjsworkflow/operationdeserializer";

export function getTokenNodeIds(
    nodeId: string,
    graph: WorkflowNode,
    nodesMetadata: NodesMetadata,
    nodesManifest: Record<string, NodeDataWithManifest>,
    operationMap: Record<string, string>
): string[] {
    const manifest = nodesManifest[nodeId].manifest;
    const tokenNodes = getUpstreamNodeIds(nodeId, graph, nodesMetadata);

    const includeSelf = shouldIncludeSelfForRepetitionReference(manifest);
    const repetitionContext = getRepetitionContext(includeSelf);

    if (repetitionContext && repetitionContext.repetitionReferences) {
        for (const repetitionReference of repetitionContext.repetitionReferences) {
            const { actionName } = repetitionReference;
            const nodeManifest = nodesManifest[actionName]?.manifest;
            if (nodeManifest?.properties.repetition && !nodeManifest.properties.repetition.self) {
                tokenNodes.push(actionName);
            }
        }
    }

    if (includeSelf) {
        const allNodesInsideNode = getAllNodesInsideNode(nodeId, graph, operationMap)
        tokenNodes.push(...allNodesInsideNode);
    }

    return tokenNodes;
}

export function getBuiltInTokens(manifest: OperationManifest): OutputToken[] {
    const icon = manifest.properties.iconUri;
    const brandColor = manifest.properties.brandColor;

    return (manifest.properties.outputTokens?.builtIns || [])
        .map(({ name, title, required, type }: BuiltInOutput) => ({
            key: `system.$.function.${name}`,
            brandColor,
            icon,
            title,
            name,
            type,
            isAdvanced: false,
            outputInfo: {
                type: TokenType.OUTPUTS,
                required
            }
        }));
}

export function convertOutputsToTokens(
    nodeId: string,
    nodeType: string,
    outputs: Record<string, OutputInfo>,
    manifest: OperationManifest,
    allNodesData: Record<string, NodeDataWithManifest>
): OutputToken[] {
    const icon = manifest.properties.iconUri;
    const brandColor = manifest.properties.brandColor;
    const isSecure = hasSecureOutputs(nodeType, allNodesData[nodeId].settings);
    
    // TODO - Look at repetition context to get foreach context correctly in tokens and for splitOn

    return Object.keys(outputs).map(outputKey => {
        const { key, name, type, isAdvanced, description, required, format, source, isInsideArray, parentArray, itemSchema } = outputs[outputKey];
        return {
            key,
            brandColor,
            icon,
            title: getTokenTitle(outputs[outputKey]),
            name,
            type,
            description,
            isAdvanced,
            outputInfo: {
                type: TokenType.OUTPUTS,
                required,
                format,
                source,
                isSecure,
                actionName: nodeId,
                arrayDetails: isInsideArray ? { itemSchema, parentArray } : undefined
            }
        }
    });
}

function getTokenTitle(output: OutputInfo): string {
    if (output.title) {
        return output.title;
    }

    if (output.isInsideArray) {
        return output.parentArray ? `${output.parentArray} - Item` : 'Item';
    }

    if (output.name) {
        switch (output.name) {
            case OutputKeys.Item:
                return 'Item';
            case OutputKeys.PathParameters:
                return 'Path Parameters';
            default:
                // eslint-disable-next-line no-case-declarations
                const segments = parseEx(output.name);
                return String(segments[segments.length - 1].value);
        }
    }

    return 'Body';
}
