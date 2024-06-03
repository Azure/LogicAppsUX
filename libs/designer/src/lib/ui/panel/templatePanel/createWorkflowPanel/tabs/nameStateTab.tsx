import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';

export const NameStatePanel: React.FC = () => {
  const { manifest } = useSelector((state: RootState) => state.template);

  return isNullOrUndefined(manifest) ? null : (
    <div>
      Overview Tab Placeholder
      <div>Manifest Data: {JSON.stringify(manifest)}</div>
    </div>
  );
};

export const nameStateTab = (intl: IntlShape) => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE,
  title: intl.formatMessage({
    defaultMessage: 'Name and State',
    id: '+sz9Ur',
    description: 'The tab label for the monitoring name and state tab on the create workflow panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Name and State Tab',
    id: 'PEo0hr',
    description: 'An accessability label that describes the name and state tab',
  }),
  visible: true,
  content: <NameStatePanel />,
  order: 2,
  icon: 'Info',
});
