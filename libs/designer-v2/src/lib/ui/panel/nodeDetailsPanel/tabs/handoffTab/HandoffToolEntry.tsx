import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Button, Tooltip, Divider, Field, Textarea, Input } from '@fluentui/react-components';
import {
  bundleIcon,
  ChevronDown24Filled,
  ChevronDown24Regular,
  ChevronRight24Filled,
  ChevronRight24Regular,
  DeleteFilled,
  DeleteRegular,
} from '@fluentui/react-icons';

import {
  useHandoffActionsForAgent,
  useNodeDisplayName,
  useReplacedIds,
  useWorkflowNode,
} from '../../../../../core/state/workflow/workflowSelectors';
import { createLiteralValueSegment, getExpressionTokenSections, getOutputTokenSections } from '../../../../../core';
import type { AppDispatch, RootState } from '../../../../../core';
import { updateNodeParameters } from '../../../../../core/state/operation/operationMetadataSlice';
import { ParameterGroupKeys } from '../../../../../core/utils/parameters/helper';
import { useHandoffTabStyles } from './handoffTab.styles';
import { replaceId } from '../../../../../core/state/workflow/workflowSlice';
import { useOperationParameterByName } from '../../../../../core/state/operation/operationSelector';
import constants from '../../../../../common/constants';
import { removeAgentHandoff } from '../../../../../core/actions/bjsworkflow/handoff';
import { ParameterSection } from '../parametersTab';
import { useReadOnly } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { SUBGRAPH_TYPES, equals } from '@microsoft/logic-apps-shared';

const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);
const DeleteIcon = bundleIcon(DeleteFilled, DeleteRegular);

interface HandoffToolEntryProps {
  agentId: string;
  toolId: string;
}

export const HandoffToolEntry = ({ agentId, toolId }: HandoffToolEntryProps) => {
  const isReadOnly = useReadOnly();
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const replacedIds = useReplacedIds();

  const allHandoffActions = useHandoffActionsForAgent(agentId);

  const handoffAction = useMemo(() => {
    return allHandoffActions.find((action) => action.toolId === toolId);
  }, [allHandoffActions, toolId]);

  const defaultToolName = useNodeDisplayName(toolId);
  const targetAgentName = useNodeDisplayName(handoffAction?.targetId ?? '');

  // Get all workflow operations to check for naming conflicts
  const workflowOperations = useSelector((state: RootState) => state.workflow.operations);

  const [expanded, setExpanded] = useState(true);
  const [toolNameError, setToolNameError] = useState('');

  const handleToggleExpand = () => {
    setExpanded((prev) => !prev);
  };

  const toolWorkflowNode = useWorkflowNode(toolId);

  const removeHandoff = useCallback(() => {
    if (!handoffAction || !toolWorkflowNode) {
      return;
    }
    dispatch(removeAgentHandoff({ agentId, toolId }));
  }, [agentId, dispatch, handoffAction, toolId, toolWorkflowNode]);

  const descriptionParameter = useOperationParameterByName(toolId, 'description');

  const onDescriptionChange = useCallback(
    (newDescription: string) => {
      if (!handoffAction) {
        return;
      }
      // Update the handoff tool "description" parameter value
      dispatch(
        updateNodeParameters({
          nodeId: toolId,
          parameters: [
            {
              groupId: ParameterGroupKeys.DEFAULT,
              parameterId: descriptionParameter?.id ?? '',
              propertiesToUpdate: {
                value: [createLiteralValueSegment(newDescription)],
              },
            },
          ],
          isUserAction: true,
        })
      );
    },
    [handoffAction, dispatch, toolId, descriptionParameter?.id]
  );

  const intlText = useMemo(
    () => ({
      agentNameDropdown: intl.formatMessage({
        defaultMessage: 'Target agent',
        id: 'oU4UD8',
        description: 'Label for the dropdown to select the target agent for handoff',
      }),
      handoffDescriptionLabel: intl.formatMessage({
        defaultMessage: 'Handoff description',
        id: 'Aid5oX',
        description: 'Label text for the input field to enter a description of the handoff',
      }),
      handoffDescriptionPlaceholder: intl.formatMessage({
        defaultMessage: 'Enter a description for the handoff',
        id: '+TUUxa',
        description: 'Placeholder text for the handoff description input field',
      }),
      toolNameLabel: intl.formatMessage({
        defaultMessage: 'Handoff name',
        id: 'saPM0I',
        description: 'Label for the handoff tool name input field',
      }),
      toolNameRequiredError: intl.formatMessage({
        defaultMessage: 'Tool name is required',
        id: 'eDiMaf',
        description: 'Error message when tool name is empty',
      }),
      toolNameLengthError: intl.formatMessage({
        defaultMessage: 'Tool name cannot exceed maximum characters',
        id: 'hTjAB+',
        description: 'Error message when tool name exceeds maximum characters',
      }),
      toolNameConflictError: intl.formatMessage({
        defaultMessage: 'Tool name already exists in the workflow',
        id: 'xWmpDI',
        description: 'Error message when tool name conflicts with existing action names',
      }),
      deleteLabel: intl.formatMessage({
        defaultMessage: 'Delete handoff',
        id: 'RIky6p',
        description: 'Label for the delete button to remove a handoff tool entry',
      }),
    }),
    [intl]
  );

  const onToolNameChange = useCallback(
    (newToolName: string) => {
      // Validate tool name
      if (!newToolName.trim()) {
        setToolNameError(intlText.toolNameRequiredError);
        return;
      }
      if (newToolName.length > constants.HANDOFF_TOOL_NAME_MAX_LENGTH) {
        setToolNameError(intlText.toolNameLengthError);
        return;
      }

      // Check for naming conflicts with existing workflow operations (case-insensitive)
      // Exclude the current tool ID from conflict checking
      const existingOperationIds = Object.keys(workflowOperations).filter((id) => id !== toolId);
      const hasConflict = existingOperationIds.some((id) => equals(id, newToolName, true));
      if (hasConflict) {
        setToolNameError(intlText.toolNameConflictError);
        return;
      }

      // Clear error if validation passes
      setToolNameError('');

      // Update the tool name in the Redux store using replaceId action
      // This updates the idReplacements mapping which is used by useNodeDisplayName
      dispatch(
        replaceId({
          originalId: toolId,
          newId: newToolName,
        })
      );
    },
    [toolId, dispatch, workflowOperations, intlText.toolNameRequiredError, intlText.toolNameLengthError, intlText.toolNameConflictError]
  );

  const styles = useHandoffTabStyles();

  const handoffInputs = useSelector((state: RootState) => state.operations.inputParameters[handoffAction?.id]);
  const { tokenState, workflowParametersState, workflowState } = useSelector((state: RootState) => ({
    tokenState: state.tokens,
    workflowParametersState: state.workflowParameters,
    workflowState: state.workflow,
  }));

  const tokenGroup = getOutputTokenSections(
    agentId,
    SUBGRAPH_TYPES.AGENT_CONDITION,
    tokenState,
    workflowParametersState,
    workflowState,
    replacedIds
  );
  const expressionGroup = getExpressionTokenSections();

  return (
    <div className={styles.handoffToolEntry}>
      <div className={styles.handoffToolEntryHeader}>
        <Button
          appearance="subtle"
          onClick={handleToggleExpand}
          icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
          aria-expanded={expanded}
          style={{ justifyContent: 'flex-start', flexGrow: 1 }}
        >
          {targetAgentName}
        </Button>
        <Tooltip relationship="label" content={intlText.deleteLabel}>
          <Button icon={<DeleteIcon />} appearance="subtle" onClick={removeHandoff} aria-label={intlText.deleteLabel} />
        </Tooltip>
      </div>
      {expanded && (
        <>
          <div className={styles.handoffToolEntryBody}>
            <div className={styles.handoffInput}>
              <Field
                label={intlText.toolNameLabel}
                required
                validationMessage={toolNameError}
                validationState={toolNameError ? 'error' : 'none'}
              >
                <Input
                  value={defaultToolName}
                  onChange={(_e, data) => onToolNameChange(data.value)}
                  disabled={!!isReadOnly}
                  placeholder="Tool name"
                  maxLength={constants.HANDOFF_TOOL_NAME_MAX_LENGTH}
                />
              </Field>
            </div>
            <div className={styles.handoffInput}>
              <Field label={intlText.handoffDescriptionLabel} required>
                <Textarea
                  id={`${toolId}-description`}
                  placeholder={intlText.handoffDescriptionPlaceholder}
                  onChange={(_e, data) => onDescriptionChange(data.value)}
                  defaultValue={handoffAction?.toolDescription}
                />
              </Field>
            </div>
            {Object.keys(handoffInputs?.parameterGroups ?? {}).map((sectionName) => (
              <div key={sectionName}>
                <ParameterSection
                  key={handoffAction?.id ?? ''}
                  nodeId={handoffAction?.id ?? ''}
                  group={handoffInputs.parameterGroups[sectionName]}
                  readOnly={isReadOnly}
                  tokenGroup={tokenGroup}
                  expressionGroup={expressionGroup}
                />
              </div>
            ))}
          </div>
          <Divider />
        </>
      )}
    </div>
  );
};
