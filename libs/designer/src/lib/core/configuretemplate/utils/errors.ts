import type { TemplateErrors, WorkflowErrors, WorkflowTemplateData } from '../../actions/bjsworkflow/templates';

interface ErrorDetails {
  code: string;
  message: string;
  target: string;
  additionalInfo: {
    type: string;
    info: ErrorInfoWithTarget;
  }[];
}

interface ErrorInfoWithTarget {
  code: string;
  message: string;
  target: string;
}

export interface TemplateValidationError {
  code: string;
  message: string;
  details: ErrorDetails[];
  additionalInfo?: {
    type: string;
    info: ErrorInfoWithTarget;
  }[];
}

export interface ApiValidationError {
  template: TemplateErrors;
  workflows: Record<string, WorkflowErrors>;
  saveGeneral?: { template?: string; workflows?: string };
}

const regex = /'(.*?)'/g;
const workflowGeneralErrorProperties = ['artifacts', 'metadata'];
export const parseValidationError = (error: TemplateValidationError): ApiValidationError => {
  const result: any = {
    template: {},
    workflows: {},
  };

  for (const info of error.additionalInfo ?? []) {
    const { info: errorInfo } = info;
    if (['TemplatePropertyInvalid', 'TemplatePropertyMissing', 'TemplatePropertyEmpty'].includes(errorInfo.code)) {
      if (!result.template.manifest) {
        result.template.manifest = {};
      }
      const propertySegments = errorInfo.target.split('.');
      propertySegments.shift();
      propertySegments.shift();
      let propertyName = propertySegments.shift();

      if (propertyName === 'manifest') {
        propertyName = propertySegments.shift();

        if (propertyName?.match(regex)) {
          propertyName = propertyName.substring(0, propertyName.indexOf('['));
        } else {
          propertySegments.unshift(propertyName as string);
          propertyName = propertySegments.join('.');
        }

        result.template.manifest[propertyName] = errorInfo.message;
      }
    } else {
      result.template.general = appendToError(result.template.general, errorInfo.message);
    }
  }

  for (const details of error.details ?? []) {
    const { code, target, additionalInfo } = details;
    if (code === 'TemplateWorkflowValidationFailed') {
      const workflowName = target.split('/').slice(-1)[0];
      if (!result.workflows[workflowName]) {
        result.workflows[workflowName] = {};
      }

      for (const info of additionalInfo ?? []) {
        const { info: errorInfo } = info;
        if (
          ['TemplateWorkflowPropertyInvalid', 'TemplateWorkflowPropertyMissing', 'TemplateWorkflowPropertyEmpty'].includes(errorInfo.code)
        ) {
          if (!result.workflows[workflowName].manifest) {
            result.workflows[workflowName].manifest = {};
          }
          const propertySegments = errorInfo.target.split('.');
          propertySegments.shift();
          propertySegments.shift();
          let propertyName = propertySegments.shift();

          if (propertyName === 'manifest') {
            propertyName = propertySegments.shift() as string;

            if (workflowGeneralErrorProperties.includes(propertyName)) {
              result.workflows[workflowName].general = appendToError(result.workflows[workflowName].general, errorInfo.message);
            } else if (propertyName === 'connections') {
              result.template.connections = appendToError(result.template.connections, errorInfo.message);
            } else if (propertyName === 'parameters' && propertyName.match(regex)) {
              const parameterName = propertyName.match(regex)?.[0].replaceAll(/'/g, '') ?? '';
              if (!result.template.parameters) {
                result.template.parameters = {};
              }

              result.template.parameters[parameterName] = appendToError(result.template.parameters[parameterName], errorInfo.message);
            } else if (propertyName) {
              propertySegments.unshift(propertyName as string);
              propertyName = propertySegments.join('.');
              result.workflows[workflowName].manifest[propertyName] = appendToError(
                result.workflows[workflowName].manifest[propertyName],
                errorInfo.message
              );
            }
          }
        } else {
          result.workflows[workflowName].general = appendToError(result.workflows[workflowName].general, errorInfo.message);
        }
      }
    }
  }

  return result;
};

export const workflowsHaveErrors = (
  apiErrors: Record<string, WorkflowErrors>,
  workflowsData: Record<string, WorkflowTemplateData>
): boolean => {
  return (
    Object.values(workflowsData).some(
      (workflow) =>
        workflow.errors?.general ||
        workflow.errors?.kind ||
        workflow.errors?.workflow ||
        Object.values(workflow.errors?.manifest ?? {}).some((e) => e)
    ) ||
    Object.values(apiErrors).some(
      (apiError) => apiError?.general || apiError?.kind || apiError?.workflow || Object.values(apiError?.manifest ?? {}).some((e) => e)
    )
  );
};

const appendToError = (errorMessage: string, message: string): string => {
  return errorMessage ? `${errorMessage}, ${message}` : message;
};
