import { Button, Checkbox, Field, Input, Spinner } from '@fluentui/react-components';
import { ArrowRightRegular, CheckmarkRegular, DocumentRegular, FolderRegular, InfoRegular } from '@fluentui/react-icons';
import {
  ExtensionCommand,
  OpenBehavior,
  Platform,
  ProjectType,
  TargetFramework,
  WorkflowType,
  isCsharpIdentifier,
  isCsharpNamespace,
} from '@microsoft/vscode-extension-logic-apps';
import { useContext, useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntlFormatters, useIntlMessages } from '../../intl';
import { commonMessages, workspaceMessages, workspaceWizardMessages } from '../../intl/messages';
import { setError, setLoading, setProjectPath, setWorkspaceName } from '../../state/createWorkspaceSlice';
import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { useCreateWorkspaceStyles } from './createWorkspaceStyles';
import { isWorkspaceDescendantOfCurrentFolder, joinPath, nameValidation, validateWorkflowName } from './utils/validation';

type ProjectKey = 'logicApp' | 'customCode' | 'dataMap';
type Step = 'workspace' | ProjectKey | 'review';
interface ProjectForm {
  logicAppType: string;
  logicAppName: string;
  workflowName: string;
  workflowType: string;
  customCodeType: 'customCode' | 'rulesEngine';
  targetFramework: string;
  functionFolderName: string;
  functionNamespace: string;
  functionName: string;
  dataMapName: string;
  dataMapFolderName: string;
}
type TextFieldKey = Exclude<keyof ProjectForm, 'logicAppType' | 'workflowType' | 'customCodeType' | 'targetFramework'>;

export const WorkspaceWizard = () => {
  const styles = useCreateWorkspaceStyles();
  const text = useIntlMessages(workspaceWizardMessages);
  const common = useIntlMessages(commonMessages);
  const legacy = useIntlMessages(workspaceMessages);
  const format = useIntlFormatters(workspaceMessages);
  const wizardFormat = useIntlFormatters(workspaceWizardMessages);
  const vscode = useContext(VSCodeContext);
  const dispatch = useDispatch();
  const state = useSelector((root: RootState) => root.createWorkspace);
  const { workspaceName, workspaceProjectPath, separator, platform, pathValidationResults, workspaceExistenceResults, isLoading, error } =
    state;
  const [selected, setSelected] = useState({ logicApp: true, customCode: false, dataMap: false });
  const [step, setStep] = useState<Step>('workspace');
  const [openNewWindow, setOpenNewWindow] = useState(true);
  const [touched, setTouched] = useState<string[]>([]);
  const targetFrameworkHintId = useId();
  const submitted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const [form, setForm] = useState<ProjectForm>({
    logicAppType: state.logicAppType === ProjectType.codeful ? ProjectType.codeful : ProjectType.logicApp,
    logicAppName: state.logicAppName || 'LogicApp',
    workflowName: state.workflowName || 'Workflow',
    workflowType: [WorkflowType.stateful, WorkflowType.stateless, WorkflowType.agentic, WorkflowType.agent].some(
      (type) => type === state.workflowType
    )
      ? state.workflowType
      : WorkflowType.stateful,
    customCodeType: ProjectType.customCode,
    targetFramework: TargetFramework.Net8,
    functionFolderName: state.functionFolderName || 'custom-code',
    functionNamespace: state.functionNamespace || 'Contoso.Functions',
    functionName: state.functionName || 'Run',
    dataMapName: 'DataMap',
    dataMapFolderName: 'data-map',
  });
  const projectKeys: ProjectKey[] = ['logicApp', 'customCode', 'dataMap'];
  const isRulesEngine = form.customCodeType === ProjectType.rulesEngine;
  const steps: Step[] = ['workspace', ...projectKeys.filter((key) => selected[key]), 'review'];
  const labels: Record<Step, string> = {
    workspace: text.WORKSPACE,
    logicApp: text.LOGIC_APP,
    customCode: text.CUSTOM_CODE,
    dataMap: text.DATA_MAP,
    review: text.REVIEW,
  };
  const titles: Record<Step, string> = {
    workspace: text.WORKSPACE_TITLE,
    logicApp: text.LOGIC_APP_TITLE,
    customCode: isRulesEngine ? text.RULES_TITLE : text.CODE_TITLE,
    dataMap: text.MAP_TITLE,
    review: text.REVIEW_TITLE,
  };
  const activeIndex = steps.indexOf(step);
  const parentPath = workspaceProjectPath.fsPath;
  const workspacePath = joinPath(parentPath, workspaceName, separator);
  const workspaceFile = joinPath(workspacePath, `${workspaceName}.code-workspace`, separator);
  const projectDescriptions: Record<ProjectKey, string> = {
    logicApp: text.LOGIC_APP_DESCRIPTION,
    customCode: text.CUSTOM_CODE_PROJECT_DESCRIPTION,
    dataMap: text.MAP_DESCRIPTION,
  };
  const workflowTypes: Record<string, string> = {
    [WorkflowType.stateful]: legacy.STATEFUL_TITLE,
    [WorkflowType.stateless]: legacy.STATELESS_TITLE,
    [WorkflowType.agentic]: legacy.AUTONOMOUS_TITLE,
    [WorkflowType.agent]: legacy.AGENT_TITLE,
  };
  const targetFrameworkOptions = [
    ...(platform === Platform.windows
      ? [{ value: TargetFramework.NetFx, label: legacy.DOTNET_FRAMEWORK_OPTION, description: legacy.DOTNET_FRAMEWORK_DESCRIPTION }]
      : []),
    { value: TargetFramework.Net8, label: legacy.DOTNET_8, description: legacy.DOTNET_8_DESCRIPTION },
  ];
  const selectedTargetFramework = targetFrameworkOptions.find((option) => option.value === form.targetFramework);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (parentPath && !(parentPath in pathValidationResults)) {
        vscode.postMessage({ command: ExtensionCommand.validatePath, data: { path: parentPath } });
      }
      if (parentPath && workspaceName && nameValidation.test(workspaceName)) {
        for (const [path, type] of [
          [workspacePath, ExtensionCommand.workspace_folder],
          [workspaceFile, ExtensionCommand.workspace_file],
        ]) {
          if (!(path in workspaceExistenceResults)) {
            vscode.postMessage({ command: ExtensionCommand.validatePath, data: { path, type } });
          }
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [parentPath, workspaceName, workspacePath, workspaceFile, pathValidationResults, workspaceExistenceResults, vscode]);

  useEffect(() => {
    if (previousStep.current !== step) {
      heading.current?.focus();
      previousStep.current = step;
    }
  }, [step]);

  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      if (event.data?.command === ExtensionCommand.createWorkspace && typeof event.data.error === 'string') {
        submitted.current = false;
        dispatch(setLoading(false));
        dispatch(setError(event.data.error));
      }
    };
    window.addEventListener('message', receiveMessage);
    return () => window.removeEventListener('message', receiveMessage);
  }, [dispatch]);

  function updateForm<Key extends keyof ProjectForm>(key: Key, value: ProjectForm[Key]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  const folders = [
    ...(selected.logicApp ? [form.logicAppName] : []),
    ...(selected.customCode ? [form.functionFolderName] : []),
    ...(selected.dataMap ? [form.dataMapFolderName] : []),
  ].map((folder) => folder.toLowerCase());
  const validProjectName = (value: string) =>
    nameValidation.test(value) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(value) && value.length <= 240;
  const nameError = (value: string) => (validProjectName(value) ? undefined : text.INVALID_NAME);
  const folderCollisionError = (value: string) => {
    const normalized = value.toLowerCase();
    const overlaps =
      folders.filter((folder) => folder === normalized).length > 1 ||
      folders.some((folder) => folder !== normalized && (folder.startsWith(`${normalized}/`) || normalized.startsWith(`${folder}/`)));
    return overlaps ? text.FOLDER_COLLISION : undefined;
  };
  const folderError = (value: string, allowNested = false) => {
    const invalidName = allowNested
      ? value.length > 240 || value.split('/').some((segment) => nameError(segment))
        ? text.INVALID_PROJECT_PATH
        : undefined
      : nameError(value);
    return invalidName || folderCollisionError(value);
  };
  const errors: Partial<Record<TextFieldKey, string | undefined>> = {
    logicAppName:
      (form.logicAppType === ProjectType.codeful
        ? isCsharpNamespace(form.logicAppName)
          ? undefined
          : text.INVALID_NAMESPACE
        : nameError(form.logicAppName)) || folderCollisionError(form.logicAppName),
    workflowName:
      (form.logicAppType === ProjectType.codeful &&
      (!isCsharpIdentifier(form.workflowName) || form.workflowName.toLowerCase() === 'program')
        ? text.INVALID_IDENTIFIER
        : undefined) ||
      (['bin', 'obj'].includes(form.workflowName.toLowerCase()) ? legacy.WORKFLOW_NAME_RESERVED : undefined) ||
      validateWorkflowName(form.workflowName, legacy),
    functionFolderName: folderError(form.functionFolderName),
    functionNamespace: isCsharpNamespace(form.functionNamespace) ? undefined : text.INVALID_NAMESPACE,
    functionName:
      isCsharpIdentifier(form.functionName) &&
      form.functionName.toLowerCase() !== 'program' &&
      !(form.customCodeType === ProjectType.rulesEngine && form.functionName.toLowerCase() === 'contosopurchase')
        ? undefined
        : text.INVALID_IDENTIFIER,
    dataMapName: nameError(form.dataMapName),
    dataMapFolderName: folderError(form.dataMapFolderName, true),
  };
  const workspaceNameError =
    nameError(workspaceName) ||
    (workspaceExistenceResults[workspacePath] === true || workspaceExistenceResults[workspaceFile] === true
      ? text.WORKSPACE_EXISTS
      : undefined) ||
    (isWorkspaceDescendantOfCurrentFolder(parentPath, workspaceName, state.currentFolderPath, separator, platform)
      ? text.WORKSPACE_NESTED
      : undefined);
  const workspaceValid =
    !workspaceNameError &&
    pathValidationResults[parentPath] === true &&
    workspaceExistenceResults[workspacePath] === false &&
    workspaceExistenceResults[workspaceFile] === false &&
    projectKeys.some((key) => selected[key]);

  function isStepValid(candidate: Step): boolean {
    switch (candidate) {
      case 'workspace':
        return workspaceValid;
      case 'logicApp':
        return !errors.logicAppName && !errors.workflowName;
      case 'customCode':
        return (
          !errors.functionFolderName &&
          !errors.functionNamespace &&
          !errors.functionName &&
          (form.customCodeType !== ProjectType.rulesEngine || platform === Platform.windows)
        );
      case 'dataMap':
        return !errors.dataMapName && !errors.dataMapFolderName;
      case 'review':
        return steps.filter((candidateStep) => candidateStep !== 'review').every(isStepValid);
    }
  }

  const canNavigate = (index: number) => index <= activeIndex || steps.slice(0, index).every(isStepValid);
  const touch = (key: string) => setTouched((previous) => (previous.includes(key) ? previous : [...previous, key]));
  const textField = (key: TextFieldKey, label: string, hint?: string) => (
    <Field
      label={label}
      hint={hint}
      required
      validationState={touched.includes(key) && errors[key] ? 'error' : 'none'}
      validationMessage={touched.includes(key) ? errors[key] : undefined}
    >
      <Input value={form[key]} onChange={(_event, data) => updateForm(key, data.value)} onBlur={() => touch(key)} disabled={isLoading} />
    </Field>
  );
  const notice = (message: string) => (
    <div className={styles.wizardNotice}>
      <InfoRegular />
      <span>{message}</span>
    </div>
  );
  const preview = (
    <aside className={styles.wizardAside} aria-label={step === 'review' ? text.WILL_CREATE : text.PREVIEW}>
      <h3>{step === 'review' ? text.WILL_CREATE : text.PREVIEW}</h3>
      <FolderRegular />
      <code>{workspaceName || text.NEW_WORKSPACE}/</code>
      <ul>
        {selected.logicApp && (
          <li>
            <FolderRegular />
            <code>{form.logicAppName}/</code>
            <ul>
              <li>
                <FolderRegular />
                <code>
                  {form.workflowName}
                  {form.logicAppType === ProjectType.codeful ? '.cs' : '/'}
                </code>
              </li>
            </ul>
          </li>
        )}
        {selected.customCode && (
          <li>
            <FolderRegular />
            <code>{form.functionFolderName}/</code>
            <ul>
              <li>
                <DocumentRegular />
                <code>{form.functionName}.cs</code>
              </li>
            </ul>
          </li>
        )}
        {selected.dataMap && (
          <li>
            <FolderRegular />
            <code>{form.dataMapFolderName}/</code>
            <ul>
              <li>
                <DocumentRegular />
                <code>{form.dataMapName}.btm</code>
              </li>
              <li>
                <FolderRegular />
                <code>Schemas/</code>
              </li>
              <li>
                <FolderRegular />
                <code>__generated/</code>
              </li>
            </ul>
          </li>
        )}
        <li>
          <DocumentRegular />
          <code>{workspaceName || text.NEW_WORKSPACE}.code-workspace</code>
        </li>
      </ul>
    </aside>
  );
  const projectSummary = (key: ProjectKey, children: React.ReactNode) => (
    <section aria-label={labels[key]}>
      <div className={styles.wizardReviewHeading}>
        <h3>{labels[key]}</h3>
        <Button appearance="transparent" onClick={() => setStep(key)} disabled={isLoading} aria-label={`${text.EDIT} ${labels[key]}`}>
          {text.EDIT}
        </Button>
      </div>
      {children}
    </section>
  );
  const frameworkLabel = form.targetFramework === TargetFramework.NetFx ? legacy.DOTNET_FRAMEWORK_OPTION : legacy.DOTNET_8;

  const create = () => {
    if (submitted.current || isLoading || !isStepValid('review')) {
      return;
    }
    submitted.current = true;
    dispatch(setError(undefined));
    dispatch(setLoading(true));
    vscode.postMessage({
      command: ExtensionCommand.createWorkspace,
      data: {
        workspaceProjectPath,
        workspaceName,
        selectedProjects: selected,
        openBehavior: openNewWindow ? OpenBehavior.openInNewWindow : OpenBehavior.openInCurrentWindow,
        isDevContainerProject: false,
        ...(selected.logicApp
          ? {
              logicAppType: form.logicAppType,
              logicAppName: form.logicAppName,
              logicAppFolderName: form.logicAppName,
              workflowName: form.workflowName,
              workflowType: form.workflowType,
            }
          : {}),
        ...(selected.customCode
          ? {
              customCodeType: form.customCodeType,
              targetFramework: form.targetFramework,
              functionFolderName: form.functionFolderName,
              functionNamespace: form.functionNamespace,
              functionName: form.functionName,
            }
          : {}),
        ...(selected.dataMap ? { dataMapName: form.dataMapName, dataMapFolderName: form.dataMapFolderName } : {}),
      },
    });
  };

  if (state.isComplete) {
    return (
      <div className={styles.wizard}>
        <main className={styles.wizardBody}>
          <h1>{text.COMPLETE}</h1>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.wizard}>
      <header className={styles.wizardHeader}>
        <div>
          <div className={styles.wizardMuted}>{text.BRAND}</div>
          <h1>{text.TITLE}</h1>
        </div>
        <div className={styles.wizardMuted}>
          {workspaceName ? `${workspaceName} / ` : ''}
          {text.NEW_WORKSPACE}
        </div>
      </header>
      <nav className={styles.wizardProgress} aria-label={text.SETUP}>
        <div className={`${styles.wizardProgressCaption} ${styles.wizardMuted}`}>
          <span>{text.SETUP}</span>
          <span>{format.STEP_INDICATOR({ current: activeIndex + 1, total: steps.length })}</span>
        </div>
        <div className={styles.wizardSteps}>
          {steps.map((candidate, index) => (
            <Button
              key={candidate}
              appearance="transparent"
              aria-current={candidate === step ? 'step' : undefined}
              disabled={isLoading || !canNavigate(index)}
              onClick={() => setStep(candidate)}
            >
              <span className={styles.wizardStepNumber}>
                {index < activeIndex && isStepValid(candidate) ? <CheckmarkRegular /> : index + 1}
              </span>
              {labels[candidate]}
            </Button>
          ))}
        </div>
      </nav>
      <main className={styles.wizardBody}>
        <h2 tabIndex={-1} ref={heading}>
          {titles[step]}
        </h2>
        {step === 'customCode' && isRulesEngine && <p className={styles.wizardMuted}>{text.RULES_INTRO}</p>}
        {step === 'dataMap' && <p className={styles.wizardMuted}>{text.MAP_INTRO}</p>}
        {step === 'workspace' ? (
          <>
            <p className={styles.wizardMuted}>{text.WORKSPACE_DESCRIPTION}</p>
            <h3>{text.WORKSPACE_DETAILS}</h3>
            <div className={styles.wizardLocationFields}>
              <Field
                label={text.WORKSPACE_NAME}
                hint={text.WORKSPACE_NAME_HINT}
                required
                validationState={touched.includes('workspaceName') && workspaceNameError ? 'error' : 'none'}
                validationMessage={touched.includes('workspaceName') ? workspaceNameError : undefined}
              >
                <Input
                  value={workspaceName}
                  onChange={(_event, data) => dispatch(setWorkspaceName(data.value))}
                  onBlur={() => touch('workspaceName')}
                  disabled={isLoading}
                />
              </Field>
              <Field
                label={text.PARENT_FOLDER}
                hint={text.PARENT_FOLDER_HINT}
                required
                validationState={pathValidationResults[parentPath] === false ? 'error' : 'none'}
                validationMessage={pathValidationResults[parentPath] === false ? text.PATH_INVALID : undefined}
              >
                <div className={styles.wizardBrowse}>
                  <Input value={parentPath} onChange={(_event, data) => dispatch(setProjectPath(data.value))} disabled={isLoading} />
                  <Button disabled={isLoading} onClick={() => vscode.postMessage({ command: ExtensionCommand.select_folder })}>
                    {common.BROWSE}...
                  </Button>
                </div>
              </Field>
            </div>
            <h3>{text.PROJECTS}</h3>
            <p className={styles.wizardMuted}>{text.PROJECTS_DESCRIPTION}</p>
            <div className={styles.wizardChoices}>
              {projectKeys.map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    aria-label={labels[key]}
                    checked={selected[key]}
                    disabled={isLoading}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSelected((previous) => ({
                        ...previous,
                        [key]: checked,
                        ...(key === 'customCode' && checked ? { logicApp: true } : {}),
                        ...(key === 'logicApp' && !checked ? { customCode: false } : {}),
                      }));
                    }}
                  />
                  <span>
                    <strong>{labels[key]}</strong>
                    <small>{projectDescriptions[key]}</small>
                  </span>
                </label>
              ))}
            </div>
            {!projectKeys.some((key) => selected[key]) && (
              <div role="alert" className={styles.errorMessage}>
                {text.AT_LEAST_ONE}
              </div>
            )}
            {notice(text.PROJECTS_INFO)}
            {parentPath && workspaceName && !workspaceNameError && !workspaceValid && notice(text.CHECKING)}
            <div className={`${styles.wizardPath} ${styles.wizardMuted}`}>
              <span>{text.LOCATION}</span>
              <code>{parentPath && workspaceName ? workspacePath : ''}</code>
            </div>
          </>
        ) : (
          <div className={styles.wizardColumns}>
            <div>
              {step === 'logicApp' && (
                <>
                  <section className={styles.wizardSection}>
                    <h3>{text.LOGIC_APP_PROJECT}</h3>
                    <div role="radiogroup" aria-label={text.LOGIC_APP_PROJECT} className={styles.wizardChoices}>
                      {[
                        { value: ProjectType.logicApp, label: text.STANDARD, description: text.STANDARD_DESCRIPTION },
                        { value: ProjectType.codeful, label: text.CODEFUL, description: text.CODEFUL_DESCRIPTION },
                      ].map((option) => (
                        <label key={option.value}>
                          <input
                            type="radio"
                            name="logicAppType"
                            value={option.value}
                            aria-label={option.label}
                            checked={form.logicAppType === option.value}
                            disabled={isLoading}
                            onChange={() => {
                              updateForm('logicAppType', option.value);
                              if (option.value === ProjectType.codeful) {
                                updateForm('workflowType', WorkflowType.stateful);
                              }
                            }}
                          />
                          <span>
                            <strong>{option.label}</strong>
                            <small>{option.description}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                    {textField('logicAppName', text.LOGIC_APP_NAME)}
                  </section>
                  <section className={styles.wizardSection}>
                    <h3>{text.INITIAL_WORKFLOW}</h3>
                    {textField('workflowName', text.WORKFLOW_NAME)}
                    <div className={styles.wizardFields} style={{ marginTop: 16 }}>
                      <Field label={text.WORKFLOW_TYPE} required>
                        <select
                          aria-label={text.WORKFLOW_TYPE}
                          className={styles.wizardSelect}
                          value={form.workflowType}
                          disabled={isLoading || form.logicAppType === ProjectType.codeful}
                          onChange={(event) => updateForm('workflowType', event.target.value)}
                        >
                          {Object.entries(workflowTypes)
                            .filter(([value]) => form.logicAppType !== ProjectType.codeful || value === WorkflowType.stateful)
                            .map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                        </select>
                      </Field>
                    </div>
                    {form.logicAppType === ProjectType.codeful && notice(text.CODEFUL_LIMIT)}
                  </section>
                </>
              )}
              {step === 'customCode' && (
                <>
                  <h3>{text.SUBTYPE}</h3>
                  <p className={styles.wizardMuted}>{text.SUBTYPE_DESCRIPTION}</p>
                  <div role="radiogroup" aria-label={text.SUBTYPE} className={styles.wizardChoices}>
                    {[
                      { value: ProjectType.customCode, label: text.CUSTOM_CODE, description: text.CODE_SUBTYPE_DESCRIPTION },
                      { value: ProjectType.rulesEngine, label: text.RULES, description: text.RULES_DESCRIPTION },
                    ].map((option) => (
                      <label key={option.value}>
                        <input
                          type="radio"
                          name="customCodeType"
                          aria-label={option.label}
                          checked={form.customCodeType === option.value}
                          disabled={isLoading || (option.value === ProjectType.rulesEngine && platform !== Platform.windows)}
                          onChange={() => {
                            updateForm('customCodeType', option.value);
                            updateForm(
                              'targetFramework',
                              option.value === ProjectType.rulesEngine ? TargetFramework.NetFx : TargetFramework.Net8
                            );
                          }}
                        />
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <h3>{isRulesEngine ? text.RULES_CONFIG : text.CODE_CONFIG}</h3>
                  <div className={styles.wizardFields} style={isRulesEngine ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
                    {!isRulesEngine && (
                      <Field
                        label={text.NET_VERSION}
                        hint={{ id: targetFrameworkHintId, children: selectedTargetFramework?.description }}
                        required
                      >
                        <select
                          aria-label={text.NET_VERSION}
                          aria-describedby={targetFrameworkHintId}
                          className={styles.wizardSelect}
                          value={form.targetFramework}
                          disabled={isLoading}
                          onChange={(event) => updateForm('targetFramework', event.target.value)}
                        >
                          {targetFrameworkOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    {textField('functionFolderName', isRulesEngine ? text.RULES_FOLDER : text.CODE_FOLDER)}
                    {textField('functionNamespace', text.NAMESPACE, isRulesEngine ? text.NAMESPACE_HINT : undefined)}
                    {textField('functionName', text.FUNCTION)}
                  </div>
                  {form.customCodeType === ProjectType.rulesEngine && notice(text.RULES_LIMIT)}
                  <div className={styles.wizardPath}>
                    <span>{text.GENERATED_FUNCTION}</span>
                    <code>
                      {form.functionFolderName}/{form.functionName}.cs
                    </code>
                  </div>
                </>
              )}
              {step === 'dataMap' && (
                <>
                  <h3>{text.MAP_PROJECT}</h3>
                  <p className={styles.wizardMuted}>{text.MAP_PROJECT_DESCRIPTION}</p>
                  <div className={styles.wizardFields} style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                    {textField('dataMapFolderName', text.MAP_NAME, text.MAP_PROJECT_HINT)}
                    {textField('dataMapName', text.MAP_FILE_NAME, wizardFormat.MAP_FILE_HINT({ mapName: form.dataMapName }))}
                  </div>
                  {notice(text.MAP_STRUCTURE)}
                </>
              )}
              {step === 'review' && (
                <>
                  <div className={styles.wizardReviewHeading}>
                    <div>
                      <strong>{workspaceName}</strong>
                      <p className={styles.wizardMuted}>{workspacePath}</p>
                    </div>
                    <Button appearance="transparent" disabled={isLoading} onClick={() => setStep('workspace')}>
                      {text.EDIT_WORKSPACE}
                    </Button>
                  </div>
                  <div className={styles.wizardReview}>
                    {selected.logicApp &&
                      projectSummary(
                        'logicApp',
                        <>
                          <p>
                            {form.logicAppName}/ · {form.logicAppType === ProjectType.codeful ? text.CODEFUL : text.STANDARD}
                          </p>
                          <p className={styles.wizardMuted}>
                            {form.workflowName} · {workflowTypes[form.workflowType]}
                          </p>
                        </>
                      )}
                    {selected.customCode &&
                      projectSummary(
                        'customCode',
                        <>
                          <p>
                            {form.functionFolderName}/ · {frameworkLabel} ·{' '}
                            {form.customCodeType === ProjectType.rulesEngine ? text.RULES : text.CUSTOM_CODE}
                          </p>
                          <p className={styles.wizardMuted}>
                            {form.functionNamespace}.{form.functionName}
                          </p>
                        </>
                      )}
                    {selected.dataMap &&
                      projectSummary(
                        'dataMap',
                        <p>
                          {form.dataMapFolderName}/ · {form.dataMapName}.btm
                        </p>
                      )}
                  </div>
                  <Checkbox
                    checked={openNewWindow}
                    disabled={isLoading}
                    label={text.OPEN_NEW}
                    onChange={(_event, data) => setOpenNewWindow(data.checked === true)}
                  />
                  {notice(text.LOCAL_ONLY)}
                </>
              )}
            </div>
            {preview}
          </div>
        )}
        {error && (
          <div role="alert" className={styles.errorMessage}>
            {error}
          </div>
        )}
      </main>
      <footer className={styles.wizardFooter}>
        <span className={styles.wizardMuted}>{text.REQUIRED}</span>
        <div>
          <Button
            appearance="transparent"
            disabled={isLoading}
            onClick={() => vscode.postMessage({ command: ExtensionCommand.close_panel })}
          >
            {common.CANCEL}
          </Button>
          {activeIndex > 0 && (
            <Button disabled={isLoading} onClick={() => setStep(steps[activeIndex - 1])}>
              {common.BACK}
            </Button>
          )}
          {step === 'review' ? (
            <Button appearance="primary" disabled={isLoading || !isStepValid('review')} onClick={create}>
              {isLoading ? (
                <>
                  <Spinner size="tiny" />
                  {text.CREATING}
                </>
              ) : (
                text.CREATE
              )}
            </Button>
          ) : (
            <Button
              appearance="primary"
              disabled={isLoading || !isStepValid(step)}
              icon={<ArrowRightRegular />}
              iconPosition="after"
              onClick={() => setStep(steps[activeIndex + 1])}
            >
              {common.NEXT}: {labels[steps[activeIndex + 1]]}
            </Button>
          )}
        </div>
      </footer>
      <div className={styles.wizardStatus}>{text.NO_SIGN_IN}</div>
    </div>
  );
};
