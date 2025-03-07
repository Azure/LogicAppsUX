import type { RootState } from '../../core/state/templates/store';
import { useSelector } from 'react-redux';
// import { TemplatesFullGalleryView } from './gallery/templatesfullgalleryview';
import type { LogicAppsV2, Template } from '@microsoft/logic-apps-shared';
import type { TemplateDetailFilterType } from './filters/templatesearchfilters';
import type { ConnectionMapping } from '../../core/state/templates/workflowSlice';
import { isMultiWorkflowTemplate } from '../../core/actions/bjsworkflow/templates';
import { TemplateOverview } from './templateoverview';
// import { TemplatesGalleryWithSearch } from './gallery/templatesgallerywithsearch';
import { TemplatesFullGalleryView } from './gallery/templatesfullgalleryview';

export type CreateWorkflowHandler = (
  workflows: {
    id: string;
    name: string | undefined;
    kind: string | undefined;
    definition: LogicAppsV2.WorkflowDefinition;
  }[],
  connectionsMapping: ConnectionMapping,
  parametersData: Record<string, Template.ParameterDefinition>
) => Promise<void>;

export interface TemplatesDesignerProps {
  detailFilters: TemplateDetailFilterType;
  isWorkflowEmpty?: boolean;
  createWorkflowCall: CreateWorkflowHandler;
}

export const TemplatesDesigner = (props: TemplatesDesignerProps) => {
  const { manifest } = useSelector((state: RootState) => state.template);

  return manifest && isMultiWorkflowTemplate(manifest) ? (
    <TemplateOverview createWorkflow={props.createWorkflowCall} />
  ) : (
    <TemplatesFullGalleryView {...props} />
  );
};
