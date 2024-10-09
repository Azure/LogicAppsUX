import { DetailsList, type IColumn, SelectionMode, TextField } from '@fluentui/react';
// import type { TemplatesParameterUpdateEvent } from '@microsoft/designer-ui';
// import { updateTemplateParameterValue } from '../../../core/state/templates/templateSlice';
import type { RootState } from '../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { getObjectPropertyValue, type Template } from '@microsoft/logic-apps-shared';
import { useFunctionalState } from '@react-hookz/web';
import { useIntl } from 'react-intl';

export const DisplayParameters = () => {
  // const dispatch = useDispatch<AppDispatch>();
  const {
    parameterDefinitions,
    // errors: { parameters: parameterErrors },
  } = useSelector((state: RootState) => state.template);

  // const onUpdateParameterValue = (event: TemplatesParameterUpdateEvent) => dispatch(updateTemplateParameterValue(event));

  const intl = useIntl();
  const resources = {
    parameter_value: intl.formatMessage({
      defaultMessage: 'Value',
      id: 'uEI5Wo',
      description: 'Label for displaying parameter value',
    }),
    parameter_type: intl.formatMessage({
      defaultMessage: 'Type',
      id: 'EeJitp',
      description: 'Label for displaying parameter type',
    }),
    parameter_name: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'er6O+w',
      description: 'Label for parameter Name',
    }),
    associated_workflows: intl.formatMessage({
      defaultMessage: 'Associated workflows',
      id: '36sF7T',
      description: 'Label for displaying associated workflows',
    }),
  };

  const [parametersList, setParametersList] = useFunctionalState<Template.ParameterDefinition[]>(
    Object.values(parameterDefinitions).map((parameter) => ({
      ...parameter,
    }))
  );

  const _onColumnClick = (_event: React.MouseEvent<HTMLElement>, column: IColumn): void => {
    let isSortedDescending = column.isSortedDescending;

    // If we've sorted this column, flip it.
    if (column.isSorted) {
      isSortedDescending = !isSortedDescending;
    }

    // Sort the items.
    const sortedItems = copyAndSort(parametersList(), column.fieldName as string, isSortedDescending);
    setParametersList(sortedItems);
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
      ariaLabel: resources.parameter_name,
      fieldName: 'displayName',
      key: '$displayName',
      isResizable: true,
      minWidth: 200,
      name: resources.parameter_name,
      maxWidth: 250,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
    {
      ariaLabel: resources.parameter_type,
      fieldName: 'type',
      key: '$type',
      isResizable: true,
      minWidth: 100,
      maxWidth: 100,
      name: resources.parameter_type,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
    {
      ariaLabel: resources.parameter_value,
      fieldName: 'value',
      key: '$value',
      isResizable: true,
      minWidth: 200,
      isMultiline: true,
      name: resources.parameter_value,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
    {
      ariaLabel: resources.associated_workflows,
      fieldName: 'associatedWorkflows',
      key: '$associatedWorkflows',
      isResizable: true,
      minWidth: 100,
      maxWidth: 100,
      name: resources.associated_workflows,
      showSortIconWhenUnsorted: true,
      onColumnClick: _onColumnClick,
    },
  ]);

  const onRenderItemColumn = (item: Template.ParameterDefinition, _index: number | undefined, column: IColumn | undefined) => {
    switch (column?.key) {
      case '$displayName':
        return <div>{item.displayName}</div>;

      case '$type':
        return <div>{item.type}</div>;

      case '$value':
        return (
          <TextField
            className="msla-templates-value-name"
            value={item.name}
            onChange={(_event, _newValue) => {
              // handleWorkflowNameChange(item, newValue)
            }}
            // onBlur={() => handleWorkflowNameBlur(item)}
            // errorMessage={workflowErrors[item.id]?.workflow}
          />
        );

      case '$associatedWorkflows':
        return <div>{'TODO'}</div>;

      default:
        return null;
    }
  };

  return (
    <div className="msla-template-create-tabs">
      <DetailsList
        setKey="id"
        items={parametersList()}
        columns={columns()}
        // groups={isSingleWorkflow ? undefined : groups()}
        compact={true}
        // onRenderRow={onRenderRow}
        onRenderItemColumn={onRenderItemColumn}
        selectionMode={SelectionMode.none}
      />
    </div>
  );
};

const copyAndSort = (items: Template.Parameter[], columnKey: string, isSortedDescending?: boolean): Template.Parameter[] => {
  const keyPath =
    columnKey === '$name' ? ['connectorDisplayName'] : columnKey === '$status' ? ['hasConnection'] : ['connection', 'displayName'];
  return items.slice(0).sort((a: Template.Parameter, b: Template.Parameter) => {
    return (
      isSortedDescending
        ? getObjectPropertyValue(a, keyPath) < getObjectPropertyValue(b, keyPath)
        : getObjectPropertyValue(a, keyPath) > getObjectPropertyValue(b, keyPath)
    )
      ? 1
      : -1;
  });
};
