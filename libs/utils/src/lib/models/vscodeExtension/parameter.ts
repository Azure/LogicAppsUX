export interface Parameter {
    type: string;
    metadata?: any;
    description?: string;
    allowedValues?: any[];
    value: any;
  }
  
  export interface IParametersFileContent {
    name: string;
    content: Parameter;
  }