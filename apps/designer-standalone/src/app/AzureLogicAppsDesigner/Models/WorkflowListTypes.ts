export interface WorkflowList {
  value?: Value[];
  nextLink?: null;
  id?: null;
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
