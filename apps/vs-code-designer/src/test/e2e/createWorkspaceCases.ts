import type { WorkspaceAppType, WorkspaceCreationCase, WorkflowType } from './createWorkspaceTypes';
import { uniqueName } from './testUtils';

export function filterCreationCases(cases: WorkspaceCreationCase[], caseFilter: string | undefined): WorkspaceCreationCase[] {
  if (!caseFilter) {
    return cases;
  }

  const labels = caseFilter
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
  return cases.filter((creationCase) => labels.includes(creationCase.label));
}

export function getReviewBackCases(): WorkspaceCreationCase[] {
  return [
    createWorkspaceCase('review-standard', 'standard', 'Logic app (Standard)', 'Stateful', 'clirvstd'),
    createWorkspaceCase('review-custom-code', 'customCode', 'Logic app with custom code', 'Stateful', 'clirvcc'),
    createWorkspaceCase('review-rules-engine', 'rulesEngine', 'Logic app with rules engine', 'Stateful', 'clirvre'),
  ];
}

export function getCoreCreationCases(): WorkspaceCreationCase[] {
  return [
    createWorkspaceCase('standard-stateful', 'standard', 'Logic app (Standard)', 'Stateful', 'clistdsf'),
    createWorkspaceCase('standard-stateless', 'standard', 'Logic app (Standard)', 'Stateless', 'clistdsl'),
    createWorkspaceCase('custom-code-stateful', 'customCode', 'Logic app with custom code', 'Stateful', 'cliccsf'),
    createWorkspaceCase('custom-code-stateless', 'customCode', 'Logic app with custom code', 'Stateless', 'cliccsl'),
    createWorkspaceCase('rules-engine-stateful', 'rulesEngine', 'Logic app with rules engine', 'Stateful', 'cliresf'),
    createWorkspaceCase('rules-engine-stateless', 'rulesEngine', 'Logic app with rules engine', 'Stateless', 'cliresl'),
  ];
}

export function getFixtureManifestCreationCases(): WorkspaceCreationCase[] {
  return [
    createWorkspaceCase('standard-stateful', 'standard', 'Logic app (Standard)', 'Stateful', 'clifixstdsf'),
    createWorkspaceCase('standard-stateless', 'standard', 'Logic app (Standard)', 'Stateless', 'clifixstdsl'),
    createWorkspaceCase('custom-code-stateful', 'customCode', 'Logic app with custom code', 'Stateful', 'clifixccsf'),
    createWorkspaceCase('rules-engine-stateful', 'rulesEngine', 'Logic app with rules engine', 'Stateful', 'clifixresf'),
  ];
}

export function getPreviewCreationCases(): WorkspaceCreationCase[] {
  return [
    createWorkspaceCase('standard-autonomous-agent', 'standard', 'Logic app (Standard)', 'Autonomous agents (Preview)', 'clistdaa'),
    createWorkspaceCase('standard-conversational-agent', 'standard', 'Logic app (Standard)', 'Conversational agents (Preview)', 'clistdca'),
    createWorkspaceCase(
      'custom-code-autonomous-agent',
      'customCode',
      'Logic app with custom code',
      'Autonomous agents (Preview)',
      'cliccaa'
    ),
    createWorkspaceCase(
      'custom-code-conversational-agent',
      'customCode',
      'Logic app with custom code',
      'Conversational agents (Preview)',
      'cliccca'
    ),
    createWorkspaceCase(
      'rules-engine-autonomous-agent',
      'rulesEngine',
      'Logic app with rules engine',
      'Autonomous agents (Preview)',
      'clireaa'
    ),
    createWorkspaceCase(
      'rules-engine-conversational-agent',
      'rulesEngine',
      'Logic app with rules engine',
      'Conversational agents (Preview)',
      'clireca'
    ),
  ];
}

export function getCodefulCreationCases(): WorkspaceCreationCase[] {
  const modern = createWorkspaceCase('codeful-modern-control', 'codeful', 'Logic app (codeful)', 'Stateful', 'clicodemodern');
  modern.codefulControlVariant = 'modern-control';

  const legacy = createWorkspaceCase('codeful-legacy-control', 'codeful', 'Logic app (codeful)', 'Stateful', 'clicodelegacy');
  legacy.codefulControlVariant = 'legacy-control';

  return [modern, legacy];
}

export function createWorkspaceCase(
  label: string,
  appType: WorkspaceAppType,
  radioLabel: string,
  workflowType: WorkflowType,
  prefix: string
): WorkspaceCreationCase {
  const baseName = uniqueName(prefix);
  const creationCase: WorkspaceCreationCase = {
    label,
    appType,
    radioLabel,
    wsName: `${baseName}ws`,
    appName: `${baseName}app`,
    wfName: `${baseName}wf`,
    workflowType,
  };

  if (appType === 'customCode' || appType === 'rulesEngine') {
    creationCase.functionFolderName = `${baseName}funcfolder`;
    creationCase.functionNamespace = appType === 'rulesEngine' ? 'RulesEngineNamespace' : 'MyCompany.Functions';
    creationCase.functionName = `${baseName}fn`;
  }

  return creationCase;
}
