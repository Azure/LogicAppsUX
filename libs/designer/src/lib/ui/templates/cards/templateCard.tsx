import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { changeCurrentTemplateName } from '../../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import { openQuickViewPanelView } from '../../../core/state/templates/panelSlice';
import type { IContextualMenuItem, IContextualMenuProps, IDocumentCardStyles } from '@fluentui/react';
import { DocumentCard, IconButton, Image, Shimmer, ShimmerElementType } from '@fluentui/react';
import { ConnectorIcon, ConnectorIconWithName } from '../connections/connector';
import { useIntl } from 'react-intl';
import type { OperationInfo, Template } from '@microsoft/logic-apps-shared';
import {
  equals,
  getBuiltInOperationInfo,
  isBuiltInOperation,
  LogEntryLevel,
  LoggerService,
  TemplateService,
} from '@microsoft/logic-apps-shared';
import MicrosoftIcon from '../../../common/images/templates/microsoft.svg';
import { Add16Regular, PeopleCommunity16Regular } from '@fluentui/react-icons';
import { isMultiWorkflowTemplate, loadTemplate } from '../../../core/actions/bjsworkflow/templates';
import { useMemo } from 'react';

interface TemplateCardProps {
  templateName: string;
  isPlaceholder?: boolean;
}

export const maxConnectorsToShow = 5;

const cardStyles: IDocumentCardStyles = {
  root: { display: 'inline-block', maxWidth: 1000 },
};

export const TemplateCard = ({ templateName }: TemplateCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { templateManifest, workflowAppName } = useSelector((state: RootState) => ({
    templateManifest: state.manifest.availableTemplates?.[templateName],
    subscriptionId: state.workflow.subscriptionId,
    workflowAppName: state.workflow.workflowAppName,
    location: state.workflow.location,
  }));
  const isMultiWorkflow = useMemo(() => templateManifest && isMultiWorkflowTemplate(templateManifest), [templateManifest]);

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
      args: [templateName, workflowAppName, `isMultiWorkflowTemplate:${isMultiWorkflow}`],
    });
    dispatch(changeCurrentTemplateName(templateName));
    dispatch(loadTemplate({ preLoadedManifest: templateManifest }));

    if (Object.keys(templateManifest?.workflows ?? {}).length === 0) {
      dispatch(openQuickViewPanelView());
    }
  };

  if (!templateManifest) {
    return <LoadingTemplateCard />;
  }

  const { title, details, featuredConnectors = [] } = templateManifest as Template.TemplateManifest;
  const showOverflow = featuredConnectors.length > maxConnectorsToShow;
  const connectorsToShow = showOverflow ? featuredConnectors.slice(0, maxConnectorsToShow) : featuredConnectors;
  const overflowList = showOverflow ? featuredConnectors.slice(maxConnectorsToShow) : [];
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

  const isMicrosoftAuthored = equals(details?.By, 'Microsoft');

  return (
    <DocumentCard className="msla-template-card-wrapper" styles={cardStyles} onClick={onSelectTemplate} aria-label={title}>
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

        <div className="msla-template-card-footer">
          <div className="msla-template-card-tags">
            <Text size={300} className="msla-template-card-tag">
              {details.Type}
            </Text>
            <Text size={300} className="msla-template-card-tag">
              {details.Trigger}
            </Text>
          </div>
          <div className="msla-template-card-connectors-list">
            {connectorsToShow.length > 0 ? (
              connectorsToShow.map((info) => (
                <ConnectorIcon
                  key={info.id}
                  connectorId={info.id}
                  // operationId={info.id}
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

export const BlankWorkflowTemplateCard = ({ isWorkflowEmpty }: { isWorkflowEmpty: boolean }) => {
  const intl = useIntl();

  const workflowAppName = useSelector((state: RootState) => state.workflow.workflowAppName);

  const intlText = {
    BLANK_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Blank workflow',
      description: 'Title text for the card that lets users start from a blank workflow',
      id: 'pykp8c',
    }),
    BLANK_WORKFLOW_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Start with an empty workflow to build your integration solution.',
      description: 'Label text for the card that lets users start from a blank workflow',
      id: 'kcWgxU',
    }),
    REPLACE_WITH_BLANK_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Replace your existing workflow with an empty workflow to rebuild your integration solution.',
      description: 'Label text for the card that lets users replace the current workflow with blank workflow',
      id: 'boxBWI',
    }),
  };

  const onBlankWorkflowClick = async () => {
    LoggerService().log({
      level: LogEntryLevel.Trace,
      area: 'Templates.TemplateCard.Blank',
      message: 'Blank workflow is selected',
      args: [workflowAppName],
    });
    await TemplateService()?.onAddBlankWorkflow();
  };

  return (
    <DocumentCard
      className="msla-template-card-wrapper"
      styles={cardStyles}
      onClick={onBlankWorkflowClick}
      aria-label={intlText.BLANK_WORKFLOW}
    >
      <div className="msla-blank-template-card">
        <Add16Regular className="msla-blank-template-card-add-icon" />
        <Text size={400} weight="semibold" align="center" className="msla-template-card-title">
          {intlText.BLANK_WORKFLOW}
        </Text>
        <Text size={400} align="center" className="msla-blank-template-card-description">
          {isWorkflowEmpty ? intlText.BLANK_WORKFLOW_DESCRIPTION : intlText.REPLACE_WITH_BLANK_WORKFLOW}
        </Text>
      </div>
    </DocumentCard>
  );
};

const LoadingTemplateCard = () => {
  return (
    <DocumentCard className="msla-template-card-wrapper" styles={cardStyles}>
      <div className="msla-template-card-authored-wrapper">
        <div className="msla-template-card-authored">
          <Shimmer style={{ width: '100%' }} width={'100%'} />
        </div>
      </div>

      <div className="msla-template-card-body">
        <div className="msla-template-card-title-wrapper">
          <br />
          <Shimmer width={'100%'} />
          <br />
          <Shimmer width={'70%'} />
        </div>
        <div className="msla-template-card-footer">
          <div className="msla-template-card-connectors-list">
            <Shimmer
              shimmerElements={[
                { type: ShimmerElementType.circle },
                { type: ShimmerElementType.gap },
                { type: ShimmerElementType.circle },
                { type: ShimmerElementType.gap },
                { type: ShimmerElementType.circle },
              ]}
            />
          </div>
        </div>
      </div>
    </DocumentCard>
  );
};

export const getFeaturedConnectors = (operationInfos: { type: string; kind?: string }[] = []): OperationInfo[] => {
  return operationInfos
    .map((info) => {
      if (isBuiltInOperation(info)) {
        return getBuiltInOperationInfo(info, /* isTrigger */ false);
      }

      return undefined;
    })
    .filter((info) => info !== undefined) as OperationInfo[];
};
