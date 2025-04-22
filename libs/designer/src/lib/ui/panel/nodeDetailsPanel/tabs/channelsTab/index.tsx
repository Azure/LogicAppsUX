import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import constants from '../../../../../common/constants';
import { MessageBarBody, Switch, type SwitchOnChangeData } from '@fluentui/react-components';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../../core/store';
import { MessageBar, MessageBarType } from '@fluentui/react';
import ChannelContent from './ChannelContent';
import type { SupportedChannels } from '@microsoft/logic-apps-shared';
import { deinitializeNodes, initializeNodeOperationInputsData } from '../../../../../core/state/operation/operationMetadataSlice';
import { getAllNodeData } from '../../../../../core/configuretemplate/utils/helper';
import { initializeOperationDetails } from '../../../../../core/templates/utils/parametershelper';
import { setIsWorkflowParametersDirty } from '../../../../../core/state/workflowparameters/workflowparametersSlice';

export const ChannelsTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const dispatch = useDispatch<AppDispatch>();
  const supportedChannels = useSelector((state: RootState) => state.operations.supportedChannels[selectedNodeId]);
  const [channel, _setChannel] = useState<SupportedChannels | undefined>(supportedChannels.length > 0 ? supportedChannels[0] : undefined);
  const [isLoading, setIsLoading] = useState(false);
  const inputNodeId = useMemo(
    () => `${selectedNodeId}${constants.CHANNELS.INPUT}${channel?.input?.type}`,
    [channel?.input.type, selectedNodeId]
  );
  const outputNodeId = useMemo(
    () => `${selectedNodeId}${constants.CHANNELS.OUTPUT}${channel?.output?.type}`,
    [channel?.output.type, selectedNodeId]
  );

  const inputChannelParameters = useSelector((state: RootState) => state.operations.inputParameters[inputNodeId]);

  const outputChannelParameters = useSelector((state: RootState) => state.operations.inputParameters[outputNodeId]);

  const intl = useIntl();

  const stringResources = useMemo(
    () => ({
      ENABLED: intl.formatMessage({
        defaultMessage: 'Enabled',
        id: 'rRM1pj',
        description: 'Channel enabled.',
      }),
      DISABLED: intl.formatMessage({
        defaultMessage: 'Disabled',
        id: 'OnjMM3',
        description: 'Channel disabled.',
      }),
      NO_CHANNEL_SUPPORTED_MSG: intl.formatMessage({
        defaultMessage: 'No channel supported for this agent.',
        id: 'di6MC0',
        description: 'channel not supported message',
      }),
      OUTPUT_CHANNEL_MESSAGE: intl.formatMessage({
        defaultMessage:
          'Channels are automatically set up so you can easily communicate with the agent. To only send messages to the agent, and not receive them, disable the Output channel.',
        id: 'ncjY1H',
        description: 'Channel info message.',
      }),
    }),
    [intl]
  );

  const enabled = useMemo(() => !!inputChannelParameters, [inputChannelParameters]);

  const disableOperation = useCallback(
    (operationOptions: { input: boolean; output: boolean }) => {
      const disableNodes = [];
      if (operationOptions.input) {
        disableNodes.push(inputNodeId);
      }
      if (operationOptions.output) {
        disableNodes.push(outputNodeId);
      }
      dispatch(deinitializeNodes(disableNodes));
      // TODO: Need to handle content change
      dispatch(setIsWorkflowParametersDirty(true));
    },
    [dispatch, inputNodeId, outputNodeId]
  );

  const initializeOperation = useCallback(
    async (operationOptions: { input: boolean; output: boolean }) => {
      if (!channel) {
        return;
      }
      setIsLoading(true);
      const { input, output } = channel;
      const { type: inputOperationType } = input;
      const { type: outputOperationType } = output;

      const operationsData = await getAllNodeData([
        initializeOperationDetails(
          inputNodeId,
          {
            type: inputOperationType,
          },
          undefined,
          true,
          [],
          {}
        ),
        initializeOperationDetails(
          outputNodeId,
          {
            type: outputOperationType,
          },
          undefined,
          false,
          [],
          {}
        ),
      ]);

      const updatedOperationsData = [];

      if (operationOptions.input) {
        if (inputChannelParameters) {
          operationsData[0].nodeInputs = inputChannelParameters;
        } else if (operationsData[0].nodeInputs.parameterGroups['default']) {
          for (const [key, defaultValue] of Object.entries(channel?.input.default ?? {})) {
            const index = operationsData[0].nodeInputs.parameterGroups['default'].rawInputs.findIndex((item) => item.key === key);
            if (index >= 0) {
              operationsData[0].nodeInputs.parameterGroups['default'].rawInputs[index].value = defaultValue;

              operationsData[0].nodeInputs.parameterGroups['default'].parameters[index].value[0].value = defaultValue as string;
            }
          }
        }

        updatedOperationsData.push(operationsData[0]);
      }

      if (operationOptions.output) {
        if (outputChannelParameters) {
          operationsData[1].nodeInputs = outputChannelParameters;
        } else if (operationsData[1].nodeInputs.parameterGroups['default']) {
          for (const [key, defaultValue] of Object.entries(channel?.output.default ?? {})) {
            const index = operationsData[1].nodeInputs.parameterGroups['default'].rawInputs.findIndex((item) => item.key === key);
            if (index >= 0) {
              operationsData[1].nodeInputs.parameterGroups['default'].rawInputs[index].value = defaultValue;
              operationsData[1].nodeInputs.parameterGroups['default'].parameters[index].value[0].value = defaultValue as string;
            }
          }
        }

        updatedOperationsData.push(operationsData[1]);
      }

      setIsLoading(false);
      dispatch(initializeNodeOperationInputsData(updatedOperationsData));
      // TODO: Need to handle content change
      dispatch(setIsWorkflowParametersDirty(true));
    },
    [dispatch, channel, inputNodeId, outputNodeId, inputChannelParameters, outputChannelParameters]
  );

  return (
    <>
      {supportedChannels.length === 0 || !channel ? (
        <MessageBar key={'warning'} className="msla-initialize-variable-warning">
          <MessageBarBody>{stringResources.NO_CHANNEL_SUPPORTED_MSG}</MessageBarBody>
        </MessageBar>
      ) : (
        <>
          <Switch
            checked={enabled}
            onChange={(_, data: SwitchOnChangeData) => {
              if (data.checked) {
                initializeOperation({ input: true, output: true });
              } else {
                disableOperation({ input: true, output: true });
              }
            }}
            style={{ display: 'flex', marginBottom: '10px' }}
            label={enabled ? stringResources.ENABLED : stringResources.DISABLED}
          />
          {enabled && (
            <>
              <MessageBar messageBarType={MessageBarType.info} isMultiline={true}>
                {stringResources.OUTPUT_CHANNEL_MESSAGE}
              </MessageBar>
              <ChannelContent
                selectedNodeId={selectedNodeId}
                // TODO: Add support for multiple channels
                channelToAdd={channel}
                inputNodeId={inputNodeId}
                outputNodeId={outputNodeId}
                initializeOperation={initializeOperation}
                disableOperation={disableOperation}
                isLoading={isLoading}
              />
            </>
          )}
        </>
      )}
    </>
  );
};

export const channelsTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.CHANNELS,
  title: intl.formatMessage({
    defaultMessage: 'Channels',
    id: '5lEeZZ',
    description: 'Channels tab title',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Configure channels for your agent',
    id: 'MbrpMM',
    description: 'Channels tab description',
  }),
  visible: true,
  content: <ChannelsTab {...props} />,
  order: 0,
  icon: 'Info',
});
