import ELK from 'elkjs/lib/elk.bundled';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled';

const elk = new ELK();

const defaultLayoutOptions: Record<string, string> = {
    'elk.algorithm': 'org.eclipse.elk.layered',
    'elk.direction': 'RIGHT',
    'elk.alignment': 'LEFT',
    'elk.layered.layering.strategy': 'INTERACTIVE',
    'elk.edge.type': 'DIRECTED',
    'elk.layered.unnecessaryBendpoints': 'false',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
    'elk.layered.spacing.edgeEdgeBetweenLayers': '0',
    'elk.layered.spacing.edgeNodeBetweenLayers': '64',
    'elk.layered.spacing.nodeNodeBetweenLayers': '64',
    'elk.padding': '[top=16,left=16,bottom=16,right=16]',
    // 'elk.layered.crossingMinimization.semiInteractive': 'true',
    'elk.layered.crossingMinimization.forceNodeModelOrder': 'false',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
};

const convertDataMapGraphToElkGraph = () => {};

const applyElkLayout = async (graph: ElkNode) => {
    return elk.layout(graph, {
        layoutOptions: {
            ...defaultLayoutOptions,
        }
    });
};

const convertElkGraphToReactFlow = () => {};