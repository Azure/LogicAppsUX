// const obj = {
//   counter: 0,
//   inc() {
//     this.counter++;
//   },
// };

import dagre from 'dagre';
import { RootState } from './core/store';
import { expose } from 'comlink';
const Processor = {
  process(currentState: RootState) {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    const tallestNode = Math.max(...currentState.workflow.nodes.map((x) => x.size.height));
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: tallestNode });

    currentState.workflow.nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: node.size.width, height: node.size.height });
      node.childrenNodes.forEach((child) => {
        dagreGraph.setEdge(node.id, child);
      });
    });

    dagre.layout(dagreGraph);
    return currentState.workflow.nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: { x: nodeWithPosition.x - node.size.width / 2, y: nodeWithPosition.y },
      };
    });
  },
};
expose(Processor);
