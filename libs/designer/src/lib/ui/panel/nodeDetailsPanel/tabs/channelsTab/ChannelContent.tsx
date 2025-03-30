import { Divider, Spinner } from '@fluentui/react-components';
import { Label } from '@microsoft/designer-ui';
import type { SupportedChannels } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { ParametersTab } from '../parametersTab';
import { initializeOperationDetails } from '../../../../../core/templates/utils/parametershelper';
import { getAllNodeData } from '../../../../../core/configuretemplate/utils/helper';
import { initializeNodeOperationInputsData } from '../../../../../core/state/operation/operationMetadataSlice';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../../../core/store';

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
    channelToAdd: { input, output },
  } = props;
  const [isLoading, setIsLoading] = useState(true);
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

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

    dispatch(initializeNodeOperationInputsData(operationsData));

    setIsLoading(false);
  }, [dispatch, input, inputNodeId, output, outputNodeId]);

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
