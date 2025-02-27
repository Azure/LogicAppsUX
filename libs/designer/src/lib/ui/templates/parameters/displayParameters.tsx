import { Callout, css, DetailsList, type IColumn, Label, SelectionMode } from '@fluentui/react';
import { Link, Text } from '@fluentui/react-components';
import { updateTemplateParameterValue } from '../../../core/state/templates/templateSlice';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { getPropertyValue, type Template } from '@microsoft/logic-apps-shared';
import { useFunctionalState } from '@react-hookz/web';
import { type IntlShape, useIntl } from 'react-intl';
import { useMemo } from 'react';
import { useBoolean, useId } from '@fluentui/react-hooks';
import { ParameterEditor } from './parametereditor';

export const DisplayParameters = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const {
    workflows,
    parameterDefinitions,
    errors: { parameters: parameterErrors },
  } = useSelector((state: RootState) => state.template);
  const parametersOverride = useSelector((state: RootState) => state.templateOptions.viewTemplateDetails?.parametersOverride);
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

  const [columns, setColumns] = useFunctionalState<IColumn[]>([
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
  ]);

  const updateItemInList = (item: Template.ParameterDefinition) => {
    const newList = parametersList().map((parameter: Template.ParameterDefinition) => (parameter.name === item.name ? item : parameter));
    setParametersList(newList);
  };

  const handleParameterValueChange = (newItem: Template.ParameterDefinition) => {
    updateItemInList(newItem);
    dispatch(updateTemplateParameterValue(newItem));
  };

  const onRenderItemColumn = (item: Template.ParameterDefinition, _index: number | undefined, column: IColumn | undefined) => {
    switch (column?.key) {
      case '$displayName':
        return <ParameterName aria-label={item.displayName} item={item} intl={intl} isSingleWorkflow={isSingleWorkflow} />;

      case '$type':
        return (
          <Text className="msla-templates-parameters-values" aria-label={item.type}>
            {item.type}
          </Text>
        );

      case '$value':
        return (
          <ParameterEditor
            item={item}
            onChange={handleParameterValueChange}
            disabled={parametersOverride?.[item.name]?.isEditable === false}
            error={parameterErrors[item.name]}
          />
        );

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

const ParameterName = ({
  item,
  intl,
  isSingleWorkflow,
}: { item: Template.ParameterDefinition; intl: IntlShape; isSingleWorkflow: boolean }): JSX.Element => {
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);
  const buttonId = useId('callout-button');

  return (
    <div className="msla-template-parameters-tab-name">
      <Link id={buttonId} as="button" onClick={toggleIsCalloutVisible}>
        <Label className={css('msla-templates-parameters-values', 'link')} required={item.required}>
          {item.displayName}
        </Label>
      </Link>
      {isCalloutVisible && (
        <Callout
          className="msla-templates-parameters-callout"
          role="dialog"
          gapSpace={0}
          target={`#${buttonId}`}
          onDismiss={toggleIsCalloutVisible}
          setInitialFocus
        >
          {!isSingleWorkflow && (
            <Text className="msla-templates-parameter-callout-title" block>
              {intl.formatMessage({ defaultMessage: 'Details', description: 'Title text for details', id: 'c2ZT7p' })}
            </Text>
          )}
          <Text className="msla-templates-parameter-callout-subtitle" block>
            {intl.formatMessage({ defaultMessage: 'Description', description: 'Subtitle text for description', id: 'eTW4SD' })}
          </Text>
          <Text className="msla-templates-parameter-callout-body" block>
            {item.description}
          </Text>
          {isSingleWorkflow ? null : (
            <div className="msla-templates-parameter-callout-associatedWorkflow">
              <Text className="msla-templates-parameter-callout-subtitle" block>
                {intl.formatMessage({
                  defaultMessage: 'Associated workflows',
                  description: 'Subtitle text for Associated workflows',
                  id: 'Xz88HV',
                })}
              </Text>
              {item?.associatedWorkflows?.map((workflow) => (
                <li key={workflow} className={css('msla-templates-parameter-callout-body', 'list')}>
                  {workflow}
                </li>
              ))}
            </div>
          )}
        </Callout>
      )}
    </div>
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
