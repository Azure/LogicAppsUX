import { Divider, Spinner } from '@fluentui/react-components';
import { Label } from '@microsoft/designer-ui';
import { equals, type SupportedChannels } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { ParametersTab } from '../parametersTab';
import { initializeOperationDetails } from '../../../../../core/templates/utils/parametershelper';
import { getAllNodeData } from '../../../../../core/configuretemplate/utils/helper';
import { initializeNodeOperationInputsData } from '../../../../../core/state/operation/operationMetadataSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../../core/store';

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
    }),
    [intl]
  );

  const initializeOperation = useCallback(async () => {
    setIsLoading(true);
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

    console.log('Data:: ', operationsData);

    dispatch(initializeNodeOperationInputsData(operationsData));

    setIsLoading(false);
  }, [dispatch, input, inputNodeId, output, outputNodeId, inputChannelParameters, outputChannelParameters, supportedChannels]);

  useEffect(() => {
    initializeOperation();
  }, [initializeOperation]);
  return isLoading ? (
    <Spinner size={'extra-tiny'} />
  ) : (
    <>
      <div className="msla-input-parameter-label msla-channel-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Label id={'input-channel-label'} isRequiredField={true} text={stringResources.INPUT} />
      </div>
      <Divider className="msla-setting-section-divider msla-channel-section-divider" />
      <ParametersTab nodeId={inputNodeId} isPanelPinned={false} />
      <div className="msla-input-parameter-label msla-channel-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Label id={'input-channel-label'} isRequiredField={true} text={stringResources.OUTPUT} />
      </div>
      <Divider className="msla-setting-section-divider msla-channel-section-divider" />
      <ParametersTab nodeId={outputNodeId} isPanelPinned={false} />
    </>
  );
};

export default ChannelContent;
