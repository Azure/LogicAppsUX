import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import {
  Text,
  Link,
  MessageBar,
  MessageBarBody,
  Dropdown,
  Option,
  Field,
  Input,
  Label,
  Tooltip,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  createTableColumn,
  Badge,
  mergeClasses,
} from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';
import type { TableColumnDefinition } from '@fluentui/react-components';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';

import constants from '../../../../../common/constants';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { useHostOptions } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { setAgentHarnessSandboxConfigurationId } from '../../../../../core/state/operation/operationMetadataSlice';
import { useAgentHarnessTabStyles } from './agentHarnessTab.styles';
import { ValueSegmentType } from '@microsoft/designer-ui';
import { WorkflowService } from '@microsoft/logic-apps-shared';

// FX expression token colors
const FX_BRAND_COLOR = '#AD008C';
const FX_ICON =
  'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzNCAzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIGZpbGw9IiNhZDAwOGMiLz4NCiA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTMuNDg3LDEzLjI0OGE3LjA1NCw3LjA1NCwwLDAsMSwxLjg0OS0zLjY5QTUuMyw1LjMsMCwwLDEsMTguNTkzLDcuOWMuOTg1LDAsMS40NjcuNTg1LDEuNDQ3LDEuMDY5YTEuNTUxLDEuNTUxLDAsMCwxLS43NDQsMS4xNDkuNDA2LjQwNiwwLDAsMS0uNTQzLS4wNjFjLS41NDMtLjY2NS0xLjAwNS0xLjA2OS0xLjM2Ny0xLjA2OS0uNC0uMDItLjc2NC4yODItMS40MDcsNC4yNTVoMi4zMzJsLS40MjIuODA3LTIuMDkuMTYxYy0uMzQyLDEuODM1LS42LDMuNjMtMS4xNDYsNS45MDgtLjc4NCwzLjMyNy0xLjY4OCw0LjY1OC0zLjEsNS44MjdBMy43NDYsMy43NDYsMCwwLDEsOS4zNDcsMjdDOC42ODMsMjcsOCwyNi41NTYsOCwyNi4wMzJhMS42OTIsMS42OTIsMCwwLDEsLjcyNC0xLjE0OWMuMTYxLS4xMjEuMjgxLS4xNDEuNDIyLS4wNGEyLjg3MywyLjg3MywwLDAsMCwxLjU2OC43MDYuNjc1LjY3NSwwLDAsMCwuNjYzLS41LDI3LjQyNywyNy40MjcsMCwwLDAsLjg0NC00LjE3NGMuNDYyLTIuNzYyLjc0NC00LjY1OCwxLjA4NS02LjY1NEgxMS43bC0uMS0uMi42ODMtLjc2NloiLz4NCiA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTcuMzIxLDE4LjljLjgxMi0xLjE4MywxLjY1NC0xLjg3NCwyLjIzNi0xLjg3NC40OSwwLC43MzUuNTIyLDEuMDU3LDEuNDlsLjIzLjcyMmMxLjE2NC0xLjY3NSwxLjczMS0yLjIxMiwyLjQtMi4yMTJhLjc0Mi43NDIsMCwwLDEsLjc1MS44NDUuOTIyLjkyMiwwLDAsMS0uOC44NzYuNDE0LjQxNCwwLDAsMS0uMjkxLS4xNjkuNDc3LjQ3NywwLDAsMC0uMzY4LS4xODRjLS4xNTMsMC0uMzM3LjEwOC0uNjEzLjM4NGE4LjU0Nyw4LjU0NywwLDAsMC0uODczLDEuMDc1bC42MTMsMS45NjZjLjE4NC42My4zNjcuOTUyLjU2Ny45NTIuMTg0LDAsLjUwNi0uMjQ2LDEuMDQyLS44OTFsLjMyMi4zODRjLS45LDEuNDI5LTEuNzYxLDEuOTItMi4zNDMsMS45Mi0uNTIxLDAtLjg1OC0uNDMtMS4xOC0xLjQ5bC0uMzUyLTEuMTY4Yy0xLjE3OSwxLjkyLTEuNzQ2LDIuNjU4LTIuNTQzLDIuNjU4YS44MTUuODE1LDAsMCwxLS44MTItLjg3NS45LjksMCwwLDEsLjc2Ni0uOTIyLjQ5My40OTMsMCwwLDEsLjI5MS4xNTQuNTE0LjUxNCwwLDAsMCwuMzY4LjE2OWMuMzM3LDAsLjk1LS42NzYsMS43MTUtMS44NTlsLS40LTEuMzY3Yy0uMjc2LS45MDYtLjQxNC0xLjAxNC0uNTY3LTEuMDE0LS4xMzgsMC0uNDE0LjItLjg4OC44MTRaIi8+DQo8L3N2Zz4NCg==';

// Types for agent harness data
interface AgentHarnessInputFile {
  name: string;
  content: string;
  contentType?: string;
}

interface AgentHarnessSkill {
  repository: string;
  folders: string[];
}

interface AgentHarnessData {
  type?: string;
  sandboxConfigurationId?: string;
  inputFiles?: AgentHarnessInputFile[];
  skills?: AgentHarnessSkill[];
}

const AGENT_HARNESS_PARAMETER_KEY = 'inputs.$.agentModelSettings.agentHarness';

/**
 * Reads the agentHarness data from the manifest-parsed parameters store.
 */
const useAgentHarnessData = (nodeId: string): AgentHarnessData => {
  const parameterValueSegments = useSelector((state: RootState) => {
    const nodeInputs = state.operations.inputParameters[nodeId];
    if (!nodeInputs) {
      return undefined;
    }
    for (const group of Object.values(nodeInputs.parameterGroups)) {
      const param = group.parameters.find((p) => p.parameterKey === AGENT_HARNESS_PARAMETER_KEY);
      if (param) {
        return param.value;
      }
    }
    return undefined;
  });

  return useMemo(() => {
    const firstSegment = parameterValueSegments?.[0];
    if (!firstSegment) {
      return {};
    }
    if (typeof firstSegment.value === 'object' && firstSegment.value !== null) {
      return firstSegment.value as AgentHarnessData;
    }
    if (firstSegment.type === ValueSegmentType.LITERAL && typeof firstSegment.value === 'string' && firstSegment.value.length > 0) {
      try {
        return JSON.parse(firstSegment.value) as AgentHarnessData;
      } catch {
        return {};
      }
    }
    return {};
  }, [parameterValueSegments]);
};

/**
 * Hook to fetch sandbox configurations from the integration account.
 */
const useSandboxConfigurations = (integrationAccountId: string | undefined) => {
  return useQuery(
    ['sandboxConfigurations', integrationAccountId],
    async () => {
      const workflowService = WorkflowService();
      if (!workflowService.getSandboxConfigurations || !integrationAccountId) {
        return [];
      }
      return workflowService.getSandboxConfigurations(integrationAccountId);
    },
    {
      enabled: !!integrationAccountId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
};

/**
 * Extracts a display title from a Logic Apps expression.
 */
const getExpressionTitle = (expression: string): string => {
  let inner = expression.trim();
  if (inner.startsWith('@{') && inner.endsWith('}')) {
    inner = inner.slice(2, -1);
  } else if (inner.startsWith('@')) {
    inner = inner.slice(1);
  }
  const singleArgMatch = inner.match(/^(variables|parameters)\('([^']+)'\)$/i);
  if (singleArgMatch) {
    return singleArgMatch[2];
  }
  const actionArgMatch = inner.match(/^(body|outputs)\('([^']+)'\)$/i);
  if (actionArgMatch) {
    return `${actionArgMatch[1]} - ${actionArgMatch[2]}`;
  }
  return inner;
};

/**
 * A lightweight read-only token pill that renders an expression as a colored badge.
 */
const ExpressionTokenPill: React.FC<{ expression: string; className?: string }> = ({ expression, className }) => {
  const title = getExpressionTitle(expression);
  return (
    <span className={className} title={expression} style={{ backgroundColor: `${FX_BRAND_COLOR}26` }} aria-label={title}>
      <span className="expression-token-icon" style={{ backgroundImage: `url(${FX_ICON})` }} aria-hidden="true" />
      <span className="expression-token-title">{title}</span>
    </span>
  );
};

/**
 * Returns true if the string looks like a Logic Apps expression.
 */
const isExpression = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.startsWith('@');
};

/**
 * Extract the `detail` field from an ADC error message's embedded JSON response.
 */
const extractErrorDetail = (errorMessage?: string): string | undefined => {
  if (!errorMessage) {
    return undefined;
  }
  const firstBrace = errorMessage.indexOf('{');
  const lastBrace = errorMessage.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(errorMessage.slice(firstBrace, lastBrace + 1));
    return typeof parsed?.detail === 'string' ? parsed.detail : undefined;
  } catch {
    return undefined;
  }
};

// DataGrid column definitions for Input Files
interface InputFileRow {
  name: string;
  content: string;
}

const InputFileContentCell: React.FC<{ content: string }> = ({ content }) => {
  const styles = useAgentHarnessTabStyles();
  if (isExpression(content)) {
    return <ExpressionTokenPill expression={content} className={styles.tokenPill} />;
  }
  return <Text>{content}</Text>;
};

const inputFileColumns: TableColumnDefinition<InputFileRow>[] = [
  createTableColumn<InputFileRow>({
    columnId: 'name',
    renderHeaderCell: () => 'File Name',
    renderCell: (item) => <Text>{item.name}</Text>,
  }),
  createTableColumn<InputFileRow>({
    columnId: 'content',
    renderHeaderCell: () => 'Content (dynamic)',
    renderCell: (item) => <InputFileContentCell content={item.content} />,
  }),
];

export const AgentHarnessTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId } = props;
  const intl = useIntl();
  const styles = useAgentHarnessTabStyles();
  const dispatch = useDispatch<AppDispatch>();
  const hostOptions = useHostOptions();
  const integrationAccount = hostOptions.integrationAccount;

  const harnessData = useAgentHarnessData(nodeId);
  const { data: sandboxConfigurations } = useSandboxConfigurations(integrationAccount?.id);

  const onSandboxConfigChange = useCallback(
    (_e: unknown, data: { optionValue?: string }) => {
      dispatch(setAgentHarnessSandboxConfigurationId({ nodeId, sandboxConfigurationId: data.optionValue || undefined }));
    },
    [dispatch, nodeId]
  );

  const selectedSandboxConfig = useMemo(() => {
    if (!harnessData.sandboxConfigurationId || !sandboxConfigurations?.length) {
      return undefined;
    }
    const target = harnessData.sandboxConfigurationId.toLowerCase();
    const targetName = target.split('/').pop() ?? target;
    return sandboxConfigurations.find((c: any) => {
      const cid = (c.id ?? '').toLowerCase();
      const cname = (c.name ?? '').toLowerCase();
      return cid === target || cname === target || cname === targetName;
    });
  }, [harnessData.sandboxConfigurationId, sandboxConfigurations]);

  const hasSandboxMismatch = useMemo(() => {
    if (!harnessData.sandboxConfigurationId || !integrationAccount?.id) {
      return false;
    }
    const normalizedId = harnessData.sandboxConfigurationId.toLowerCase();
    const normalizedAccountId = integrationAccount.id.toLowerCase();
    return normalizedId.includes('/integrationaccounts/') && !normalizedId.startsWith(normalizedAccountId);
  }, [harnessData.sandboxConfigurationId, integrationAccount?.id]);

  const inputFileItems: InputFileRow[] = useMemo(
    () => (harnessData.inputFiles ?? []).map((f) => ({ name: f.name, content: f.content })),
    [harnessData.inputFiles]
  );

  const intlText = useMemo(
    () => ({
      infoMessage: intl.formatMessage({
        defaultMessage:
          'The Agent Harness configures the sandbox environment where the agent executes. It provisions an isolated compute container with tools, repos, and skills.',
        id: 'Q6Z2NJ',
        description: 'Info message explaining agent harness',
      }),
      learnMore: intl.formatMessage({
        defaultMessage: 'Learn more about Agent Harness',
        id: 'A5szs0',
        description: 'Learn more link text for agent harness',
      }),
      executionEnvironmentTitle: intl.formatMessage({
        defaultMessage: 'Execution Environment',
        id: 'l4W63k',
        description: 'Title for execution environment section',
      }),
      executionEnvironmentSubtitle: intl.formatMessage({
        defaultMessage: 'Choose the harness runtime for agent execution.',
        id: '2RtLQr',
        description: 'Subtitle for execution environment section',
      }),
      harnessTypeLabel: intl.formatMessage({
        defaultMessage: 'Harness Type',
        id: 'XI42nf',
        description: 'Label for harness type dropdown',
      }),
      sandboxConfigTitle: intl.formatMessage({
        defaultMessage: 'Sandbox Configuration (Optional)',
        id: 'OMr20n',
        description: 'Title for sandbox configuration section',
      }),
      sandboxConfigSubtitle: intl.formatMessage({
        defaultMessage:
          'Link a pre-built sandbox with cloned repos and skills from an Integration Account. If not set, a clean sandbox with the default base image is used.',
        id: 'Q+ZabC',
        description: 'Subtitle for sandbox configuration section',
      }),
      integrationAccountLabel: intl.formatMessage({
        defaultMessage: 'Integration Account',
        id: 'xmtXdX',
        description: 'Label for integration account field',
      }),
      integrationAccountInfoMessage: intl.formatMessage({
        defaultMessage: 'An integration account must be linked to the workflow to select a sandbox configuration.',
        id: 'jftxJs',
        description: 'Info tooltip message for integration account field',
      }),
      readMore: intl.formatMessage({
        defaultMessage: 'Read more',
        id: 'xuu6iZ',
        description: 'Read more link text',
      }),
      sandboxConfigLabel: intl.formatMessage({
        defaultMessage: 'Sandbox Configuration',
        id: 'sBIkgt',
        description: 'Label for sandbox configuration dropdown',
      }),
      sandboxMismatchWarning: intl.formatMessage({
        defaultMessage:
          'The selected sandbox configuration belongs to a different integration account. Please update to match the current account.',
        id: '6F5v5s',
        description: 'Warning when sandbox configuration does not match integration account',
      }),
      repositoryLabel: intl.formatMessage({
        defaultMessage: 'Repository',
        id: '9+y/1L',
        description: 'Label for skill repository',
      }),
      foldersLabel: intl.formatMessage({
        defaultMessage: 'Folders',
        id: 'vGVzfn',
        description: 'Label for skill folders',
      }),
      inputFilesTitle: intl.formatMessage({
        defaultMessage: 'Input Files',
        id: '3V1451',
        description: 'Title for input files section',
      }),
      inputFilesSubtitle: intl.formatMessage({
        defaultMessage:
          'Files to upload to the sandbox workspace before the agent runs. Content comes from previous workflow actions or expressions.',
        id: 'bpLNfa',
        description: 'Subtitle for input files section',
      }),
      skillsTitle: intl.formatMessage({
        defaultMessage: 'Skills',
        id: 'bUVLh1',
        description: 'Title for skills section',
      }),
      skillsSubtitle: intl.formatMessage({
        defaultMessage: 'Repository skills that provide context for agent execution.',
        id: 'cWFJLe',
        description: 'Subtitle for skills section',
      }),
      selectSandboxPlaceholder: intl.formatMessage({
        defaultMessage: 'Select a sandbox configuration',
        id: 'MTGVz9',
        description: 'Placeholder for sandbox configuration dropdown',
      }),
      nonePlaceholder: intl.formatMessage({
        defaultMessage: 'None',
        id: 'sXL2Jq',
        description: 'None option for sandbox configuration',
      }),
    }),
    [intl]
  );

  return (
    <div className={styles.container}>
      {/* Info MessageBar */}
      <MessageBar intent="info" layout="multiline">
        <MessageBarBody>
          <Text>{intlText.infoMessage} </Text>
          <Link href="https://aka.ms/LogicApps/AgentHarness" target="_blank">
            {intlText.learnMore}
          </Link>
        </MessageBarBody>
      </MessageBar>

      {/* Execution Environment */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>{intlText.executionEnvironmentTitle}</Text>
        <Text className={styles.sectionSubtitle}>{intlText.executionEnvironmentSubtitle}</Text>
        <Field label={intlText.harnessTypeLabel} required>
          <Dropdown
            value={harnessData.type === 'GHCP' ? 'GHCP (GitHub Copilot)' : (harnessData.type ?? '')}
            selectedOptions={[harnessData.type ?? 'GHCP']}
          >
            <Option value="GHCP">GHCP (GitHub Copilot)</Option>
          </Dropdown>
        </Field>
      </div>

      {/* Sandbox Configuration */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>{intlText.sandboxConfigTitle}</Text>
        <Text className={styles.sectionSubtitle}>{intlText.sandboxConfigSubtitle}</Text>

        <div className={styles.fieldRow}>
          <div className={styles.labelRow}>
            <Label>{intlText.integrationAccountLabel}</Label>
            <Tooltip
              relationship="description"
              content={
                <span>
                  {intlText.integrationAccountInfoMessage}{' '}
                  <Link
                    href="https://learn.microsoft.com/en-us/azure/logic-apps/enterprise-integration/create-integration-account?tabs=azure-portal%2Cconsumption#create-integration-account"
                    target="_blank"
                    rel="noopener noreferrer"
                    inline
                  >
                    {intlText.readMore}
                  </Link>
                </span>
              }
            >
              <Info16Regular className={styles.infoIcon} tabIndex={0} aria-label={intlText.integrationAccountInfoMessage} />
            </Tooltip>
          </div>
          <Input value={integrationAccount?.name ?? ''} disabled />
        </div>

        {integrationAccount && (
          <div className={styles.fieldRow}>
            <Field
              label={intlText.sandboxConfigLabel}
              validationState={hasSandboxMismatch ? 'warning' : undefined}
              validationMessage={hasSandboxMismatch ? intlText.sandboxMismatchWarning : undefined}
            >
              <Dropdown
                placeholder={intlText.selectSandboxPlaceholder}
                value={selectedSandboxConfig?.name ?? harnessData.sandboxConfigurationId?.split('/').pop() ?? ''}
                selectedOptions={selectedSandboxConfig?.id ? [selectedSandboxConfig.id] : []}
                onOptionSelect={onSandboxConfigChange}
              >
                <Option value="">{intlText.nonePlaceholder}</Option>
                {(sandboxConfigurations ?? []).map((config: any) => (
                  <Option key={config.id} value={config.id}>
                    {config.name ?? config.id}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            {selectedSandboxConfig?.properties?.provisioningState && (
              <div className={styles.sandboxStatus}>
                <div
                  className={mergeClasses(
                    styles.statusDot,
                    selectedSandboxConfig.properties.provisioningState === 'Failed' && styles.statusDotFailed,
                    selectedSandboxConfig.properties.provisioningState !== 'Ready' &&
                      selectedSandboxConfig.properties.provisioningState !== 'Failed' &&
                      styles.statusDotPending
                  )}
                />
                <Text size={200}>{selectedSandboxConfig.properties.provisioningState}</Text>
                {selectedSandboxConfig.properties.provisioningState === 'Failed' &&
                  extractErrorDetail(selectedSandboxConfig.properties.errorMessage) && (
                    <Text size={200} className={styles.snapshotText}>
                      {extractErrorDetail(selectedSandboxConfig.properties.errorMessage)}
                    </Text>
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Files */}
      {inputFileItems.length > 0 && (
        <div className={styles.section}>
          <Text className={styles.sectionTitle}>{intlText.inputFilesTitle}</Text>
          <Text className={styles.sectionSubtitle}>{intlText.inputFilesSubtitle}</Text>
          <DataGrid items={inputFileItems} columns={inputFileColumns} getRowId={(item) => item.name}>
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<InputFileRow>>
              {({ item, rowId }) => (
                <DataGridRow key={rowId}>{({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}</DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        </div>
      )}

      {/* Skills */}
      {(harnessData.skills ?? []).length > 0 && (
        <div className={styles.section}>
          <Text className={styles.sectionTitle}>{intlText.skillsTitle}</Text>
          <Text className={styles.sectionSubtitle}>{intlText.skillsSubtitle}</Text>
          <div className={styles.skillsList}>
            {(harnessData.skills ?? []).map((skill, index) => (
              <div key={`${skill.repository}-${index}`} className={styles.skillCard}>
                <div className={styles.skillField}>
                  <Text size={200} weight="semibold">
                    {intlText.repositoryLabel}
                  </Text>
                  <Text size={200} className={styles.skillValue}>
                    {skill.repository}
                  </Text>
                </div>
                {skill.folders && skill.folders.length > 0 && (
                  <div className={styles.skillField}>
                    <Text size={200} weight="semibold">
                      {intlText.foldersLabel}
                    </Text>
                    <div className={styles.badgeRow}>
                      {skill.folders.map((folder) => (
                        <Badge key={folder} appearance="outline" size="small">
                          {folder}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const agentHarnessTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.AGENT_HARNESS,
  title: intl.formatMessage({
    defaultMessage: 'Agent Harness',
    id: 'gdG09q',
    description: 'Agent Harness tab title',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Configure agent harness sandbox environment',
    id: 'dLMHGj',
    description: 'Agent Harness tab description',
  }),
  visible: true,
  content: <AgentHarnessTab {...props} />,
  order: 0,
  icon: 'Info',
});
