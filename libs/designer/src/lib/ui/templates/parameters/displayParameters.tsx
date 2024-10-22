import { Callout, DetailsList, type IColumn, Label, Link, SelectionMode, Text, TextField } from '@fluentui/react';
import { updateTemplateParameterValue } from '../../../core/state/templates/templateSlice';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { getPropertyValue, type Template } from '@microsoft/logic-apps-shared';
import { useFunctionalState } from '@react-hookz/web';
import { type IntlShape, useIntl } from 'react-intl';
import { useMemo } from 'react';
import { useBoolean, useId } from '@fluentui/react-hooks';

export const DisplayParameters = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const {
    workflows,
    parameterDefinitions,
    errors: { parameters: parameterErrors },
  } = useSelector((state: RootState) => state.template);
  const isSingleWorkflow = useMemo(() => Object.keys(workflows).length === 1, [workflows]);

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

  const [parametersList, setParametersList] = useFunctionalState<Template.ParameterDefinition[]>(Object.values(parameterDefinitions));

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

  const [columns, setColumns] = useFunctionalState<IColumn[]>(() => {
    const baseColumns = [
      {
        ariaLabel: resources.parameter_name,
        fieldName: 'displayName',
        key: '$displayName',
        isResizable: true,
        minWidth: 150,
        isMultiline: true,
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
        minWidth: 70,
        maxWidth: 70,
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
        showSortIconWhenUnsorted: false,
        onColumnClick: _onColumnClick,
      },
    ];

    if (!isSingleWorkflow) {
      baseColumns.push({
        ariaLabel: resources.associated_workflows,
        fieldName: 'associatedWorkflows',
        key: '$associatedWorkflows',
        isResizable: true,
        minWidth: 180,
        isMultiline: true,
        name: resources.associated_workflows,
        showSortIconWhenUnsorted: false,
        onColumnClick: _onColumnClick,
      });
    }

    return baseColumns;
  });

  const updateItemInList = (item: Template.ParameterDefinition) => {
    const newList = parametersList().map((parameter: Template.ParameterDefinition) => (parameter.name === item.name ? item : parameter));
    setParametersList(newList);
  };

  const handleParameterValueChange = (item: Template.ParameterDefinition, newValue: string) => {
    updateItemInList({ ...item, value: newValue });
    dispatch(
      updateTemplateParameterValue({
        ...item,
        value: newValue,
      })
    );
  };

  const onRenderItemColumn = (item: Template.ParameterDefinition, _index: number | undefined, column: IColumn | undefined) => {
    switch (column?.key) {
      case '$displayName':
        return <ParameterName item={item} intl={intl} />;

      case '$type':
        return <Text className="msla-templates-parameters-values">{item.type}</Text>;

      case '$value':
        return (
          <TextField
            className="msla-templates-parameters-values"
            value={item.value}
            onChange={(_event, newValue) => {
              handleParameterValueChange(item, newValue ?? '');
            }}
            errorMessage={parameterErrors[item.name]}
          />
        );

      case '$associatedWorkflows':
        return <Text className="msla-templates-parameters-values">{item.associatedWorkflows?.join(', ')}</Text>;

      default:
        return null;
    }
  };

  return (
    <div className="msla-templates-parameters-tab">
      <DetailsList
        setKey="name"
        items={parametersList()}
        columns={columns()}
        compact={true}
        onRenderItemColumn={onRenderItemColumn}
        selectionMode={SelectionMode.none}
      />
    </div>
  );
};

const ParameterName = ({ item, intl }: { item: Template.ParameterDefinition; intl: IntlShape }): JSX.Element => {
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);
  const buttonId = useId('callout-button');

  return (
    <>
      <Label className="msla-templates-parameters-values" required={item.required}>
        <Link id={buttonId} as="button" onClick={toggleIsCalloutVisible} required={true}>
          {item.displayName}
        </Link>
      </Label>
      {isCalloutVisible && (
        <Callout role="dialog" gapSpace={0} target={`#${buttonId}`} onDismiss={toggleIsCalloutVisible} setInitialFocus>
          <Text as="h1" block variant="xLarge">
            {intl.formatMessage({ defaultMessage: 'Details', description: 'Title text for details', id: 'c2ZT7p' })}
          </Text>
          <Text
            block
            variant="small"
            // id={descriptionId}
          >
            Message body is optional. If help documentation is available, consider adding a link to learn more at the bottom.
          </Text>
          <Link
            href="http://microsoft.com"
            target="_blank"
            // className={styles.link}
          >
            Sample link
          </Link>
        </Callout>
      )}
    </>
  );
};

const copyAndSort = (items: Template.ParameterDefinition[], columnKey: string, isSortedDescending?: boolean): Template.Parameter[] => {
  return items.slice(0).sort((a: Template.ParameterDefinition, b: Template.ParameterDefinition) => {
    return (
      isSortedDescending
        ? getPropertyValue(a, columnKey) < getPropertyValue(b, columnKey)
        : getPropertyValue(a, columnKey) > getPropertyValue(b, columnKey)
    )
      ? 1
      : -1;
  });
};
