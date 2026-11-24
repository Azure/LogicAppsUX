/**
 * Graph types structurally compatible with the subset of the elkjs JSON graph format used by Logic Apps.
 * Coordinates of children, ports, and edge sections are relative to their parent/container, as in elkjs.
 */

export type LayoutOptions = Record<string, string>;

export interface ElkPoint {
  x: number;
  y: number;
}

export interface ElkGraphElement {
  id?: string;
  labels?: ElkLabel[];
  layoutOptions?: LayoutOptions;
}

export interface ElkShape extends ElkGraphElement {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ElkLabel extends ElkShape {
  text?: string;
}

export interface ElkPort extends ElkShape {
  id: string;
}

export interface ElkNode extends ElkShape {
  id: string;
  children?: ElkNode[];
  ports?: ElkPort[];
  edges?: ElkExtendedEdge[];
}

export interface ElkEdgeSection extends ElkGraphElement {
  id: string;
  startPoint: ElkPoint;
  endPoint: ElkPoint;
  bendPoints?: ElkPoint[];
  incomingShape?: string;
  outgoingShape?: string;
  incomingSections?: string[];
  outgoingSections?: string[];
}

export interface ElkExtendedEdge extends ElkGraphElement {
  id: string;
  sources: string[];
  targets: string[];
  sections?: ElkEdgeSection[];
  /** Id of the node whose coordinate system the edge sections are expressed in. */
  container?: string;
  junctionPoints?: ElkPoint[];
}

export interface ElkLayoutArguments {
  /** Global options; options set on graph elements take precedence. */
  layoutOptions?: LayoutOptions;
}

export interface ElkConstructorArguments {
  defaultLayoutOptions?: LayoutOptions;
}
