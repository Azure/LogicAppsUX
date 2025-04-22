import { getSettingLabel, SettingToggle, type PanelTabFn, type PanelTabProps } from '@microsoft/designer-ui';
import constants from '../../../../../common/constants';
import { MessageBarBody } from '@fluentui/react-components';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../../core/store';
import { Link, MessageBar } from '@fluentui/react';
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
      NO_CHANNEL_SUPPORTED_MSG: intl.formatMessage({
        defaultMessage: 'No channel supported for this agent.',
        id: 'di6MC0',
        description: 'channel not supported message',
      }),
      INPUT_OUTPUT_TITLE: intl.formatMessage({
        defaultMessage: 'Enable both input and output channel',
        id: 'KO3EeY',
        description: 'Channel input/output.',
      }),
      INPUT_OUTPUT_INFO: intl.formatMessage({
        defaultMessage:
          'The agent stays active and responsive throughout the session, awaiting input and generating output until the user explicitly stops the run.',
        id: '9VE4qe',
        description: 'Input and output channel info config.',
      }),
      INPUT_OUTPUT_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Enabling both input and output channels allows for seamless, real-time interaction with the agent, facilitating the development of conversational experiences.',
        id: 'Bj6h0r',
        description: 'Input and output channel configuration.',
      }),
      INPUT_TITLE: intl.formatMessage({
        defaultMessage: 'Enable only input channel',
        id: 'v4oypz',
        description: 'Channel input.',
      }),
      INPUT_INFO: intl.formatMessage({
        defaultMessage:
          'The agent stays idle but active, waiting for user input. Once input is received, it proceeds to process the data and continue through the workflow.',
        id: 'tBK+HP',
        description: 'Input channel info config.',
      }),
      INPUT_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Configuring only the input channel enables you to send messages to the agent while maintaining an active workflow.',
        id: 'Y+cxTz',
        description: 'Input channel configuration.',
      }),
      CHANNEL_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Configuring channels for your agent will help you communicate with the agent. We will automatically configure the details for you upon enabling the channel.',
        id: 'op3Gy7',
        description: 'Channel description.',
      }),
      LEARN_MORE: intl.formatMessage({
        defaultMessage: 'Learn more',
        id: 'M2ICLg',
        description: 'Learn more about channels.',
      }),
    }),
    [intl]
  );

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
        <div className="msla-channel-settings-container">
          <div className="msla-channel-title-description">
            {stringResources.CHANNEL_DESCRIPTION} <Link href={'https://aka.ms/agent-channels'}>{stringResources.LEARN_MORE}</Link>
          </div>
          <div className="msla-channel-settings">
            <SettingToggle
              disabled={isLoading}
              readOnly={false}
              checked={!!inputChannelParameters && !!outputChannelParameters}
              onToggleInputChange={(_, checked?: boolean) => {
                if (checked) {
                  initializeOperation({ input: true, output: true });
                } else {
                  disableOperation({ input: true, output: true });
                }
              }}
              customLabel={getSettingLabel(
                stringResources.INPUT_OUTPUT_TITLE,
                stringResources.INPUT_OUTPUT_INFO,
                stringResources.INPUT_OUTPUT_DESCRIPTION
              )}
              ariaLabel={stringResources.INPUT_OUTPUT_TITLE}
            />
            <SettingToggle
              disabled={isLoading}
              readOnly={false}
              checked={!!inputChannelParameters && !outputChannelParameters}
              onToggleInputChange={(_, checked?: boolean) => {
                if (checked) {
                  initializeOperation({ input: true, output: false });
                  disableOperation({ input: false, output: true });
                } else {
                  disableOperation({ input: true, output: true });
                }
              }}
              customLabel={getSettingLabel(stringResources.INPUT_TITLE, stringResources.INPUT_INFO, stringResources.INPUT_DESCRIPTION)}
              ariaLabel={stringResources.INPUT_TITLE}
            />
          </div>
        </div>
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
