import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { changeCurrentTemplateName, loadTemplate } from '../../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import { openQuickViewPanelView } from '../../../core/state/templates/panelSlice';
import type { IContextualMenuItem, IContextualMenuProps, IDocumentCardStyles } from '@fluentui/react';
import { DocumentCard, IconButton } from '@fluentui/react';
import { ConnectorIcon, ConnectorIconWithName } from '../connections/connector';
import type { Manifest } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/template';
import { getUniqueConnectors } from '../../../core/templates/utils/helper';
import { useIntl } from 'react-intl';
import type { OperationInfo } from '@microsoft/logic-apps-shared';
import { getBuiltInOperationInfo, isBuiltInOperation, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

interface TemplateCardProps {
  templateName: string;
}

const maxConnectorsToShow = 5;

export const TemplateCard = ({ templateName }: TemplateCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { templates, subscriptionId, workflowAppName, location } = useSelector((state: RootState) => ({
    templates: state.manifest.availableTemplates,
    subscriptionId: state.workflow.subscriptionId,
    workflowAppName: state.workflow.workflowAppName,
    location: state.workflow.location,
  }));
  const templateManifest = templates?.[templateName];

  const onSelectTemplate = () => {
    LoggerService().log({
      level: LogEntryLevel.Trace,
      area: 'Templates.TemplateCard',
      message: 'Template is selected',
      args: [templateName, workflowAppName],
    });
    dispatch(changeCurrentTemplateName(templateName));
    dispatch(loadTemplate(templateManifest));
    dispatch(openQuickViewPanelView());
  };

  if (!templateManifest) {
    return (
      <DocumentCard className="msla-template-card-wrapper">
        {intl.formatMessage({ defaultMessage: 'Loading....', description: 'Loading text', id: 'cZ60Tk' })}
      </DocumentCard>
    );
  }

  const { title, details, featuredOperations, connections } = templateManifest as Manifest;
  const connectorsFromConnections = getUniqueConnectors(connections, subscriptionId, location).map((connection) => ({
    connectorId: connection.connectorId,
    operationId: undefined,
  })) as { connectorId: string; operationId: string | undefined }[];
  const connectorsFeatured = getFeaturedConnectors(featuredOperations);
  const allConnectors = connectorsFromConnections.concat(connectorsFeatured);
  const showOverflow = allConnectors.length > maxConnectorsToShow;
  const connectorsToShow = showOverflow ? allConnectors.slice(0, maxConnectorsToShow) : allConnectors;
  const overflowList = showOverflow ? allConnectors.slice(maxConnectorsToShow) : [];
  const onRenderMenuItem = (item: IContextualMenuItem) => (
    <ConnectorIconWithName
      connectorId={item.key}
      operationId={item.data.operationId}
      classes={{
        root: 'msla-template-connector-menuitem',
        icon: 'msla-template-connector-menuitem-icon',
        text: 'msla-template-connector-menuitem-text',
      }}
    />
  );
  const onRenderMenuIcon = () => <div style={{ color: 'grey' }}>{`+${overflowList.length}`}</div>;
  const menuProps: IContextualMenuProps = {
    items: overflowList.map((info) => ({ key: info.connectorId, text: info.connectorId, data: info, onRender: onRenderMenuItem })),
    directionalHintFixed: true,
    className: 'msla-template-card-connector-menu-box',
  };

  const cardStyles: IDocumentCardStyles = {
    root: { display: 'inline-block', maxWidth: 1000 },
  };

  return (
    <DocumentCard className="msla-template-card-wrapper" styles={cardStyles} onClick={onSelectTemplate} aria-label={title}>
      <div className="msla-template-card-data">
        <Text size={400} weight="semibold" align="start" className="msla-template-card-title">
          {title}
        </Text>
        <div className="msla-template-card-tags">
          {['By', 'Type', 'Trigger'].map((key: string) => {
            if (!details[key]) {
              return null;
            }
            return (
              <Text key={key} size={300} className="msla-template-card-tag">
                {key}: {details[key]}
              </Text>
            );
          })}
        </div>
      </div>

      <hr className="msla-templates-break" />

      <div className="msla-template-card-connectors-wrapper">
        <div className="msla-template-card-connectors">
          <Text size={300} weight="medium" align="start" className="msla-template-card-connectors-title">
            {intl.formatMessage({ defaultMessage: 'Connectors', description: 'Connectors section title', id: '0OC7ag' })}
          </Text>
          <div className="msla-template-card-connectors-list">
            {connectorsToShow.length > 0 ? (
              connectorsToShow.map((info) => (
                <ConnectorIcon
                  key={info.connectorId}
                  connectorId={info.connectorId}
                  operationId={info.operationId}
                  classes={{ root: 'msla-template-card-connector', icon: 'msla-template-card-connector-icon' }}
                />
              ))
            ) : (
              <Text className="msla-template-card-connectors-emptyText">
                {intl.formatMessage({
                  defaultMessage: 'This template does not have connectors',
                  description: 'Accessibility text to inform user this template does not contain connectors',
                  id: 'aI9W5L',
                })}
              </Text>
            )}
            {showOverflow ? (
              <IconButton className="msla-template-card-connector-overflow" onRenderMenuIcon={onRenderMenuIcon} menuProps={menuProps} />
            ) : null}
          </div>
        </div>
      </div>
    </DocumentCard>
  );
};

const getFeaturedConnectors = (operationInfos: { type: string; kind?: string }[] = []): OperationInfo[] => {
  return operationInfos
    .map((info) => {
      if (isBuiltInOperation(info)) {
        return getBuiltInOperationInfo(info, /* isTrigger */ false);
      }

      return undefined;
    })
    .filter((info) => info !== undefined) as OperationInfo[];
};
