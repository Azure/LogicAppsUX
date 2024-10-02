import type { CreateWorkflowHandler } from './TemplatesDesigner';
import { useEffect, useState } from 'react';
import { DetailsList, type IColumn, Link, SelectionMode, setLayerHostSelector } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { getPropertyValue, unmap } from '@microsoft/logic-apps-shared';
import { Text } from '@fluentui/react-components';
import { QuickViewPanelHeader } from '../panel/templatePanel/quickViewPanel/quickViewPanel';
import { ConnectionsList } from './connections/connections';
import { useFunctionalState } from '@react-hookz/web';
import type { WorkflowTemplateData } from '../../core/actions/bjsworkflow/templates';
import { openQuickViewPanelView } from '../../core/state/templates/panelSlice';
import { TemplatePanel } from '../panel/templatePanel/templatePanel';
import { TemplatesPanelFooter } from '@microsoft/designer-ui';
import { workflowTab } from '../panel/templatePanel/quickViewPanel/tabs/workflowTab';

export const TemplateOverview = ({ createWorkflow }: { createWorkflow: CreateWorkflowHandler }) => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const [workflowDetails, setWorkflowDetails] = useState<string | undefined>(undefined);
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const { templateName, workflowAppName, manifest, connections, workflows } = useSelector((state: RootState) => ({
    templateName: state.template.templateName,
    workflowAppName: state.workflow.workflowAppName,
    manifest: state.template.manifest,
    connections: state.template.connections,
    workflows: state.template.workflows,
  }));
  const { title, description, details, detailsDescription } = manifest as Template.Manifest;
  const resources = {
    by: intl.formatMessage({
      defaultMessage: 'By',
      id: '+5Jp42',
      description: 'Title for publisher',
    }),
    type: intl.formatMessage({
      defaultMessage: 'Type',
      id: 'k/X2ml',
      description: 'Title for solution type',
    }),
  };
  const info = {
    [resources.by]: getPropertyValue(details, 'by'),
    [resources.type]: getPropertyValue(details, 'type'),
  };
  const templateHasConnections = Object.keys(connections).length > 0;

  const showDetails = (workflowId: string) => {
    dispatch(openQuickViewPanelView());
    setWorkflowDetails(workflowId);
  };

  // TODO: Need to open new create panel for multi workflow here.
  const footerContentProps = workflowTab(intl, dispatch, true, () => setShowCreatePanel(true), {
    templateId: templateName ?? '',
    workflowAppName,
  }).footerContent;
  return (
    <>
      <QuickViewPanelHeader title={title} description={description} details={info} features={detailsDescription} />
      <div className="msla-template-overview" style={{ marginTop: '-34px' }}>
        <div className="msla-template-overview-section">
          <Text className="msla-template-overview-section-title">
            {intl.formatMessage({
              defaultMessage: 'Workflows in this Accelerator',
              id: 'zK5VPq',
              description: 'Title for the workflows section in the template overview',
            })}
          </Text>
          <WorkflowList workflows={workflows} showDetails={showDetails} />
        </div>
        <div className="msla-template-overview-section">
          <Text className="msla-template-overview-section-title" style={templateHasConnections ? undefined : { marginBottom: '-30px' }}>
            {templateHasConnections
              ? intl.formatMessage({
                  defaultMessage: 'Connections',
                  id: 'Nr8FbX',
                  description: 'Title for the connections section in the template overview tab',
                })
              : intl.formatMessage({
                  defaultMessage: 'No connections are needed in this template',
                  id: 'j2v8BE',
                  description: 'Text to show no connections present in the template.',
                })}
          </Text>
          {templateHasConnections ? <ConnectionsList connections={connections} /> : null}
        </div>
      </div>
      <TemplatesPanelFooter showPrimaryButton={true} {...footerContentProps} />

      {workflowDetails ? (
        <TemplatePanel showCreate={false} workflowId={workflowDetails} onClose={() => setWorkflowDetails(undefined)} />
      ) : null}
      {showCreatePanel ? (
        <TemplatePanel
          showCreate={true}
          workflowId={Object.keys(workflows)[0]}
          createWorkflow={createWorkflow}
          onClose={() => setShowCreatePanel(false)}
        />
      ) : null}
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

interface WorkflowItem {
  id: string;
  name: string;
  trigger: string;
}

const WorkflowList = ({
  workflows,
  showDetails,
}: { workflows: Record<string, WorkflowTemplateData>; showDetails: (workflowId: string) => void }) => {
  const intl = useIntl();
  const [items, setItems] = useFunctionalState(
    unmap(workflows).map((workflow) => {
      const { id, manifest } = workflow;
      const { title, details } = manifest as Template.Manifest;
      const trigger = getPropertyValue(details, 'trigger');
      return { id, name: title, trigger };
    })
  );
  const columnsNames = {
    name: intl.formatMessage({ defaultMessage: 'Name', id: '+EREVh', description: 'Column name for workflow name' }),
    trigger: intl.formatMessage({ defaultMessage: 'Trigger', id: 'MGq28G', description: 'Column name for trigger type' }),
  };
  const _onColumnClick = (_event: React.MouseEvent<HTMLElement>, column: IColumn): void => {
    let isSortedDescending = column.isSortedDescending;

    // If we've sorted this column, flip it.
    if (column.isSorted) {
      isSortedDescending = !isSortedDescending;
    }

    // Sort the items.
    const sortedItems = _copyAndSort(items(), column.fieldName as string, isSortedDescending);
    setItems(sortedItems);
    setColumns(
      columns().map((col) => {
        col.isSorted = col.key === column.key;

        if (col.isSorted) {
          col.isSortedDescending = !!isSortedDescending;
        }

        return col;
      })
    );
  };
  const [columns, setColumns] = useFunctionalState<IColumn[]>([
    {
      ariaLabel: columnsNames.name,
      fieldName: 'name',
      key: 'name',
      isResizable: true,
      minWidth: 25,
      maxWidth: 300,
      name: columnsNames.name,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
    {
      ariaLabel: columnsNames.trigger,
      fieldName: 'trigger',
      flexGrow: 1,
      key: 'trigger',
      isResizable: true,
      minWidth: 1,
      maxWidth: 100,
      name: columnsNames.trigger,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
  ]);

  const onRenderItemColumn = (item: WorkflowItem, _index: number | undefined, column: IColumn | undefined) => {
    switch (column?.key) {
      case 'name':
        return (
          <Link href="#" onClick={() => showDetails(item.id)}>
            {item.name}
          </Link>
        );

      case 'trigger':
        return <Text className="msla-template-overview-text">{item.trigger}</Text>;

      default:
        return null;
    }
  };

  return (
    <DetailsList
      styles={{ root: { marginTop: '-20px', marginLeft: '-10px' } }}
      setKey="key"
      items={items()}
      columns={columns()}
      compact={true}
      onRenderItemColumn={onRenderItemColumn}
      selectionMode={SelectionMode.none}
    />
  );
};

function _copyAndSort(items: WorkflowItem[], columnKey: string, isSortedDescending?: boolean): WorkflowItem[] {
  return items.slice(0).sort((a: WorkflowItem, b: WorkflowItem) => {
    return (
      isSortedDescending
        ? getPropertyValue(a, columnKey) < getPropertyValue(b, columnKey)
        : getPropertyValue(a, columnKey) > getPropertyValue(b, columnKey)
    )
      ? 1
      : -1;
  });
}
