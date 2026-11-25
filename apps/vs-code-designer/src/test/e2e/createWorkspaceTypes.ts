export type FieldLabels = string | string[];

export type WorkspaceAppType = 'standard' | 'customCode' | 'rulesEngine' | 'codeful';

export type CodefulControlVariant = 'modern-control' | 'legacy-control';

export type WorkflowType = 'Stateful' | 'Stateless' | 'Autonomous agents (Preview)' | 'Conversational agents (Preview)';

export interface WorkspaceCreationCase {
  label: string;
  appType: WorkspaceAppType;
  radioLabel: string;
  wsName: string;
  appName: string;
  wfName: string;
  workflowType: WorkflowType;
  functionFolderName?: string;
  functionNamespace?: string;
  functionName?: string;
  codefulControlVariant?: CodefulControlVariant;
}
