import ELK from 'elkjs/lib/elk.bundled';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled';

const elk = new ELK();

const defaultLayoutOptions: Record<string, string> = {
    'nodePlacement.strategy': 'BRANDES_KOEPF',
    'algorithm': 'layered',
    'crossingMinimization.semiInteractive': 'true',
    'spacing.edgeNodeBetweenLayers': '32.0',
    'partitioning.activate': 'true',
    'hierarchyHandling': 'INCLUDE_CHILDREN',
    'layering.strategy': 'INTERACTIVE',
    'spacing.nodeNodeBetweenLayers': '32.0',
    'crossingMinimization.forceNodeModelOrder': 'true',
    'considerModelOrder.strategy': 'NODES_AND_EDGES',
    'alignment': 'LEFT',
    'elk.direction': 'RIGHT'
};

const convertDataMapNodesToElkGraph = () => {};

const applyElkLayout = async (graph: ElkNode) => {
    return elk.layout(graph, {
        layoutOptions: {
            ...defaultLayoutOptions,
        }
    });
};

const convertElkGraphToReactFlow = () => {};