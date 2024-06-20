import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { changeCurrentTemplateName, loadTemplate } from '../../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import { openQuickViewPanelView } from '../../../core/state/templates/panelSlice';
import { DocumentCard, type IContextualMenuItem, type IContextualMenuProps, IconButton } from '@fluentui/react';
import { ConnectorIcon, ConnectorIconWithName } from '../connections/connector';
import type { Manifest } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/template';
import { getUniqueConnectors } from '../../../core/templates/utils/helper';

interface TemplateCardProps {
  templateName: string;
}

const maxConnectorsToShow = 5;

export const TemplateCard = ({ templateName }: TemplateCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
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
    return <DocumentCard className="msla-template-card-wrapper">Loading....</DocumentCard>;
  }

  const { title, details, connections } = templateManifest as Manifest;
  const connectors = getUniqueConnectors(connections, subscriptionId, location);
  const showOverflow = connectors.length > maxConnectorsToShow;
  const connectorsToShow = showOverflow ? connectors.slice(0, maxConnectorsToShow) : connectors;
  const overflowList = showOverflow ? connectors.slice(maxConnectorsToShow) : [];
  const onRenderMenuItem = (item: IContextualMenuItem) => <ConnectorIconWithName connectorId={item.key} />;
  const onRenderMenuIcon = () => <div style={{ color: 'grey' }}>{`+${overflowList.length}`}</div>;
  const menuProps: IContextualMenuProps = {
    items: overflowList.map((connector) => ({ key: connector.connectorId, text: connector.connectorId, onRender: onRenderMenuItem })),
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
          Connectors
        </Text>
        <div className="msla-template-card-connectors-list">
          {connectorsToShow.map((connector) => (
            <ConnectorIcon
              key={connector.connectorId}
              connectorId={connector.connectorId}
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
