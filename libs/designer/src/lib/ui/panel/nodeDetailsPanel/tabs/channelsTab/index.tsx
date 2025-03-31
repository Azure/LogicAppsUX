import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import constants from '../../../../../common/constants';
import { MessageBarBody, Switch, type SwitchOnChangeData } from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../../core/store';
import { MessageBar } from '@fluentui/react';
import ChannelContent from './ChannelContent';
import type { SupportedChannels } from '@microsoft/logic-apps-shared';
import { deinitializeNodes } from '../../../../../core/state/operation/operationMetadataSlice';

export const ChannelsTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const dispatch = useDispatch<AppDispatch>();
  const supportedChannels = useSelector((state: RootState) => state.operations.supportedChannels[selectedNodeId]);
  const [channel, _setChannel] = useState<SupportedChannels | undefined>(supportedChannels.length > 0 ? supportedChannels[0] : undefined);
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

  const [enabled, setEnabled] = useState(false);

  const intl = useIntl();

  const disableChannel = useCallback(() => {
    dispatch(deinitializeNodes([outputNodeId, inputNodeId]));
    setEnabled(false);
  }, [dispatch, inputNodeId, outputNodeId]);

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
    }),
    [intl]
  );

  useEffect(() => {
    setEnabled(!!inputChannelParameters || !!outputChannelParameters);
  }, [inputChannelParameters, outputChannelParameters]);
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
                setEnabled(true);
              } else {
                disableChannel();
              }
            }}
            style={{ display: 'flex', marginBottom: '10px' }}
            label={enabled ? stringResources.ENABLED : stringResources.DISABLED}
          />
          {enabled && (
            <ChannelContent
              selectedNodeId={selectedNodeId}
              // TODO: Add support for multiple channels
              channelToAdd={channel}
              inputNodeId={inputNodeId}
              outputNodeId={outputNodeId}
            />
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
