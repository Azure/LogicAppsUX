import { Button, Checkbox, Spinner } from '@fluentui/react-components';
import { Label } from '@microsoft/designer-ui';
import type { SupportedChannels } from '@microsoft/logic-apps-shared';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { ParametersTab } from '../parametersTab';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../../core/store';
import { bundleIcon, ChevronDown24Filled, ChevronDown24Regular, ChevronRight24Filled, ChevronRight24Regular } from '@fluentui/react-icons';

const ChevronDownIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);
const ChevronRightIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
interface ChannelContentProps {
  selectedNodeId: string;
  inputNodeId: string;
  outputNodeId: string;
  channelToAdd: SupportedChannels;
  isLoading: boolean;
  initializeOperation: (operationOptions: {
    input: boolean;
    output: boolean;
  }) => Promise<void>;
  disableOperation: (operationOptions: {
    input: boolean;
    output: boolean;
  }) => void;
}
const ChannelContent = (props: ChannelContentProps) => {
  const { inputNodeId, outputNodeId, isLoading, initializeOperation, disableOperation } = props;
  const [expandInputChannel, setExpandInputChannel] = useState(true);
  const [expandOutputChannel, setExpandOutputChannel] = useState(false);
  const intl = useIntl();
  const outputChannelParameters = useSelector((state: RootState) => state.operations.inputParameters[outputNodeId]);

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

  const outputChannelEnabled = useMemo(() => !!outputChannelParameters, [outputChannelParameters]);

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
          {expandInputChannel ? <ParametersTab nodeId={inputNodeId} isPanelPinned={false} isTabReadOnly={true} /> : null}
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
                onChange={(_, checked) => {
                  if (checked) {
                    initializeOperation({ input: false, output: true });
                  } else {
                    disableOperation({ input: false, output: true });
                  }
                }}
              />
            </div>
          </Button>
          {expandOutputChannel ? (
            outputChannelEnabled ? (
              <ParametersTab nodeId={outputNodeId} isPanelPinned={false} isTabReadOnly={true} />
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
