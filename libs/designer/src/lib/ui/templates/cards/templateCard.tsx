import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { changeCurrentTemplateName } from '../../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import type { IContextualMenuItem, IContextualMenuProps, IDocumentCardStyles } from '@fluentui/react';
import { css, DocumentCard, IconButton, Image } from '@fluentui/react';
import { ConnectorIcon, ConnectorIconWithName } from '../connections/connector';
import type { Manifest } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/template';
import { getUniqueConnectors } from '../../../core/templates/utils/helper';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';
import type { OperationInfo } from '@microsoft/logic-apps-shared';
import { equals, getBuiltInOperationInfo, isBuiltInOperation, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import MicrosoftIcon from '../../../common/images/templates/microsoft.svg';
import { PeopleCommunity16Regular } from '@fluentui/react-icons';
import { isMultiWorkflowTemplate, loadTemplate } from '../../../core/actions/bjsworkflow/templates';
import { useMemo } from 'react';
import { BlankWorkflowTemplateCard } from './blankworklowcard';
import { LoadingTemplateCard } from './loadingcard';

interface TemplateCardProps {
  templateName: string;
  isLightweight?: boolean;
  blankWorkflowProps?: { isWorkflowEmpty: boolean };
  cssOverrides?: Record<string, string>;
  onSelect?: TemplateSelectHandler;
}

export type TemplateSelectHandler = (templateName: string, isSingleWorkflow: boolean) => void;
export const maxConnectorsToShow = 5;
export const templateCardStyles: IDocumentCardStyles = {
  root: { display: 'inline-block', height: 220, maxWidth: 1000 },
};

export const TemplateCard = ({ templateName, isLightweight, blankWorkflowProps, cssOverrides, onSelect }: TemplateCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { templateManifest, workflowAppName } = useSelector((state: RootState) => ({
    templateManifest: state.manifest.availableTemplates?.[templateName],
    workflowAppName: state.workflow.workflowAppName,
  }));
  const isMultiWorkflow = useMemo(() => templateManifest && isMultiWorkflowTemplate(templateManifest), [templateManifest]);

  if (blankWorkflowProps) {
    return <BlankWorkflowTemplateCard {...blankWorkflowProps} />;
  }

  if (!templateManifest) {
    return <LoadingTemplateCard />;
  }

  const intlText = {
    TEMPLATE_LOADING: intl.formatMessage({ defaultMessage: 'Loading....', description: 'Loading text', id: 'cZ60Tk' }),
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
      args: [templateName, workflowAppName, `isMultiWorkflowTemplate:${isMultiWorkflow}`],
    });
    dispatch(changeCurrentTemplateName(templateName));
    dispatch(loadTemplate({ preLoadedManifest: templateManifest }));

    onSelect?.(templateName, !isMultiWorkflow);
  };

  const { title, details } = templateManifest as Manifest;
  const isMicrosoftAuthored = equals(details?.By, 'Microsoft');

  return (
    <DocumentCard
      className={css('msla-template-card-wrapper', cssOverrides?.['card'])}
      styles={templateCardStyles}
      onClick={onSelectTemplate}
      aria-label={title}
    >
      <div className="msla-template-card-authored-wrapper">
        <div className="msla-template-card-authored">
          {isMicrosoftAuthored ? (
            <Image src={MicrosoftIcon} aria-label={intlText.MICROSOFT_AUTHORED} width={16} />
          ) : (
            <PeopleCommunity16Regular aria-label={intlText.COMMUNITY_AUTHORED} />
          )}
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
        {isLightweight ? null : <TemplateFeaturedConnectors manifest={templateManifest} intl={intl} />}
      </div>
    </DocumentCard>
  );
};

const TemplateFeaturedConnectors = ({ manifest, intl }: { manifest: Manifest; intl: IntlShape }) => {
  const noConnectorsMessage = intl.formatMessage({
    defaultMessage: 'This template does not have connectors',
    description: 'Accessibility text to inform user this template does not contain connectors',
    id: 'aI9W5L',
  });
  const { subscriptionId, location } = useSelector((state: RootState) => ({
    subscriptionId: state.workflow.subscriptionId,
    location: state.workflow.location,
  }));
  const { details, featuredOperations, connections } = manifest;
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

  return (
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
          <Text className="msla-template-card-connectors-emptyText">{noConnectorsMessage}</Text>
        )}
        {showOverflow ? (
          <IconButton className="msla-template-card-connector-overflow" onRenderMenuIcon={onRenderMenuIcon} menuProps={menuProps} />
        ) : null}
      </div>
    </div>
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
