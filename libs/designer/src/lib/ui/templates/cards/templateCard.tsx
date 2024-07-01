import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { changeCurrentTemplateName, loadTemplate } from '../../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import { openQuickViewPanelView } from '../../../core/state/templates/panelSlice';
import { DocumentCard, type IContextualMenuItem, type IContextualMenuProps, IconButton } from '@fluentui/react';
import { ConnectorIcon, ConnectorIconWithName } from '../connections/connector';
import type { Manifest } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/template';
import { getUniqueConnectors } from '../../../core/templates/utils/helper';
import { useIntl } from 'react-intl';
import { getBuiltInOperationInfo, isBuiltInOperation } from '@microsoft/logic-apps-shared';

interface TemplateCardProps {
  templateName: string;
}

const maxConnectorsToShow = 5;

export const TemplateCard = ({ templateName }: TemplateCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { templates, subscriptionId, location } = useSelector((state: RootState) => ({
    templates: state.manifest.availableTemplates,
    subscriptionId: state.workflow.subscriptionId,
    location: state.workflow.location,
  }));
  const templateManifest = templates?.[templateName];

  const onSelectTemplate = () => {
    dispatch(changeCurrentTemplateName(templateName));
    dispatch(loadTemplate(templateManifest));
    dispatch(openQuickViewPanelView());
  };

  if (!templateManifest) {
    return <DocumentCard className="msla-template-card-wrapper">{intl.formatMessage({ defaultMessage: 'Loading....', description: 'Loading text', id: 'cZ60Tk'})}</DocumentCard>;
  }

  const { title, details, featuredOperations, connections } = templateManifest as Manifest;
  const connectorsFromConnections = getUniqueConnectors(connections, subscriptionId, location).map(connection => connection.connectorId);
  const connectorsFeatured = getFeaturedConnectors(featuredOperations);
  const allConnectors = connectorsFromConnections.concat(connectorsFeatured);
  const showOverflow = allConnectors.length > maxConnectorsToShow;
  const connectorsToShow = showOverflow ? allConnectors.slice(0, maxConnectorsToShow) : allConnectors;
  const overflowList = showOverflow ? allConnectors.slice(maxConnectorsToShow) : [];
  const onRenderMenuItem = (item: IContextualMenuItem) => (
    <ConnectorIconWithName
      connectorId={item.key}
      classes={{
        root: 'msla-template-connector-menuitem',
        icon: 'msla-template-connector-menuitem-icon',
        text: 'msla-template-connector-menuitem-text',
      }}
    />
  );
  const onRenderMenuIcon = () => <div style={{ color: 'grey' }}>{`+${overflowList.length}`}</div>;
  const menuProps: IContextualMenuProps = {
    items: overflowList.map(connectorId => ({ key: connectorId, text: connectorId, onRender: onRenderMenuItem })),
    directionalHintFixed: true,
    className: 'msla-template-card-connector-menu-box',
  };

  return (
    <DocumentCard className="msla-template-card-wrapper" onClick={onSelectTemplate} aria-label={title}>
      <div className="msla-template-card-data">
        <Text size={400} weight="semibold" align="start" className="msla-template-card-title">
          {title}
        </Text>
        <div className="msla-template-card-tags">
          {Object.keys(details).map((key: string) => {
            return (
              <Text key={key} size={300} className="msla-template-card-tag">
                {key}: {details[key]}
              </Text>
            );
          })}
        </div>
      </div>
      <hr className="msla-templates-break" />

      <div className="msla-template-card-connectors">
        <Text size={300} weight="medium" align="start" className="msla-template-card-connectors-title">
          {intl.formatMessage({ defaultMessage: 'Connectors', description: 'Connectors section title', id: '0OC7ag'})}
        </Text>
        <div className="msla-template-card-connectors-list">
          {connectorsToShow.map(connectorId => (
            <ConnectorIcon
              key={connectorId}
              connectorId={connectorId}
              classes={{ root: 'msla-template-card-connector', icon: 'msla-template-card-connector-icon' }}
            />
          ))}
          {showOverflow ? (
            <IconButton className="msla-template-card-connector-overflow" onRenderMenuIcon={onRenderMenuIcon} menuProps={menuProps} />
          ) : null}
        </div>
      </div>
    </DocumentCard>
  );
};

const getFeaturedConnectors = (operationInfos: { type: string; kind?: string; }[] = []): string[] => {
  return (operationInfos.map(info => {
    if (isBuiltInOperation(info)) {
      const { connectorId } = getBuiltInOperationInfo(info, /* isTrigger */false);
      return connectorId
    }

    return undefined;
  })).filter(connectorId => connectorId !== undefined) as string[];
}
