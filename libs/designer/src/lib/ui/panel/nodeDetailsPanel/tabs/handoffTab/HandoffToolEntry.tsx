import { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { Dropdown, Option, Button, Tooltip, Divider, Field, Textarea } from '@fluentui/react-components';
import { labelCase } from '@microsoft/logic-apps-shared';
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
  useAllAgentIds,
  useHandoffActionsForAgent,
  useNodeDisplayName,
  useReplacedIds,
  useWorkflowNode,
} from '../../../../../core/state/workflow/workflowSelectors';
import { createLiteralValueSegment, type AppDispatch } from '../../../../../core';
import { deleteAgentTool, replaceId } from '../../../../../core/state/workflow/workflowSlice';
import { updateNodeParameters } from '../../../../../core/state/operation/operationMetadataSlice';
import { ParameterGroupKeys } from '../../../../../core/utils/parameters/helper';
import { useHandoffTabStyles } from './handoffTab.styles';
import { useOperationParameterByName } from '../../../../../core/state/operation/operationSelector';
import { deleteGraphNode } from '../../../../../core/actions/bjsworkflow/delete';

const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);
const DeleteIcon = bundleIcon(DeleteFilled, DeleteRegular);

export const HandoffToolEntry = ({ agentId, toolId }: any) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const allAgentNames = useAllAgentIds();

  const filteredAgents = allAgentNames.filter((agent) => agent !== agentId);

  const allHandoffActions = useHandoffActionsForAgent(agentId);
  const existingHandoffTargets = useMemo(() => {
    return allHandoffActions.map((action) => action.inputs.name);
  }, [allHandoffActions]);

  const handoffAction = useMemo(() => {
    return allHandoffActions.find((action) => action.toolId === toolId);
  }, [allHandoffActions, toolId]);

  const targetAgentId = useMemo(() => {
    return handoffAction?.inputs.name;
  }, [handoffAction]);

  const [expanded, setExpanded] = useState(true);

  const handleToggleExpand = () => {
    setExpanded((prev) => !prev);
  };

  const replacedIds = useReplacedIds();

  const toolWorkflowNode = useWorkflowNode(toolId);

  const removeHandoff = useCallback(() => {
    if (!handoffAction || !toolWorkflowNode) {
      return;
    }
    dispatch(
      deleteGraphNode({
        graphId: toolId,
        graphNode: toolWorkflowNode,
        clearFocus: false,
      })
    );
    dispatch(
      deleteAgentTool({
        toolId,
        agentId,
      })
    );
  }, [agentId, dispatch, handoffAction, toolId, toolWorkflowNode]);

  const targetParameter = useOperationParameterByName(handoffAction.id, 'name');

  const onTargetChange = useCallback(
    (newTargetAgentId: string | undefined) => {
      if (!newTargetAgentId || !handoffAction) {
        return;
      }
      if (newTargetAgentId === targetAgentId) {
        return; // No change needed
      }
      // Update the tool and handoff action IDs
      const newHandoffId = `handoff_from_${agentId}_to_${newTargetAgentId}`;
      dispatch(
        replaceId({
          originalId: toolId,
          newId: `${newHandoffId}_tool`,
        })
      );
      dispatch(
        replaceId({
          originalId: `${toolId}_action`,
          newId: `${newHandoffId}_action`,
        })
      );
      // Update the handoff action "name" parameter value
      dispatch(
        updateNodeParameters({
          nodeId: handoffAction.id,
          parameters: [
            {
              groupId: ParameterGroupKeys.DEFAULT,
              parameterId: targetParameter?.id ?? '',
              propertiesToUpdate: {
                value: [createLiteralValueSegment(newTargetAgentId)],
              },
            },
          ],
        })
      );
    },
    [handoffAction, agentId, dispatch, toolId, targetParameter?.id]
  );

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

  const buttonText = useNodeDisplayName(targetAgentId);

  const intlText = useMemo(
    () => ({
      agentNameDropdown: intl.formatMessage({
        defaultMessage: 'Target agent',
        id: 'oU4UD8',
        description: 'Label for the dropdown to select the target agent for handoff',
      }),
      handoffDescription: intl.formatMessage({
        defaultMessage: 'Description of the handoff',
        id: 'OnPkop',
        description: 'Placeholder text for the input field to enter a description of the handoff',
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
              <Field label={intlText.agentNameDropdown}>
                <Dropdown
                  id="handoffTargetAgentDropdown"
                  value={targetAgentId}
                  defaultSelectedOptions={targetAgentId ? [targetAgentId] : []}
                  onOptionSelect={(_e, data) => onTargetChange(data.optionValue)}
                >
                  {filteredAgents.map((option: string) => (
                    <Option key={option} disabled={existingHandoffTargets.includes(option) && option !== targetAgentId} value={option}>
                      {labelCase(replacedIds[option] || option)}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
            </div>
            <div className={styles.handoffInput}>
              <Field label={intlText.handoffDescription} required>
                <Textarea
                  id="handoffDescription"
                  placeholder={intlText.handoffDescription}
                  onChange={(_e, data) => onDescriptionChange(data.value)}
                  defaultValue={handoffAction?.toolDescription}
                />
              </Field>
            </div>
          </div>
          <Divider />
        </>
      )}
    </div>
  );
};
