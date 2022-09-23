export type ConnectionDictionary = { [key: string]: Connection };

export interface Connection {
  destination: string;
  sourceValue: string;
  loop?: LoopConnection;
  condition?: string;
  isSelected?: boolean;

  //Only used to display edges
  reactFlowSource: string;
  reactFlowDestination: string;
}

export interface LoopConnection {
  loopSource: string;
  loopIndex?: string;
}
