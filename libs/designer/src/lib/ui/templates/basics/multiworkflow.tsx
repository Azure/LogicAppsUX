import type { IColumn } from '@fluentui/react';
import { DetailsList, Dropdown, Link, SelectionMode, Text, TextField } from '@fluentui/react';
import { equals, getPropertyValue } from '@microsoft/logic-apps-shared';
import { useFunctionalState } from '@react-hookz/web';
import { validateWorkflowName, type WorkflowTemplateData } from '../../../core/actions/bjsworkflow/templates';
import { useExistingWorkflowNames } from '../../../core/queries/template';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { updateKind, updateWorkflowName, updateWorkflowNameValidationError } from '../../../core/state/templates/templateSlice';
import { WorkflowKind } from '../../../core/state/workflow/workflowInterfaces';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentWorkflowNames } from '../../../core/templates/utils/helper';

interface WorkflowItem {
  id: string;
  name?: string;
  isNameEditable?: boolean;
  kind?: string;
  isKindEditable?: boolean;
  allowedKinds: {
    key: string;
    text: string;
  }[];
  description: string;
  errors: {
    workflow: string | undefined;
    kind: string | undefined;
  };
}

export const MultiWorkflowBasics = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { workflows } = useSelector((state: RootState) => state.template);
  const { data: existingWorkflowNames } = useExistingWorkflowNames();

  const intl = useIntl();
  const resources = {
    general_line1: intl.formatMessage({
      defaultMessage: 'Provide a unique, descriptive name and review the state type to ensure your workflows are properly configured.',
      id: 'AJ+LDh',
      description: 'General info displayed on basics tab for configuring workflow name and state type info - line 1.',
    }),
    general_line2: intl.formatMessage({
      defaultMessage: 'Avoid spaces and the following symbols in your workflow name: \\ / : * ? " < > | @, #, $, %, &',
      id: 'YOOBDW',
      description: 'General info displayed on basics tab for configuring workflow name and state type info - line 2.',
    }),
    description: intl.formatMessage({
      defaultMessage: 'Description',
      id: 'QVtqAn',
      description: 'Label for description column.',
    }),
    stateType: intl.formatMessage({
      defaultMessage: 'State type',
      id: 'W1rlxU',
      description: 'Label for choosing State type',
    }),
    workflowName: intl.formatMessage({
      defaultMessage: 'Workflow name',
      id: 'ekM77J',
      description: 'Label for workflow Name',
    }),
    kind_stateful: intl.formatMessage({
      defaultMessage: 'Stateful',
      id: 'Qqmb+W',
      description: 'Dropdown option for stateful type',
    }),
    kind_stateless: intl.formatMessage({
      defaultMessage: 'Stateless',
      id: 'cNXS5n',
      description: 'Dropdown option for stateless type',
    }),
  };
  const defaultKindOptions = [
    { key: WorkflowKind.STATEFUL, text: resources.kind_stateful },
    { key: WorkflowKind.STATELESS, text: resources.kind_stateless },
  ];

  const [workflowsList, setWorkflowsList] = useFunctionalState<WorkflowItem[]>(
    Object.values(workflows).map((workflow) => ({
      id: workflow.id,
      name: workflow.workflowName,
      isNameEditable: workflow?.isWorkflowNameEditable ?? true,
      kind: workflow.kind ?? (workflow.manifest.kinds?.length ? workflow.manifest.kinds[0] : WorkflowKind.STATEFUL),
      isKindEditable: workflow?.isKindEditable ?? true,
      allowedKinds: workflow.manifest.kinds?.length
        ? workflow.manifest.kinds.map((kind) => ({
            key: kind,
            text: equals(kind, WorkflowKind.STATEFUL) ? resources.kind_stateful : resources.kind_stateless,
          }))
        : defaultKindOptions,
      description: workflow.manifest.description,
      errors: workflow.errors,
    }))
  );
  const workflowErrors = useMemo(
    () =>
      Object.values(workflows).reduce((result: Record<string, { workflow?: string; kind?: string }>, workflow: WorkflowTemplateData) => {
        result[workflow.id] = {
          workflow: workflow.errors.workflow,
          kind: workflow.errors.kind,
        };
        return result;
      }, {}),
    [workflows]
  );

  const _onColumnClick = (_event: React.MouseEvent<HTMLElement>, column: IColumn): void => {
    let isSortedDescending = column.isSortedDescending;

    // If we've sorted this column, flip it.
    if (column.isSorted) {
      isSortedDescending = !isSortedDescending;
    }

    // Sort the items.
    const sortedItems = copyAndSort(workflowsList(), column.fieldName as string, isSortedDescending);
    setWorkflowsList(sortedItems);
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
      ariaLabel: resources.workflowName,
      fieldName: 'name',
      key: '$name',
      isResizable: true,
      minWidth: 200,
      name: resources.workflowName,
      maxWidth: 250,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
    {
      ariaLabel: resources.stateType,
      fieldName: 'kind',
      key: '$kind',
      isResizable: true,
      minWidth: 100,
      maxWidth: 100,
      name: resources.stateType,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
    {
      ariaLabel: resources.description,
      fieldName: 'description',
      key: '$description',
      isResizable: true,
      minWidth: 200,
      isMultiline: true,
      name: resources.description,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
  ]);

  const updateItemInList = (item: WorkflowItem) => {
    const newList = workflowsList().map((workflow: WorkflowItem) => (workflow.id === item.id ? item : workflow));
    setWorkflowsList(newList);
  };

  const handleWorkflowNameChange = (item: WorkflowItem, name: string | undefined) => {
    updateItemInList({ ...item, name });
    dispatch(updateWorkflowName({ id: item.id, name }));
  };

  const handleWorkflowNameBlur = (item: WorkflowItem) => {
    const existingNames = [
      ...(existingWorkflowNames ?? []),
      ...getCurrentWorkflowNames(
        workflowsList().map((w) => ({ id: w.id, name: w.name ?? '' })),
        item.id
      ),
    ];
    const validationError = validateWorkflowName(item.name, existingNames);
    updateItemInList({ ...item, errors: { ...item.errors, workflow: validationError } });
    dispatch(updateWorkflowNameValidationError({ id: item.id, error: validationError }));
  };

  const handleWorkflowKindChange = (item: WorkflowItem, kind: string) => {
    updateItemInList({ ...item, kind });
    dispatch(updateKind({ id: item.id, kind }));
  };

  const onRenderItemColumn = (item: WorkflowItem, _index: number | undefined, column: IColumn | undefined) => {
    switch (column?.key) {
      case '$name':
        return (
          <TextField
            aria-label={item.name}
            className="msla-templates-basics-name"
            disabled={!item?.isNameEditable}
            value={item.name}
            onChange={(_event, newValue) => handleWorkflowNameChange(item, newValue)}
            onBlur={() => handleWorkflowNameBlur(item)}
            errorMessage={workflowErrors[item.id]?.workflow}
          />
        );

      case '$kind':
        return (
          <Dropdown
            aria-label={item.kind}
            className="msla-templates-basics-state"
            disabled={item.allowedKinds.length === 1 || !item?.isKindEditable}
            options={item.allowedKinds}
            selectedKey={item.kind}
            onChange={(_event, option) => handleWorkflowKindChange(item, option?.key as string)}
            errorMessage={workflowErrors[item.id]?.kind}
          />
        );

      case '$description':
        return <TextWithShowMore aria-label={item.description} text={item.description} />;

      default:
        return null;
    }
  };

  return (
    <div className="msla-templates-basics-tab">
      <div>
        <Text>{resources.general_line1}</Text>
        <br />
        <Text>{resources.general_line2}</Text>
      </div>
      <DetailsList
        setKey="id"
        className="msla-templates-basics-list"
        items={workflowsList()}
        columns={columns()}
        compact={true}
        onRenderItemColumn={onRenderItemColumn}
        selectionMode={SelectionMode.none}
      />
    </div>
  );
};

const TextWithShowMore = ({ text, maxLength = 150 }: { text: string; maxLength?: number }) => {
  const [showMore, setShowMore] = useState(false);
  const intl = useIntl();
  const resources = {
    showMore: intl.formatMessage({
      defaultMessage: 'Show more',
      id: 'MAX7xS',
      description: 'Label for show more text.',
    }),
    showLess: intl.formatMessage({
      defaultMessage: 'Show less',
      id: 'im0GMa',
      description: 'Label for show less text.',
    }),
  };
  const textWithinLimit = text.length <= maxLength;

  return (
    <div className="msla-templates-basics-description">
      <Text>{showMore || textWithinLimit ? text : `${text.slice(0, maxLength)}...`}</Text>
      {textWithinLimit ? null : <Link onClick={() => setShowMore(!showMore)}>{showMore ? resources.showLess : resources.showMore}</Link>}
    </div>
  );
};

const copyAndSort = (items: WorkflowItem[], columnKey: string, isSortedDescending?: boolean): WorkflowItem[] => {
  return items
    .slice(0)
    .sort((a: WorkflowItem, b: WorkflowItem) =>
      (
        isSortedDescending
          ? getPropertyValue(a, columnKey) < getPropertyValue(b, columnKey)
          : getPropertyValue(a, columnKey) > getPropertyValue(b, columnKey)
      )
        ? 1
        : -1
    );
};
