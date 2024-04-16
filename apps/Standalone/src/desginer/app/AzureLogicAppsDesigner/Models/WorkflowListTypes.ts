export interface WorkflowList {
  value?: Value[];
  nextLink?: null;
  id?: null;
}

export interface RunList {
  value?: RunValue[];
  nextLink?: null;
  id?: null;
}

export interface RunValue {
  properties: {
    waitEndTime: string;
    startTime: string;
    endTime: string;
    status: string;
    workflow: Record<string, any>;
    trigger: Record<string, any>;
    outputs: Record<string, any>;
  };
  id: string;
  name: string;
  type: string;
}

export interface Value {
  id?: string;
  name?: string;
  type?: string;
  kind?: string;
  location?: string;
  properties?: Properties;
}

export interface Properties {
  flowState?: string;
  health?: Health;
}

export interface Health {
  state?: string;
}
