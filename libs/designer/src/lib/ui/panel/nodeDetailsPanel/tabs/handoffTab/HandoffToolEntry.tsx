import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Button, Tooltip, Divider, Field, Textarea } from '@fluentui/react-components';
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
import { useOperationParameterByName } from '../../../../../core/state/operation/operationSelector';
import { removeAgentHandoff } from '../../../../../core/actions/bjsworkflow/handoff';
import { ParameterSection } from '../parametersTab';
import { useReadOnly } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';

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

  const [expanded, setExpanded] = useState(true);

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
        })
      );
    },
    [handoffAction, dispatch, toolId, descriptionParameter?.id]
  );

  const buttonText = useNodeDisplayName(handoffAction?.targetId ?? '');

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
      deleteLabel: intl.formatMessage({
        defaultMessage: 'Delete handoff',
        id: 'RIky6p',
        description: 'Label for the delete button to remove a handoff tool entry',
      }),
    }),
    [intl]
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
          {buttonText}
        </Button>
        <Tooltip relationship="label" content={intlText.deleteLabel}>
          <Button icon={<DeleteIcon />} appearance="subtle" onClick={removeHandoff} aria-label={intlText.deleteLabel} />
        </Tooltip>
      </div>
      {expanded && (
        <>
          <div className={styles.handoffToolEntryBody}>
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
