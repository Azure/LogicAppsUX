import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import constants from '../../../../../common/constants';
import { Switch, type SwitchOnChangeData } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export const ChannelsTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const [channelAdded, setChannelAdded] = useState(false);

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
    }),
    [intl]
  );

  return (
    <>
      <div>{selectedNodeId}</div>
      <Switch
        checked={channelAdded}
        onChange={(_, data: SwitchOnChangeData) => {
          setChannelAdded(data.checked);
        }}
        label={channelAdded ? stringResources.ENABLED : stringResources.DISABLED}
      />
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
