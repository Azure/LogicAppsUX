import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { changeCurrentTemplateName } from '../../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import type { IContextualMenuItem, IContextualMenuProps, IDocumentCardStyles } from '@fluentui/react';
import { css, DocumentCard, IconButton, Image } from '@fluentui/react';
import { ConnectorIcon, ConnectorIconWithName } from '../connections/connector';
import type { Template } from '@microsoft/logic-apps-shared';
import { getUniqueConnectorsFromConnections } from '../../../core/templates/utils/helper';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';
import { equals, isArmResourceId, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import MicrosoftIcon from '../../../common/images/templates/microsoft.svg';
import WorkflowIcon from '../../../common/images/templates/logicapps.svg';
import { Beaker20Regular, BuildingMultiple20Regular, CheckmarkCircle20Regular, PeopleCommunity16Regular } from '@fluentui/react-icons';
import { isMultiWorkflowTemplate, loadTemplate } from '../../../core/actions/bjsworkflow/templates';
import { useMemo } from 'react';
import { BlankWorkflowTemplateCard } from './blankworklowcard';
import { LoadingTemplateCard } from './loadingcard';
import type { TemplateData } from '../../../core/state/templates/manifestSlice';

interface TemplateCardProps {
  templateName: string;
  isLightweight?: boolean;
  blankWorkflowProps?: { isWorkflowEmpty: boolean };
  cssOverrides?: Record<string, string>;
  onSelect?: TemplateSelectHandler;
}

export type TemplateSelectHandler = (templateName: string, isSingleWorkflow: boolean) => void;
export const maxConnectorsToShow = 4;
export const templateCardStyles: IDocumentCardStyles = {
  root: { display: 'inline-block', height: 220, maxWidth: 1000 },
};
const templateCardBodyStyles = {
  cardBody: { height: 180 },
  cardTitle: { minHeight: 70, maxHeight: 70 },
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
    return <LoadingTemplateCard isLightweight={isLightweight} cssOverrides={cssOverrides} />;
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
    RESOURCE: intl.formatMessage({
      defaultMessage: 'Workflow',
      description: 'Label text for logic app resource',
      id: 'XUFUOM',
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

  const { id, title, details } = templateManifest as Template.TemplateManifest;
  const templateAuthor = details?.By ?? intlText.COMMUNITY_AUTHORED;
  const isMicrosoftAuthored = equals(templateAuthor, 'Microsoft');
  const isWorkflowResource = equals(templateAuthor, 'resource');

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
          ) : isWorkflowResource ? (
            <Image src={WorkflowIcon} aria-label={intlText.RESOURCE} width={16} />
          ) : isArmResourceId(id) ? (
            <BuildingMultiple20Regular aria-label={templateAuthor} />
          ) : (
            <PeopleCommunity16Regular aria-label={intlText.COMMUNITY_AUTHORED} />
          )}
          <Text size={200} weight="semibold" align="start" className="msla-template-card-authored-label">
            {isMicrosoftAuthored ? intlText.MICROSOFT_AUTHORED : isWorkflowResource ? intlText.RESOURCE : templateAuthor}
          </Text>
        </div>
      </div>

      <div className="msla-template-card-body" style={isLightweight ? undefined : templateCardBodyStyles.cardBody}>
        <div className="msla-template-card-title-wrapper" style={isLightweight ? undefined : templateCardBodyStyles.cardTitle}>
          <Text size={400} weight="semibold" align="start" className={css('msla-template-card-title', cssOverrides?.['cardTitle'])}>
            {title}
          </Text>
        </div>
        {isLightweight ? null : <TemplateFeaturedConnectors manifest={templateManifest} intl={intl} />}
      </div>
    </DocumentCard>
  );
};

const TemplateFeaturedConnectors = ({ manifest, intl }: { manifest: TemplateData; intl: IntlShape }) => {
  const noConnectorsMessage = intl.formatMessage({
    defaultMessage: 'This template does not have connectors',
    description: 'Accessibility text to inform user this template does not contain connectors',
    id: 'aI9W5L',
  });
  const { subscriptionId, location } = useSelector((state: RootState) => ({
    subscriptionId: state.workflow.subscriptionId,
    location: state.workflow.location,
  }));
  const { publishState, details, featuredConnectors = [] } = manifest;
  const allConnectors = getUniqueConnectorsFromConnections(featuredConnectors, subscriptionId, location);
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
    items: overflowList.map((info) => ({ key: info.id, text: info.id, data: info, onRender: onRenderMenuItem })),
    directionalHintFixed: true,
    className: 'msla-template-card-connector-menu-box',
  };

  return (
    <div className="msla-template-card-footer">
      <div className="msla-template-card-tags">
        <Text size={300} className="msla-template-card-tag">
          {details.Type}
        </Text>
        {details.Trigger ? (
          <Text size={300} className="msla-template-card-tag">
            {details.Trigger}
          </Text>
        ) : null}
      </div>
      <div className="msla-template-card-features">
        <div className="msla-template-card-connectors-list">
          {connectorsToShow.length > 0 ? (
            connectorsToShow.map((info) => (
              <ConnectorIcon
                key={info.id}
                connectorId={info.id}
                operationId={info.id}
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
        {publishState ? <PublishBadge publishedState={publishState} /> : null}
      </div>
    </div>
  );
};

const iconStyle = { paddingTop: 8, verticalAlign: 'bottom' };
const PublishBadge = ({ publishedState }: { publishedState: string }) => {
  const intl = useIntl();
  const publishStateText = {
    TESTING: intl.formatMessage({
      defaultMessage: 'Testing',
      description: 'Label text for testing publish state',
      id: 'Kv+Pa3',
    }),
    PRODUCTION: intl.formatMessage({
      defaultMessage: 'Production',
      description: 'Label text for production publish state',
      id: 'srg0hY',
    }),
  };
  const isProduction = equals(publishedState, 'Production');

  return (
    <div className="msla-template-card-publish-badge" style={isProduction ? { color: 'green' } : undefined}>
      <Text size={300} align="start" className="msla-template-card-publish-text">
        {isProduction ? publishStateText.PRODUCTION : publishStateText.TESTING}
      </Text>
      {isProduction ? <CheckmarkCircle20Regular style={iconStyle} /> : <Beaker20Regular style={iconStyle} />}
    </div>
  );
};
