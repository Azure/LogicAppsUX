import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { useIntl, type IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { Text } from '@fluentui/react-components';


export const OverviewPanel: React.FC = () => {
  const intl = useIntl();
  const { manifest } = useSelector((state: RootState) => state.template);

  const detailsTags: Record<string, string> = {
    'Type': intl.formatMessage({
      defaultMessage: 'Solution type',
      id: 'JVNRly',
      description: 'Solution type of the template',
    }),
    'Trigger': intl.formatMessage({
      defaultMessage: 'Trigger type',
      id: 'DcJBUx',
      description: 'Type of the trigger in the template',
    }),
    'By': intl.formatMessage({
      defaultMessage: 'Published by',
      id: 'n+sJ5W',
      description: 'Name of the organization that published this template',
    }),
  }

  return isNullOrUndefined(manifest) ? null : (
    <div className="msla-template-overview">
      <div className="msla-template-overview-section">
        <Text className="msla-template-overview-section-title" >
          {intl.formatMessage({
            defaultMessage: 'Connections included in this template',
            id: 'TnwRGo',
            description: 'Title for the connections section in the template overview tab',
          })}
        </Text>
      </div>
      {manifest.prerequisites ? (
        <div className="msla-template-overview-section">
          <Text className="msla-template-overview-section-title" >
            {intl.formatMessage({
              defaultMessage: 'Prerequisites',
              id: 'Jk2B0i',
              description: 'Title for the prerequisites section in the template overview tab',
            })}
          </Text>
          <Text align="start" className="msla-template-overview-connections">
            {manifest.prerequisites}
          </Text>
        </div>) : null}
      <div className="msla-template-overview-section">
        <Text className="msla-template-overview-section-title" >
          {intl.formatMessage({
            defaultMessage: 'Details',
            id: 'ocW+RF',
            description: 'Title for the details section in the template overview tab',
          })}
        </Text>
        {Object.keys(detailsTags).map((key: string) => {
            return (
              <div className="msla-template-overview-section-detail" key={key}>
                <Text className="msla-template-overview-section-detailkey">
                  {detailsTags[key]}: 
                </Text>
                <Text>{manifest.details[key]}</Text>
              </div>
            );
        })}
      </div>
      {manifest.tags?.length ? (
        <div className="msla-template-overview-section">
          <Text className="msla-template-overview-section-title" >
            {intl.formatMessage({
              defaultMessage: 'Tags',
              id: 'X02GGK',
              description: 'Title for the tags section in the template overview tab',
            })}
          </Text>
          {manifest.tags.map((key: string) => (
              <Text key={key} className="msla-template-overview-section-tag" size={300}>{key}</Text>
            ))}
        </div>) : null }
    </div>
  );
};

export const overviewTab = (intl: IntlShape) => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.OVERVIEW,
  title: intl.formatMessage({
    defaultMessage: 'Overview',
    id: '+YyHKB',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Overview Tab',
    id: 'EJj4E0',
    description: 'An accessability label that describes the oveview tab',
  }),
  visible: true,
  content: <OverviewPanel />,
  order: 1,
  icon: 'Info',
});
