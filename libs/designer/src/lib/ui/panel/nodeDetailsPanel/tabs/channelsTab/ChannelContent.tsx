import { Button, Checkbox, Spinner } from '@fluentui/react-components';
import { Label } from '@microsoft/designer-ui';
import { equals, type SupportedChannels } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { ParametersTab } from '../parametersTab';
import { initializeOperationDetails } from '../../../../../core/templates/utils/parametershelper';
import { getAllNodeData } from '../../../../../core/configuretemplate/utils/helper';
import { deinitializeNodes, initializeNodeOperationInputsData } from '../../../../../core/state/operation/operationMetadataSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { bundleIcon, ChevronDown24Filled, ChevronDown24Regular, ChevronRight24Filled, ChevronRight24Regular } from '@fluentui/react-icons';

const ChevronDownIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);
const ChevronRightIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
interface ChannelContentProps {
  selectedNodeId: string;
  inputNodeId: string;
  outputNodeId: string;
  channelToAdd: SupportedChannels;
}
const ChannelContent = (props: ChannelContentProps) => {
  const {
    inputNodeId,
    outputNodeId,
    selectedNodeId,
    channelToAdd: { input, output },
  } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [expandInputChannel, setExpandInputChannel] = useState(true);
  const [expandOutputChannel, setExpandOutputChannel] = useState(false);
  const [outputChannelEnabled, setOutputChannelEnabled] = useState(false);
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const inputChannelParameters = useSelector((state: RootState) => state.operations.inputParameters[inputNodeId]);
  const outputChannelParameters = useSelector((state: RootState) => state.operations.inputParameters[outputNodeId]);
  const supportedChannels = useSelector((state: RootState) => state.operations.supportedChannels[selectedNodeId]);

  const stringResources = useMemo(
    () => ({
      INPUT: intl.formatMessage({
        defaultMessage: 'Input',
        id: 'hA0xN1',
        description: 'Channel input.',
      }),
      OUTPUT: intl.formatMessage({
        defaultMessage: 'Output',
        id: 'EX5m8u',
        description: 'Channel output.',
      }),
      ENABLE_OUTPUT_CHANNEL: intl.formatMessage({
        defaultMessage: 'Enable output channel',
        id: 'nJJGAM',
        description: 'Enable channel.',
      }),
      NO_OUTPUT_CHANNEL_MSG: intl.formatMessage({
        defaultMessage: 'No output channel enabled.',
        id: 'v8S8UX',
        description: 'Output channel not supported message',
      }),
    }),
    [intl]
  );

  const initializeOperation = useCallback(
    async (enableOperations: { input: boolean; output: boolean }) => {
      const { type: inputOperationType } = input;
      const { type: outputOperationType } = output;

      const channel = supportedChannels.find(
        (channel) => equals(channel.input.type, inputOperationType, true) && equals(channel.output.type, outputOperationType, true)
      );

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

      if (enableOperations.input) {
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

      if (enableOperations.output) {
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

      dispatch(initializeNodeOperationInputsData(updatedOperationsData));

      setIsLoading(false);
    },
    [dispatch, input, inputNodeId, output, outputNodeId, inputChannelParameters, outputChannelParameters, supportedChannels]
  );

  const toggleOutputChannel = useCallback(() => {
    if (outputChannelEnabled) {
      // disable output channel
      dispatch(deinitializeNodes([outputNodeId]));
    } else {
      // enable output channel
      initializeOperation({ input: false, output: true });
    }

    setOutputChannelEnabled(!outputChannelEnabled);
    // Expand output channel if it is enabled or collapse it if it is disabled
    setExpandOutputChannel(!outputChannelEnabled);
  }, [dispatch, initializeOperation, outputChannelEnabled, outputNodeId]);

  useEffect(() => {
    setOutputChannelEnabled(!!outputChannelParameters);
  }, [outputChannelParameters]);

  useEffect(() => {
    initializeOperation({ input: true, output: outputChannelEnabled });
  }, [initializeOperation, outputChannelEnabled]);
  return isLoading ? (
    <Spinner size={'extra-tiny'} />
  ) : (
    <div>
      <div className="msla-setting-section">
        <div className="msla-setting-section-content">
          <Button
            className="msla-setting-section-header"
            onClick={() => {
              setExpandInputChannel(!expandInputChannel);
            }}
            icon={expandInputChannel ? <ChevronDownIcon /> : <ChevronRightIcon />}
            appearance={'subtle'}
          >
            <Label id={'input-channel-label'} isRequiredField={true} text={stringResources.INPUT} />
          </Button>
          {expandInputChannel ? <ParametersTab nodeId={inputNodeId} isPanelPinned={false} /> : null}
        </div>
      </div>

      <div className="msla-setting-section">
        <div className="msla-setting-section-content">
          <Button
            className="msla-setting-section-header"
            onClick={() => {
              setExpandOutputChannel(!expandOutputChannel);
            }}
            icon={expandOutputChannel ? <ChevronDownIcon /> : <ChevronRightIcon />}
            appearance={'subtle'}
          >
            <Label id={'input-channel-label'} text={stringResources.OUTPUT} />
            <div className="msla-setting-section-settings-action-items">
              <Checkbox
                label={stringResources.ENABLE_OUTPUT_CHANNEL}
                checked={outputChannelEnabled}
                onChange={(_, _checked) => toggleOutputChannel()}
              />
            </div>
          </Button>
          {expandOutputChannel ? (
            outputChannelEnabled ? (
              <ParametersTab nodeId={outputNodeId} isPanelPinned={false} />
            ) : (
              <div className="msla-setting-section-settings">{stringResources.NO_OUTPUT_CHANNEL_MSG}</div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ChannelContent;
