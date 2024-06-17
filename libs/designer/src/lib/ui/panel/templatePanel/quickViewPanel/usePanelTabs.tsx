import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { overviewTab } from './tabs/overviewTab';
import { workflowTab } from './tabs/workflowTab';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import type { TemplatePanelTab } from '@microsoft/designer-ui';

export const useQuickViewPanelTabs = (): TemplatePanelTab[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { templates, templateName } = useSelector((state: RootState) => ({
    templates: state.manifest.availableTemplates,
    templateName: state.template.templateName,
  }));
  const templateManifest = templates?.[templateName ?? ''];

  const overviewTabItem = useMemo(
    () => ({
      ...overviewTab(intl, dispatch, { templateName, templateManifest }),
    }),
    [intl, dispatch, templateName, templateManifest]
  );

  const workflowTabItem = useMemo(
    () => ({
      ...workflowTab(intl, dispatch, { templateName, templateManifest }),
    }),
    [intl, dispatch, templateName, templateManifest]
  );

  return [overviewTabItem, workflowTabItem];
};
