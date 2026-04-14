import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import {
  Text,
  MessageBar,
  MessageBarBody,
  Dropdown,
  Option,
  Field,
  Input,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  createTableColumn,
} from '@fluentui/react-components';
import type { TableColumnDefinition } from '@fluentui/react-components';
import { useMemo, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';

import constants from '../../../../../common/constants';
import { useHostOptions } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { useAgentHarnessTabStyles } from './agentHarnessTab.styles';
import type { RootState, AppDispatch } from '../../../../../core/store';
import { getRecordEntry, WorkflowService } from '@microsoft/logic-apps-shared';
import { updateNodeParameters } from '../../../../../core/state/operation/operationMetadataSlice';

// Types for agent harness data
interface AgentHarnessInputFile {
  name: string;
  content: string;
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

/**
 * Extracts agentHarness data from the agentModelSettings parameter in Redux state.
 */
const useAgentHarnessData = (nodeId: string): { data: AgentHarnessData; parameterId?: string; groupId?: string } => {
  const nodeInputs = useSelector((state: RootState) => getRecordEntry(state.operations.inputParameters, nodeId));

  return useMemo(() => {
    if (!nodeInputs) {
      return { data: {} };
    }

    for (const groupId of Object.keys(nodeInputs.parameterGroups)) {
      const group = nodeInputs.parameterGroups[groupId];
      for (const param of group.parameters) {
        if (param.parameterName.includes('agentModelSettings')) {
          try {
            // The parameter value is stored as a ValueSegment array
            const rawValue = param.value?.map((v) => v.value).join('') || '{}';
            const parsed = JSON.parse(rawValue);
            return {
              data: parsed?.agentHarness ?? {},
              parameterId: param.id,
              groupId,
            };
          } catch {
            return { data: {}, parameterId: param.id, groupId };
          }
        }
      }
    }

    return { data: {} };
  }, [nodeInputs]);
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

// DataGrid column definitions for Input Files
interface InputFileRow {
  name: string;
  content: string;
}

const inputFileColumns: TableColumnDefinition<InputFileRow>[] = [
  createTableColumn<InputFileRow>({
    columnId: 'name',
    renderHeaderCell: () => 'File Name',
    renderCell: (item) => <Text>{item.name}</Text>,
  }),
  createTableColumn<InputFileRow>({
    columnId: 'content',
    renderHeaderCell: () => 'Content (dynamic)',
    renderCell: (item) => <Text>{item.content}</Text>,
  }),
];

// DataGrid column definitions for Skills
interface SkillRow {
  repository: string;
  folders: string;
}

const skillColumns: TableColumnDefinition<SkillRow>[] = [
  createTableColumn<SkillRow>({
    columnId: 'repository',
    renderHeaderCell: () => 'Repository',
    renderCell: (item) => <Text>{item.repository}</Text>,
  }),
  createTableColumn<SkillRow>({
    columnId: 'folders',
    renderHeaderCell: () => 'Folders',
    renderCell: (item) => <Text>{item.folders}</Text>,
  }),
];

export const AgentHarnessTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId } = props;
  const intl = useIntl();
  const styles = useAgentHarnessTabStyles();
  const dispatch = useDispatch<AppDispatch>();
  const hostOptions = useHostOptions();
  const integrationAccount = hostOptions.integrationAccount;

  const { data: harnessData, parameterId, groupId } = useAgentHarnessData(nodeId);
  const { data: sandboxConfigurations } = useSandboxConfigurations(integrationAccount?.id);

  // Check for sandbox configuration mismatch
  const hasSandboxMismatch = useMemo(() => {
    if (!harnessData.sandboxConfigurationId || !integrationAccount?.id) {
      return false;
    }
    // If the sandboxConfigurationId contains a path prefix that doesn't match the current integration account
    const normalizedId = harnessData.sandboxConfigurationId.toLowerCase();
    const normalizedAccountId = integrationAccount.id.toLowerCase();
    return normalizedId.includes('/integrationaccounts/') && !normalizedId.startsWith(normalizedAccountId);
  }, [harnessData.sandboxConfigurationId, integrationAccount?.id]);

  // Prepare data for Input Files DataGrid
  const inputFileItems: InputFileRow[] = useMemo(
    () => (harnessData.inputFiles ?? []).map((f) => ({ name: f.name, content: f.content })),
    [harnessData.inputFiles]
  );

  // Prepare data for Skills DataGrid
  const skillItems: SkillRow[] = useMemo(
    () => (harnessData.skills ?? []).map((s) => ({ repository: s.repository, folders: (s.folders ?? []).join(', ') })),
    [harnessData.skills]
  );

  // Update agentHarness in Redux when dropdown values change
  const updateHarnessField = useCallback(
    (field: string, value: string) => {
      if (!parameterId || !groupId) {
        return;
      }

      const updatedHarness = { ...harnessData, [field]: value };
      const fullValue = JSON.stringify({ agentHarness: updatedHarness });

      dispatch(
        updateNodeParameters({
          nodeId,
          parameters: [
            {
              groupId,
              parameterId,
              propertiesToUpdate: {
                value: [{ id: crypto.randomUUID(), type: 'literal' as const, value: fullValue }],
              },
            },
          ],
        })
      );
    },
    [dispatch, nodeId, parameterId, groupId, harnessData]
  );

  const intlText = useMemo(
    () => ({
      infoMessage: intl.formatMessage({
        defaultMessage: 'The Agent Harness configures the sandbox environment where the agent executes code and accesses resources.',
        id: 's+momK',
        description: 'Info message explaining agent harness',
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
      sandboxConfigTitle: intl.formatMessage({
        defaultMessage: 'Sandbox Configuration (Optional)',
        id: 'OMr20n',
        description: 'Title for sandbox configuration section',
      }),
      sandboxConfigSubtitle: intl.formatMessage({
        defaultMessage: 'Link a pre-built sandbox with pre-installed dependencies and tools. If not specified, a default sandbox is used.',
        id: 'Ehv21q',
        description: 'Subtitle for sandbox configuration section',
      }),
      integrationAccountLabel: intl.formatMessage({
        defaultMessage: 'Integration Account',
        id: 'xmtXdX',
        description: 'Label for integration account field',
      }),
      sandboxConfigLabel: intl.formatMessage({
        defaultMessage: 'Sandbox Configuration',
        id: 'sBIkgt',
        description: 'Label for sandbox configuration dropdown',
      }),
      sandboxMismatchWarning: intl.formatMessage({
        defaultMessage:
          'The selected sandbox configuration belongs to a different integration account. Please update the sandbox configuration to match the current integration account.',
        id: 'j5+6cn',
        description: 'Warning when sandbox configuration does not match integration account',
      }),
      inputFilesTitle: intl.formatMessage({
        defaultMessage: 'Input Files',
        id: '3V1451',
        description: 'Title for input files section',
      }),
      inputFilesSubtitle: intl.formatMessage({
        defaultMessage: 'Files to upload to the sandbox. Values can contain dynamic content or expressions.',
        id: 'UE3Ti7',
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
          <Text>{intlText.infoMessage}</Text>
        </MessageBarBody>
      </MessageBar>

      {/* Execution Environment */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>{intlText.executionEnvironmentTitle}</Text>
        <Text className={styles.sectionSubtitle}>{intlText.executionEnvironmentSubtitle}</Text>
        <Field>
          <Dropdown
            value={harnessData.type === 'GHCP' ? 'GHCP (GitHub Copilot)' : (harnessData.type ?? '')}
            selectedOptions={[harnessData.type ?? 'GHCP']}
            onOptionSelect={(_e, data) => updateHarnessField('type', data.optionValue as string)}
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
          <Field label={intlText.integrationAccountLabel}>
            <Input value={integrationAccount?.name ?? ''} disabled />
          </Field>
        </div>

        <div className={styles.fieldRow}>
          <Field label={intlText.sandboxConfigLabel}>
            <Dropdown
              placeholder={intlText.selectSandboxPlaceholder}
              value={
                sandboxConfigurations?.find((c: any) => c.id === harnessData.sandboxConfigurationId)?.name ??
                harnessData.sandboxConfigurationId ??
                ''
              }
              selectedOptions={harnessData.sandboxConfigurationId ? [harnessData.sandboxConfigurationId] : []}
              onOptionSelect={(_e, data) => updateHarnessField('sandboxConfigurationId', data.optionValue as string)}
            >
              <Option value="">{intlText.nonePlaceholder}</Option>
              {(sandboxConfigurations ?? []).map((config: any) => (
                <Option key={config.id} value={config.id}>
                  {config.name ?? config.id}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </div>

        {hasSandboxMismatch && (
          <MessageBar intent="warning" layout="multiline">
            <MessageBarBody>
              <Text>{intlText.sandboxMismatchWarning}</Text>
            </MessageBarBody>
          </MessageBar>
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
      {skillItems.length > 0 && (
        <div className={styles.section}>
          <Text className={styles.sectionTitle}>{intlText.skillsTitle}</Text>
          <Text className={styles.sectionSubtitle}>{intlText.skillsSubtitle}</Text>
          <DataGrid items={skillItems} columns={skillColumns} getRowId={(item) => item.repository}>
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<SkillRow>>
              {({ item, rowId }) => (
                <DataGridRow key={rowId}>{({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}</DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
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
