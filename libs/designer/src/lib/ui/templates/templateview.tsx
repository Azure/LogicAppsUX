import { useDispatch, useSelector } from 'react-redux';
import type { CreateWorkflowHandler } from './TemplatesDesigner';
import type { AppDispatch, RootState } from '../../core/state/templates/store';
import { initializeWorkflowMetadata, isMultiWorkflowTemplate, loadTemplate } from '../../core/actions/bjsworkflow/templates';
import { useEffect, useMemo } from 'react';
import { TemplateOverview } from './templateoverview';
import { setLayerHostSelector, Spinner, SpinnerSize, Text } from '@fluentui/react';
import { CreateWorkflowPanel } from '../panel/templatePanel/createWorkflowPanel/createWorkflowPanel';
import { QuickViewPanel } from '../panel/templatePanel/quickViewPanel/quickViewPanel';
import { openCreateWorkflowPanelView, openQuickViewPanelView } from '../../core/state/templates/panelSlice';
import { useIntl } from 'react-intl';

export interface TemplateViewProps {
  createWorkflow: CreateWorkflowHandler;
  showSummary?: boolean;
  showCloseButton?: boolean;
  panelWidth?: string;
  onClose?: () => void;
}

export const TemplatesView = (props: TemplateViewProps) => {
  const { showCloseButton, panelWidth, createWorkflow, onClose } = props;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { templateName, manifest, allTemplates, customTemplateNames } = useSelector((state: RootState) => ({
    templateName: state.template.templateName,
    allTemplates: state.manifest.availableTemplates,
    customTemplateNames: state.manifest.customTemplateNames,
    manifest: state.template.manifest,
  }));

  const isCustomTemplate = useMemo(() => customTemplateNames?.includes(templateName ?? ''), [customTemplateNames, templateName]);
  const customTemplateManifest = useMemo(
    () => (isCustomTemplate ? allTemplates?.[templateName ?? ''] : undefined),
    [allTemplates, isCustomTemplate, templateName]
  );

  useEffect(() => {
    if (templateName) {
      dispatch(loadTemplate({ preLoadedManifest: customTemplateManifest, isCustomTemplate }));
    }
  }, [customTemplateManifest, dispatch, isCustomTemplate, templateName]);

  useEffect(() => {
    if (manifest) {
      dispatch(initializeWorkflowMetadata());
    }
  }, [dispatch, manifest]);

  if (!manifest) {
    return templateName ? (
      <Spinner size={SpinnerSize.large} />
    ) : (
      <Text>
        {intl.formatMessage({
          defaultMessage: 'Template wizard closed, please select template to view content.',
          id: 'VYCigY',
          description: 'Message to show when template wizard is closed',
        })}
      </Text>
    );
  }
  return isMultiWorkflowTemplate(manifest) ? (
    <TemplateOverview showCloseButton={showCloseButton} panelWidth={panelWidth} createWorkflow={createWorkflow} onClose={onClose} />
  ) : (
    <SingleTemplateView {...props} />
  );
};

const SingleTemplateView = ({
  createWorkflow,
  showCloseButton = false,
  panelWidth = '98%',
  showSummary = true,
  onClose,
}: TemplateViewProps) => {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const { workflows } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
  }));

  useEffect(() => {
    if (showSummary) {
      dispatch(openQuickViewPanelView());
    } else {
      dispatch(openCreateWorkflowPanelView());
    }
  }, [dispatch, showSummary]);
  return (
    <>
      <QuickViewPanel
        showCreate={true}
        showCloseButton={showCloseButton}
        onClose={onClose}
        workflowId={Object.keys(workflows)[0]}
        panelWidth={panelWidth}
      />
      <CreateWorkflowPanel showCloseButton={showCloseButton} createWorkflow={createWorkflow} panelWidth={panelWidth} onClose={onClose} />
      <div
        id={'msla-layer-host'}
        style={{
          position: 'absolute',
          inset: '0px',
          visibility: 'hidden',
        }}
      />
    </>
  );
};
