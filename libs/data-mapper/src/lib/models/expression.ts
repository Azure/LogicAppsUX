export interface Expression {
  name: string;
  numberOfInputs: number;
  type: string;
  userExpression: string;
  xsltExpression?: string;
  isSequenceInputSupported: boolean;
  isXsltOperatorExpression: boolean;
  namespacePrefix?: string;
}
