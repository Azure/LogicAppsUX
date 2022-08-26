export interface Connection {
  value: string;
  loop?: LoopConnection;
  condition?: string;

  //Only used to display edges
  reactFlowSource: string;
  reactFlowDestination: string;
}

export interface LoopConnection {
  loopSource: string;
  loopIndex?: string;
}
