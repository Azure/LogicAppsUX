import { getSettingLabel, type PanelTabFn, type PanelTabProps } from '@microsoft/designer-ui';
import constants from '../../../../../common/constants';
import { MessageBarBody, Radio, RadioGroup, type RadioGroupOnChangeData } from '@fluentui/react-components';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../../core/store';
import { Link, MessageBar, MessageBarType } from '@fluentui/react';
import { deinitializeNodes, initializeNodeOperationInputsData } from '../../../../../core/state/operation/operationMetadataSlice';
import { getAllNodeData } from '../../../../../core/configuretemplate/utils/helper';
import { initializeOperationDetails } from '../../../../../core/templates/utils/parametershelper';
import { setIsWorkflowParametersDirty } from '../../../../../core/state/workflowparameters/workflowparametersSlice';
import { useSupportedChannels } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { equals } from '@microsoft/logic-apps-shared';

export const ChannelsTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const dispatch = useDispatch<AppDispatch>();
  const supportedChannels = useSupportedChannels(selectedNodeId);
  const channel = useMemo(() => (supportedChannels.length > 0 ? supportedChannels[0] : undefined), [supportedChannels]);
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

  const agentIdWhereChannelIsEnabled = useSelector((state: RootState) => {
    const keys = Object.keys(state.operations.inputParameters);
    const inputChannelSuffix = `${constants.CHANNELS.INPUT}${channel?.input?.type}`;
    const channelEnabled = keys.find((key) => key.endsWith(inputChannelSuffix)) ?? '';

    return channelEnabled.split(inputChannelSuffix)[0];
  });

  const channelEnabledForDifferentAgent = useMemo(
    () => !!agentIdWhereChannelIsEnabled && !equals(agentIdWhereChannelIsEnabled, selectedNodeId),
    [agentIdWhereChannelIsEnabled, selectedNodeId]
  );

  const outputChannelParameters = useSelector((state: RootState) => state.operations.inputParameters[outputNodeId]);

  const intl = useIntl();

  const stringResources = useMemo(
    () => ({
      NO_CHANNEL_SUPPORTED_MSG: intl.formatMessage({
        defaultMessage: 'No supported channels exist for this agent.',
        id: 'PPvsfZ',
        description: 'Channel not supported message',
      }),
      CHANNEL_ALREADY_ENABLED: intl.formatMessage(
        {
          defaultMessage:
            'You can only enable channels for one of the agents in your workflow. Channels are already enabled for the agent - {agentId}. Please disable the channels there to enable it for this agent.',
          id: 'sAXmUk',
          description: 'Channel already enabled message',
        },
        { agentId: agentIdWhereChannelIsEnabled }
      ),
      INPUT_TITLE: intl.formatMessage({
        defaultMessage: 'Allow only input channels',
        id: 'oxvDB0',
        description: 'Channel input.',
      }),
      INPUT_OUTPUT_TITLE: intl.formatMessage({
        defaultMessage: 'Allow both input and output channels',
        id: 'XsgpXt',
        description: 'Channel input/output.',
      }),
      INPUT_OUTPUT_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Send messages to and get responses from the agent while the workflow is running. The workflow continues to run as the agent responds in real time for a conversational-like interaction.',
        id: 'l40RIH',
        description: 'Input and output channel configuration.',
      }),
      INPUT_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Send messages to the agent while the workflow is running. This will pause the workflow until the agent processes the input.',
        id: 'Gup8o6',
        description: 'Input channel info config.',
      }),
      CHANNEL_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Channels are where you and the agent can send and receive messages. You can communicate with the agent directly in the chat, or use the URL provided in the response header of your workflow trigger to integrate with a front-end chat interface or chat widget.',
        id: 'jR/Dwl',
        description: 'Channel description.',
      }),
      NO_CHANNEL_TITLE: intl.formatMessage({
        defaultMessage: 'Do not allow channels',
        id: 'Iasy6i',
        description: 'No channel selected.',
      }),
      NO_CHANNEL_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Disable all channels. The agent will not be able to send or receive messages directly from the user while running.',
        id: 'ag7IUL',
        description: 'No channel selected.',
      }),
      LEARN_MORE: intl.formatMessage({
        defaultMessage: 'Learn more',
        id: 'M2ICLg',
        description: 'Learn more about channels.',
      }),
    }),
    [intl, agentIdWhereChannelIsEnabled]
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
      dispatch(initializeNodeOperationInputsData({ nodesData: updatedOperationsData }));
      // TODO: Need to handle content change
      dispatch(setIsWorkflowParametersDirty(true));
    },
    [dispatch, channel, inputNodeId, outputNodeId, inputChannelParameters, outputChannelParameters]
  );

  const onOptionChange = useCallback(
    (option: string) => {
      if (option === 'none') {
        disableOperation({ input: true, output: true });
      } else if (option === 'input') {
        initializeOperation({ input: true, output: false });
        disableOperation({ input: false, output: true });
      } else if (option === 'input-ouput') {
        initializeOperation({ input: true, output: true });
      }
    },
    [disableOperation, initializeOperation]
  );

  return (
    <>
      {supportedChannels.length === 0 || !channel ? (
        <MessageBar key={'warning-no-channel'} className="msla-initialize-variable-warning">
          <MessageBarBody>{stringResources.NO_CHANNEL_SUPPORTED_MSG}</MessageBarBody>
        </MessageBar>
      ) : (
        <div className="msla-channel-settings-container" style={{ marginBottom: '15px', fontStyle: 'italic', fontSize: 10 }}>
          {channelEnabledForDifferentAgent ? (
            <MessageBar
              key={'warning-existing-channel'}
              className="msla-initialize-variable-warning"
              messageBarType={MessageBarType.warning}
            >
              <MessageBarBody>{stringResources.CHANNEL_ALREADY_ENABLED}</MessageBarBody>
            </MessageBar>
          ) : null}
          <div className="msla-channel-title-description">
            {stringResources.CHANNEL_DESCRIPTION}{' '}
            <Link href={'https://aka.ms/agent-channels'} target="_blank" style={{ fontSize: 12, fontStyle: 'italic' }}>
              {stringResources.LEARN_MORE}
            </Link>
          </div>
          <div className="msla-channel-settings">
            <RadioGroup
              value={inputChannelParameters && outputChannelParameters ? 'input-ouput' : inputChannelParameters ? 'input' : 'none'}
              className={'msla-channel-settings-radio-group'}
              required={true}
              disabled={isLoading || channelEnabledForDifferentAgent}
              onChange={(_e: any, option: RadioGroupOnChangeData) => onOptionChange(option.value)}
            >
              <Radio
                className={'msla-channel-settings-radio'}
                value={'input-ouput'}
                key={'input-output'}
                label={getSettingLabel(stringResources.INPUT_OUTPUT_TITLE, undefined, stringResources.INPUT_OUTPUT_DESCRIPTION)}
              />
              <Radio
                className={'msla-channel-settings-radio'}
                value={'input'}
                key={'input'}
                label={getSettingLabel(stringResources.INPUT_TITLE, undefined, stringResources.INPUT_DESCRIPTION)}
              />
              <Radio
                className={'msla-channel-settings-radio'}
                value={'none'}
                key={'none'}
                label={getSettingLabel(stringResources.NO_CHANNEL_TITLE, undefined, stringResources.NO_CHANNEL_DESCRIPTION)}
              />
            </RadioGroup>
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
