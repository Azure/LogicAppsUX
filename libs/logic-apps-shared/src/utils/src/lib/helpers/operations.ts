import type { WorkflowNodeType } from '../models/workflowNode';
import { WORKFLOW_NODE_TYPES } from '../models/workflowNode';

export const isScopeOperation = (s: string): boolean => {
  return ['scope', 'foreach', 'until', 'if', 'switch'].includes(s.toLowerCase());
};

export const isSubGraphNode = (s: WorkflowNodeType): boolean => {
  return WORKFLOW_NODE_TYPES['SUBGRAPH_NODE'] === s;
};

export const replaceTemplatePlaceholders = (placeholderValues: Record<string, any>, template: string): string => {
  const placeholders = Object.keys(placeholderValues).map((placeholderKey) => {
    const value = placeholderValues[placeholderKey];
    return {
      key: placeholderKey,
      placeholderKey: `{${placeholderKey.toUpperCase()}}`,
      value: value ? value : '',
    };
  });
  let updatedTemplate = normalizeTemplate(template);
  for (const placeholder of placeholders) {
    updatedTemplate = updatedTemplate.replace(placeholder.placeholderKey, placeholder.value);
  }

  return updatedTemplate;
};

/**
 * Normalizes the placeholder keys in the template
 * @arg {string} template - path template from the swagger operation
 * @return {string} - template with all the placeholder keys replaced with uppercase values
 */
const normalizeTemplate = (template: string): string => {
  const pathKeys = template.match(/{(.*?)}/g);
  let updatedTemplate = template;

  if (pathKeys) {
    for (const pathKey of pathKeys) {
      updatedTemplate = updatedTemplate.replace(pathKey, pathKey.toUpperCase());
    }
  }

  return updatedTemplate;
};
