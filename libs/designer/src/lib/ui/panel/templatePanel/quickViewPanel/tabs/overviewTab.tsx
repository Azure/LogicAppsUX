import { type Template, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { useIntl, type IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { closePanel, openCreateWorkflowPanelView } from '../../../../../core/state/templates/panelSlice';
import { Text } from '@fluentui/react-components';
import { getUniqueConnectors } from '../../../../../core/templates/utils/helper';
import { List } from '@fluentui/react';
import { ConnectorWithDetails } from '../../../../../ui/templates/connections/connector';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';

export const OverviewPanel: React.FC = () => {
  const intl = useIntl();
  const { manifest } = useSelector((state: RootState) => state.template);
  const templateHasConnections = Object.keys(manifest?.connections || {}).length > 0;
  const detailsTags: Record<string, string> = {
    Type: intl.formatMessage({
      defaultMessage: 'Solution type',
      id: 'JVNRly',
      description: 'Solution type of the template',
    }),
    Trigger: intl.formatMessage({
      defaultMessage: 'Trigger type',
      id: 'DcJBUx',
      description: 'Type of the trigger in the template',
    }),
    By: intl.formatMessage({
      defaultMessage: 'Published by',
      id: 'n+sJ5W',
      description: 'Name of the organization that published this template',
    }),
  };

  return isNullOrUndefined(manifest) ? null : (
    <div className="msla-template-overview">
      <div className="msla-template-overview-section">
        <Text className="msla-template-overview-section-title" style={templateHasConnections ? undefined : { marginBottom: '-30px' }}>
          {templateHasConnections
            ? intl.formatMessage({
                defaultMessage: 'Connections included in this template',
                id: 'TnwRGo',
                description: 'Title for the connections section in the template overview tab',
              })
            : intl.formatMessage({
                defaultMessage: 'No connections are needed in this template',
                id: 'j2v8BE',
                description: 'Text to show no connections present in the template.',
              })}
        </Text>
        {templateHasConnections ? <Connections connections={manifest.connections} /> : null}
      </div>
      {manifest.prerequisites ? (
        <div className="msla-template-overview-section">
          <Text className="msla-template-overview-section-title">
            {intl.formatMessage({
              defaultMessage: 'Prerequisites',
              id: 'Jk2B0i',
              description: 'Title for the prerequisites section in the template overview tab',
            })}
          </Text>
          <Text align="start" className="msla-template-overview-connections">
            {manifest.prerequisites}
          </Text>
        </div>
      ) : null}
      <div className="msla-template-overview-section">
        <Text className="msla-template-overview-section-title">
          {intl.formatMessage({
            defaultMessage: 'Details',
            id: 'ocW+RF',
            description: 'Title for the details section in the template overview tab',
          })}
        </Text>
        {Object.keys(detailsTags).map((key: string) => {
          return (
            <div className="msla-template-overview-section-detail" key={key}>
              <Text className="msla-template-overview-section-detailkey">{detailsTags[key]}:</Text>
              <Text>{manifest.details[key]}</Text>
            </div>
          );
        })}
      </div>
      {manifest.tags?.length ? (
        <div className="msla-template-overview-section">
          <Text className="msla-template-overview-section-title">
            {intl.formatMessage({
              defaultMessage: 'Tags',
              id: 'X02GGK',
              description: 'Title for the tags section in the template overview tab',
            })}
          </Text>
          {manifest.tags.map((key: string) => (
            <Text key={key} className="msla-template-overview-section-tag" size={300}>
              {key}
            </Text>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const overviewTab = (intl: IntlShape, dispatch: AppDispatch): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.OVERVIEW,
  title: intl.formatMessage({
    defaultMessage: 'Overview',
    id: '+YyHKB',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  hasError: false,
  content: <OverviewPanel />,
  order: 1,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Create a workflow with this template',
      id: 'wGkH/j',
      description: 'Button text to create workflow from this template',
    }),
    primaryButtonOnClick: () => {
      dispatch(openCreateWorkflowPanelView());
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Close',
      id: 'FTrMxN',
      description: 'Button text for closing the panel',
    }),
    secondaryButtonOnClick: () => {
      dispatch(closePanel());
      dispatch(clearTemplateDetails());
    },
  },
});

const Connections = (props: { connections: Record<string, Template.Connection> }): JSX.Element => {
  const { subscriptionId, location } = useSelector((state: RootState) => state.workflow);
  const connectors = getUniqueConnectors(props.connections, subscriptionId, location);

  const onRenderCell = (item: Template.Connection | undefined): JSX.Element => {
    if (!item) {
      return <div>No data</div>;
    }

    return (
      <div className="msla-template-overview-connection">
        <ConnectorWithDetails connectorId={item.connectorId} kind={item.kind} />
      </div>
    );
  };

  return (
    <div className="msla-template-overview-connections">
      <List items={connectors} onRenderCell={onRenderCell} />
    </div>
  );
};
