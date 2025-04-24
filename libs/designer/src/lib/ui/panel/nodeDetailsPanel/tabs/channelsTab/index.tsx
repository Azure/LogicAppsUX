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
        defaultMessage: 'No supported channels exist for this agent.',
        id: 'PPvsfZ',
        description: 'Channel not supported message',
      }),
      INPUT_TITLE: intl.formatMessage({
        defaultMessage: 'Enable input channel',
        id: 'YfieDm',
        description: 'Channel input.',
      }),
      OUTPUT_TITLE: intl.formatMessage({
        defaultMessage: 'Enable output channel',
        id: 'BgLF7r',
        description: 'Channel output.',
      }),
      INPUT_OUTPUT_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Send messages to and get responses from the agent while the workflow is running. The workflow continues to run as the agent responds in real time for a conversational-like interaction.',
        id: 'l40RIH',
        description: 'Input and output channel configuration.',
      }),
      INPUT_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Send messages to the agent while the workflow is running. This will keep the agent in running state until the user responds.',
        id: 'zeb1vr',
        description: 'Input channel info config.',
      }),
      CHANNEL_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Channels are where you and the agent can send and receive messages. You can communicate with the agent directly in the chat, or use the URL provided in the response header of your workflow trigger to integrate with a front-end chat interface or chat widget.',
        id: 'jR/Dwl',
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
              readOnly={isLoading}
              checked={!!inputChannelParameters}
              onToggleInputChange={(_, checked?: boolean) => {
                if (checked) {
                  initializeOperation({ input: true, output: false });
                } else {
                  disableOperation({ input: true, output: true });
                }
              }}
              customLabel={getSettingLabel(stringResources.INPUT_TITLE, undefined, stringResources.INPUT_DESCRIPTION)}
              ariaLabel={stringResources.INPUT_TITLE}
            />
            <SettingToggle
              readOnly={isLoading || !inputChannelParameters}
              checked={!!outputChannelParameters}
              onToggleInputChange={(_, checked?: boolean) => {
                if (checked) {
                  initializeOperation({ input: false, output: true });
                } else {
                  disableOperation({ input: false, output: true });
                }
              }}
              customLabel={getSettingLabel(stringResources.OUTPUT_TITLE, undefined, stringResources.INPUT_OUTPUT_DESCRIPTION)}
              ariaLabel={stringResources.OUTPUT_TITLE}
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
