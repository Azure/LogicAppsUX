import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Text, Button, Drawer, DrawerBody, DrawerHeader, DrawerFooter } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useCallback, useMemo, useState } from 'react';
import { TemplateContent, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { getQuickViewTabs } from '../../../../core/templates/utils/helper';
import Markdown from 'react-markdown';
import { useWorkflowTemplate } from '../../../../core/state/templates/templateselectors';
import { Open16Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { closePanel, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { clearTemplateDetails } from '../../../../core/state/templates/templateSlice';
import { isMultiWorkflowTemplate } from '../../../../core/actions/bjsworkflow/templates';
import { useTemplatesStrings } from '../../../templates/templatesStrings';
import { useStyles } from './quickViewPanel.styles';

export interface QuickViewPanelProps {
  showCreate: boolean;
  workflowId: string;
  clearDetailsOnClose?: boolean;
  panelWidth?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
}

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
  const workflowTemplate = useWorkflowTemplate(workflowId);
  const manifest = useMemo(() => workflowTemplate?.manifest, [workflowTemplate]);
  const panelTabs = getQuickViewTabs(
    intl,
    dispatch,
    workflowId,
    clearDetailsOnClose,
    {
      templateId: templateName ?? '',
      workflowAppName,
      isMultiWorkflow: false,
      showCreate,
      showCloseButton,
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
        title={manifest?.title ?? ''}
        summary={manifest?.summary ?? ''}
        sourceCodeUrl={manifest?.sourceCodeUrl}
        isMultiWorkflowTemplate={isMultiWorkflowTemplate(templateManifest)}
        details={templateManifest?.details ?? {}}
        onClose={shouldCloseByDefault ? dismissPanel : undefined}
      />
    ),
    [templateManifest, manifest, shouldCloseByDefault, dismissPanel]
  );

  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];
  const styles = useStyles();
  if (!manifest) {
    return null;
  }

  const onTabSelected = (tabId: string): void => {
    setSelectedTabId(tabId);
  };

  return (
    <Drawer
      className={styles.drawer}
      modalType={shouldCloseByDefault ? 'modal' : 'non-modal'}
      open={isOpen && currentPanelView === TemplatePanelView.QuickView}
      onOpenChange={(_, { open }) => !open && shouldCloseByDefault && dismissPanel()}
      position="end"
      style={{ width: panelWidth }}
    >
      <DrawerHeader className={styles.header}>{onRenderHeaderContent()}</DrawerHeader>
      <DrawerBody className={styles.body}>
        <TemplateContent className={styles.quickviewTabs} tabs={panelTabs} selectedTab={selectedTabId} selectTab={onTabSelected} />
      </DrawerBody>
      {selectedTabProps?.footerContent && (
        <DrawerFooter className={styles.footer}>
          <TemplatesPanelFooter {...selectedTabProps.footerContent} />
        </DrawerFooter>
      )}
    </Drawer>
  );
};

export const QuickViewPanelHeader = ({
  title,
  summary,
  sourceCodeUrl,
  isMultiWorkflowTemplate = false,
  details,
  features,
  onBackClick,
  onClose,
}: {
  title: string;
  summary: string;
  sourceCodeUrl: string | undefined;
  details: Record<string, string>;
  isMultiWorkflowTemplate?: boolean;
  features?: string;
  onBackClick?: () => void;
  onClose?: () => void;
}) => {
  const intl = useIntl();
  const { resourceStrings } = useTemplatesStrings();
  const styles = useStyles();

  const detailsTags: Record<string, string> = useMemo(() => {
    const baseDetailsTags: Record<string, string> = isMultiWorkflowTemplate
      ? {}
      : {
          Type: intl.formatMessage({
            defaultMessage: 'Type',
            id: 'tjQdhq',
            description: 'Solution type of the template',
          }),
        };

    baseDetailsTags.By = resourceStrings.BY;
    return baseDetailsTags;
  }, [isMultiWorkflowTemplate, intl, resourceStrings.BY]);

  const closeButton = onClose ? (
    <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} className={styles.closeButton}>
      {intl.formatMessage({
        defaultMessage: 'Close Panel',
        id: 'XV/4oe',
        description: 'Close panel button text',
      })}
    </Button>
  ) : undefined;

  return (
    <TemplatesPanelHeader title={title} onBackClick={onBackClick} rightAction={closeButton}>
      <div className={styles.tagsContainer}>
        {Object.keys(detailsTags).map((key: string, index: number, array: any[]) => {
          return (
            <div key={key}>
              <Text className={index === array.length - 1 ? styles.lastTag : ''}>
                {detailsTags[key]}: {details[key]}
              </Text>
              {index !== array.length - 1 ? <Text style={{ padding: '3px 10px 3px 10px', color: '#dedede', fontSize: 10 }}>•</Text> : null}
            </div>
          );
        })}
        {sourceCodeUrl && (
          <Link className={styles.sourceCodeLink} href={sourceCodeUrl} target="_blank">
            {intl.formatMessage({
              defaultMessage: 'Source code',
              id: 'EFQ56R',
              description: 'Link to the source code of the template',
            })}
            <Open16Regular className={styles.sourceCodeIcon} />
          </Link>
        )}
      </div>
      <Markdown className={styles.markdownContent} linkTarget="_blank">
        {summary}
      </Markdown>
      {features && (
        <div className={styles.featuresSection}>
          <Text>
            {intl.formatMessage({
              defaultMessage: 'Features',
              id: 'SZ78Xp',
              description: 'Title for the features section in the template overview',
            })}
            :
          </Text>
          <Markdown className={styles.markdownContent} linkTarget="_blank">
            {features}
          </Markdown>
        </div>
      )}
    </TemplatesPanelHeader>
  );
};
