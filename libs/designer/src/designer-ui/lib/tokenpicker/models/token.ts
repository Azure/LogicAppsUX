import type { TokenType } from '../../editor';
import type { OpenAPIV2 } from '@microsoft/logic-apps-designer';

export interface Token {
  key: string;
  brandColor: string;
  icon?: string;
  title: string;
  description?: string;
  name?: string;
  type: string;
  isAdvanced?: boolean;
  value?: string;
  outputInfo: {
    type: TokenType; // Should only support FX, OUTPUTS, VARIABLE, PARAMETER
    required?: boolean;
    format?: string;
    source?: string;
    isSecure?: boolean;
    isDynamic?: boolean;
    arrayDetails?: {
      itemSchema?: OpenAPIV2.SchemaObject;
      parentArray?: string;
    };
    schema?: OpenAPIV2.SchemaObject;
    actionName?: string;
    functionName?: string; // For now, the only allowed values are 'variables' and 'parameters'.
    triggerName?: string; // If the outputToken is from a trigger, this will be the trigger name.
    functionArguments?: string[]; //For now, the only allowed values are 'variables' and 'parameters'.
  };
}

export interface TokenGroup {
  id: string;
  label: string;
  tokens: Token[];
  hasAdvanced?: boolean;
  showAdvanced?: boolean;
}
