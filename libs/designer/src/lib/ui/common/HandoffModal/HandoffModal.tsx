import {
  DialogSurface,
  DialogTitle,
  DialogActions,
  Dialog,
  DialogContent,
  Button,
  Text,
  FluentProvider,
  createLightTheme,
  createDarkTheme,
} from '@fluentui/react-components';
import { handoffOperation } from '@microsoft/logic-apps-shared';
import { addOperation, type AppDispatch } from '../../../core';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { addEdgeToTransitions } from '../../../core/actions/bjsworkflow/transitions';
import { useAgentOperations } from '../../../core/state/workflow/workflowSelectors';
import { BotRegular } from '@fluentui/react-icons';
import { useIsDarkMode } from '../../../core/state/designerOptions/designerOptionsSelectors';

export const HandoffModal = ({ isOpen, onDismiss, agentId, graphId, parentId }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const title = intl.formatMessage({
    defaultMessage: 'Handoff to another agent',
    id: 'Y2uy54',
    description: 'Title for the Handoff modal',
  });

  const description = intl.formatMessage({
    defaultMessage: 'Select which agent you would like to handoff to:',
    id: 'X7ql31',
    description: 'Description for the Handoff modal',
  });

  const cancelText = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: 'g/G8Wt',
    description: 'Text for the Cancel button in the Handoff modal',
  });

  const onSubmit = useCallback(
    (selectedAgentId: string) => {
      if (!graphId || !selectedAgentId) {
        return;
      }
      const relationshipIds = { graphId, childId: undefined, parentId };
      const nodeId = `Handoff_to_${selectedAgentId}`;
      // Add operation to the graph
      dispatch(
        addOperation({
          nodeId,
          relationshipIds,
          operation: handoffOperation,
          presetParameterValues: {
            agentId: selectedAgentId,
          },
        })
      );
      // Add the transition to the parent node
      dispatch(addEdgeToTransitions({ sourceId: agentId, targetId: selectedAgentId, isHandoff: true }));
      onDismiss();
    },
    [dispatch, graphId, parentId, agentId, onDismiss]
  );

  const agentOperations = useAgentOperations();
  const otherAgentOperations = agentOperations.filter((operation) => operation !== agentId);
  const onAgentSelect = useCallback(
    (selectedAgentId: string) => {
      onSubmit(selectedAgentId);
    },
    [onSubmit]
  );

  const themeVariants = {
    10: '#020206',
    20: '#141526',
    30: '#1D2244',
    40: '#232D5E',
    50: '#29387A',
    60: '#2E4496',
    70: '#324FB3',
    80: '#475DBE',
    90: '#5C6AC5',
    100: '#6F79CB',
    110: '#8087D1',
    120: '#9296D8',
    130: '#A2A5DE',
    140: '#B3B4E4',
    150: '#C3C4EA',
    160: '#D4D4F0',
  };

  const isInverted = useIsDarkMode();
  const agentTheme = isInverted ? createDarkTheme(themeVariants) : createLightTheme(themeVariants);

  return (
    <Dialog open={isOpen} onOpenChange={(_, d) => d.open && onDismiss()}>
      <DialogSurface>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent style={{ margin: '12px 0px' }}>
          <FluentProvider theme={agentTheme}>
            <Text>{description}</Text>
            <div style={{ display: 'flex', flexDirection: 'row', margin: '12px 0px', gap: '4px' }}>
              {otherAgentOperations.map((operation) => (
                <Button
                  key={operation}
                  onClick={() => onAgentSelect(operation)}
                  appearance="primary"
                  icon={<BotRegular />}
                  style={{
                    justifyContent: 'flex-start',
                  }}
                >
                  {operation}
                </Button>
              ))}
            </div>
          </FluentProvider>
        </DialogContent>
        <DialogActions>
          <Button appearance="secondary" onClick={onDismiss}>
            {cancelText}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};
