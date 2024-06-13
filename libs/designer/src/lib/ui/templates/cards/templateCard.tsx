import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { changeCurrentTemplateName, loadTemplate } from '../../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import { openQuickViewPanelView } from '../../../core/state/templates/panelSlice';
import { DocumentCard, type IContextualMenuItem, type IContextualMenuProps, IconButton } from '@fluentui/react';
import { ConnectorIcon, ConnectorIconWithName } from '../connections/connector';
import type { Manifest } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/template';
import type { Template } from '@microsoft/logic-apps-shared';
import { normalizeConnectorId } from '../../../core/templates/utils/helper';

interface TemplateCardProps {
  templateName: string;
}

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
  const connectorIds = getUniqueConnectorIds(connections, subscriptionId, location);
  const showOverflow = connectorIds.length > 2;
  const connectorsToShow = showOverflow ? connectorIds.slice(0, 2) : connectorIds;
  const overflowList = showOverflow ? connectorIds.slice(2) : [];
  const onRenderMenuItem = (item: IContextualMenuItem) => <ConnectorIconWithName connectorId={item.key} />;
  const onRenderMenuIcon = () => <div style={{ color: 'grey' }}>{`+${overflowList.length}`}</div>;
  const menuProps: IContextualMenuProps = {
    items: overflowList.map((connectorId) => ({ key: connectorId, text: connectorId, onRender: onRenderMenuItem })),
    directionalHintFixed: true,
  };

  return (
    <DocumentCard className="msla-template-card-wrapper" onClick={onSelectTemplate} aria-label={title}>
      <div className="msla-template-card-data">
        <Text size={400} weight="semibold" align="start" className="msla-template-card-title">
          {title}
        </Text>
        <div className="msla-template-card-tags">
          <Text size={300} className="msla-template-card-tag">
            By: {details['By']}
          </Text>
          <Text size={300} className="msla-template-card-tag">
            Type: {details['Type']}
          </Text>
          <Text size={300} className="msla-template-card-tag">
            Trigger: {details['Trigger']}
          </Text>
        </div>
      </div>
      <hr className="msla-templates-break" />

      <div className="msla-template-card-connectors">
        <Text size={300} weight="medium" align="start" className="msla-template-card-connectors-title">
          Connectors
        </Text>
        <div className="msla-template-card-connectors-list">
          {connectorsToShow.map((connectorId) => (
            <div key={connectorId} className="msla-template-card-connector">
              <ConnectorIcon connectorId={connectorId} />
            </div>
          ))}
          {showOverflow ? (
            <IconButton className="msla-template-card-connector-overflow" onRenderMenuIcon={onRenderMenuIcon} menuProps={menuProps} />
          ) : null}
        </div>
      </div>
    </DocumentCard>
  );
};

const getUniqueConnectorIds = (connections: Record<string, Template.Connection>, subscriptionId: string, location: string): string[] => {
  const result: string[] = [];
  const allConnectorIds = Object.values(connections).map((connection) => connection.connectorId);

  while (allConnectorIds.length > 0) {
    const connectorId = allConnectorIds.shift() as string;
    const normalizedConnectorId = normalizeConnectorId(connectorId, subscriptionId, location).toLowerCase();
    if (!result.includes(normalizedConnectorId)) {
      result.push(normalizedConnectorId);
    }
  }

  return result;
};
