import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Text } from '@fluentui/react-components';
import { Icon, Panel, PanelType } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { useCallback, useState } from 'react';
import { TemplatesPanelContent, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { getQuickViewTabs } from '../../../../core/templates/utils/helper';
import Markdown from 'react-markdown';
import { useWorkflowTemplate } from '../../../../core/state/templates/templateselectors';
import { Open16Regular } from '@fluentui/react-icons';
import { closePanel, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { clearTemplateDetails } from '../../../../core/state/templates/templateSlice';

export interface QuickViewPanelProps {
  showCreate: boolean;
  workflowId: string;
  clearDetailsOnClose?: boolean;
  panelWidth?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
}

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const QuickViewPanel = ({
  onClose,
  showCreate,
  workflowId,
  panelWidth = '50%',
  showCloseButton = true,
  clearDetailsOnClose = true,
}: QuickViewPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { templateName, templateManifest, workflowAppName, isOpen, currentPanelView, shouldCloseByDefault } = useSelector(
    (state: RootState) => ({
      templateName: state.template.templateName,
      templateManifest: state.template.manifest,
      workflowAppName: state.workflow.workflowAppName,
      isOpen: state.panel.isOpen,
      currentPanelView: state.panel.currentPanelView,
      shouldCloseByDefault: !state.templateOptions.viewTemplateDetails,
    })
  );
  const { manifest } = useWorkflowTemplate(workflowId);
  const panelTabs = getQuickViewTabs(
    intl,
    dispatch,
    workflowId,
    clearDetailsOnClose,
    {
      templateId: templateName ?? '',
      workflowAppName,
      isMultiWorkflow: false,
    },
    onClose
  );
  const [selectedTabId, setSelectedTabId] = useState<string>(panelTabs[0]?.id);

  const dismissPanel = useCallback(() => {
    dispatch(closePanel());

    if (clearDetailsOnClose) {
      dispatch(clearTemplateDetails());
    }

    onClose?.();
  }, [clearDetailsOnClose, dispatch, onClose]);

  const onRenderHeaderContent = useCallback(
    () => (
      <QuickViewPanelHeader
        title={manifest.title}
        summary={manifest.summary}
        sourceCodeUrl={manifest.sourceCodeUrl}
        details={templateManifest?.details ?? {}}
      />
    ),
    [templateManifest, manifest]
  );

  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];
  const onRenderFooterContent = useCallback(
    () =>
      selectedTabProps?.footerContent ? (
        <TemplatesPanelFooter
          showPrimaryButton={showCreate}
          secondaryButtonDisabled={!showCloseButton}
          {...selectedTabProps?.footerContent}
        />
      ) : null,
    [selectedTabProps?.footerContent, showCloseButton, showCreate]
  );

  if (!manifest) {
    return null;
  }

  const onTabSelected = (tabId: string): void => {
    setSelectedTabId(tabId);
  };

  return (
    <Panel
      styles={{ main: { padding: '0 20px', zIndex: 1000 }, content: { paddingLeft: '0px' } }}
      isLightDismiss={shouldCloseByDefault}
      type={PanelType.custom}
      customWidth={panelWidth}
      isOpen={isOpen && currentPanelView === TemplatePanelView.QuickView}
      onDismiss={shouldCloseByDefault ? dismissPanel : undefined}
      hasCloseButton={shouldCloseByDefault}
      onRenderHeader={onRenderHeaderContent}
      onRenderFooterContent={onRenderFooterContent}
      layerProps={layerProps}
      isFooterAtBottom={true}
    >
      <TemplatesPanelContent
        className="msla-template-quickview-tabs"
        tabs={panelTabs}
        selectedTab={selectedTabId}
        selectTab={onTabSelected}
      />
    </Panel>
  );
};

export const QuickViewPanelHeader = ({
  title,
  summary,
  sourceCodeUrl,
  details,
  features,
  onBackClick,
}: {
  title: string;
  summary: string;
  sourceCodeUrl: string | undefined;
  details: Record<string, string>;
  features?: string;
  onBackClick?: () => void;
}) => {
  const intl = useIntl();
  const detailsTags: Record<string, string> = {
    Type: intl.formatMessage({
      defaultMessage: 'Type',
      id: 'tjQdhq',
      description: 'Solution type of the template',
    }),
    By: intl.formatMessage({
      defaultMessage: 'By',
      id: 'nhEgHb',
      description: 'Name of the organization that published this template',
    }),
  };

  return (
    <TemplatesPanelHeader title={title} onBackClick={onBackClick}>
      <div className="msla-template-quickview-tags">
        {Object.keys(detailsTags).map((key: string, index: number, array: any[]) => {
          return (
            <div key={key}>
              <Text className={index === array.length - 1 ? 'msla-template-last-tag' : ''}>
                {detailsTags[key]}: {details[key]}
              </Text>
              {index !== array.length - 1 ? (
                <Icon style={{ padding: '3px 10px 3px 10px', color: '#dedede', fontSize: 10 }} iconName="LocationDot" />
              ) : null}
            </div>
          );
        })}
        {sourceCodeUrl && (
          <Link className="msla-template-quickview-source-code" href={sourceCodeUrl} target="_blank">
            {intl.formatMessage({
              defaultMessage: 'Source code',
              id: 'EFQ56R',
              description: 'Link to the source code of the template',
            })}
            <Open16Regular className="msla-templates-tab-source-code-icon" />
          </Link>
        )}
      </div>
      <Markdown className="msla-template-markdown" linkTarget="_blank">
        {summary}
      </Markdown>
      {features && (
        <div className="msla-template-quickview-features">
          <Text>
            {intl.formatMessage({
              defaultMessage: 'Features',
              id: 'SZ78Xp',
              description: 'Title for the features section in the template overview',
            })}
            :
          </Text>
          <Markdown className="msla-template-markdown" linkTarget="_blank">
            {features}
          </Markdown>
        </div>
      )}
    </TemplatesPanelHeader>
  );
};
