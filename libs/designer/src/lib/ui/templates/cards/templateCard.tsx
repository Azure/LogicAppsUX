import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { changeCurrentTemplateName, loadTemplate } from '../../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import { openQuickViewPanelView } from '../../../core/state/templates/panelSlice';
import type { IContextualMenuItem, IContextualMenuProps, IDocumentCardStyles } from '@fluentui/react';
import { DocumentCard, IconButton, Image } from '@fluentui/react';
import { ConnectorIcon, ConnectorIconWithName } from '../connections/connector';
import type { Manifest } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/template';
import { getUniqueConnectors } from '../../../core/templates/utils/helper';
import { useIntl } from 'react-intl';
import type { OperationInfo } from '@microsoft/logic-apps-shared';
import { equals, getBuiltInOperationInfo, isBuiltInOperation, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import MicrosoftIcon from '../../../common/images/templates/microsoft.svg';
import { PeopleCommunity16Regular } from '@fluentui/react-icons';

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

  const intlText = {
    TEMPLATE_LOADING: intl.formatMessage({ defaultMessage: 'Loading....', description: 'Loading text', id: 'cZ60Tk' }),
    NO_CONNECTORS: intl.formatMessage({
      defaultMessage: 'This template does not have connectors',
      description: 'Accessibility text to inform user this template does not contain connectors',
      id: 'aI9W5L',
    }),
    COMMUNITY_AUTHORED: intl.formatMessage({
      defaultMessage: 'Community Authored',
      description: 'Label text for community authored templates',
      id: 'F+cOLr',
    }),
    MICROSOFT_AUTHORED: intl.formatMessage({
      defaultMessage: 'Microsoft Authored',
      description: 'Label text for Microsoft authored templates',
      id: 'rEQceE',
    }),
  };

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
    return <DocumentCard className="msla-template-card-wrapper">{intlText.TEMPLATE_LOADING}</DocumentCard>;
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

  const isMicrosoftAuthored = equals(details?.By, 'Microsoft');

  return (
    <DocumentCard className="msla-template-card-wrapper" styles={cardStyles} onClick={onSelectTemplate} aria-label={title}>
      <div className="msla-template-card-authored-wrapper">
        <div className="msla-template-card-authored">
          {isMicrosoftAuthored ? <Image src={MicrosoftIcon} alt="Microsoft" width={16} /> : <PeopleCommunity16Regular />}
          <Text size={200} weight="semibold" align="start" className="msla-template-card-authored-label">
            {isMicrosoftAuthored ? intlText.MICROSOFT_AUTHORED : intlText.COMMUNITY_AUTHORED}
          </Text>
        </div>
      </div>

      <div className="msla-template-card-body">
        <div className="msla-template-card-title-wrapper">
          <Text size={400} weight="semibold" align="start" className="msla-template-card-title">
            {title}
          </Text>
        </div>

        <div className="msla-template-card-footer">
          <div className="msla-template-card-tags">
            {['Type', 'Trigger'].map((key: string) => {
              if (!details[key]) {
                return null;
              }
              return (
                <Text key={key} size={300} className="msla-template-card-tag">
                  {details[key]}
                </Text>
              );
            })}
          </div>
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
              <Text className="msla-template-card-connectors-emptyText">{intlText.NO_CONNECTORS}</Text>
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
