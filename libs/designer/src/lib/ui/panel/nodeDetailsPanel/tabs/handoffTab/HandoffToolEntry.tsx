import { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
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

import { useHandoffActionsForAgent, useNodeDisplayName, useWorkflowNode } from '../../../../../core/state/workflow/workflowSelectors';
import { createLiteralValueSegment, type AppDispatch } from '../../../../../core';
import { deleteAgentTool } from '../../../../../core/state/workflow/workflowSlice';
import { updateNodeParameters } from '../../../../../core/state/operation/operationMetadataSlice';
import { ParameterGroupKeys } from '../../../../../core/utils/parameters/helper';
import { useHandoffTabStyles } from './handoffTab.styles';
import { useOperationParameterByName } from '../../../../../core/state/operation/operationSelector';
import { deleteGraphNode } from '../../../../../core/actions/bjsworkflow/delete';

const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);
const DeleteIcon = bundleIcon(DeleteFilled, DeleteRegular);

interface HandoffToolEntryProps {
  agentId: string;
  toolId: string;
}

export const HandoffToolEntry = ({ agentId, toolId }: HandoffToolEntryProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

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
          </div>
          <Divider />
        </>
      )}
    </div>
  );
};
