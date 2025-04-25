import {
  Button,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from '@fluentui/react-components';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useResourceStrings } from '../resources';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';
import { openPanelView, TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { CustomizeParameterPanel } from '../../panel/configureTemplatePanel/customizeParameterPanel/customizeParameterPanel';
import { MoreHorizontal16Filled } from '@fluentui/react-icons';

export const TemplateParametersList = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const intlText = {
    AriaLabel: intl.formatMessage({
      defaultMessage: 'List of parameters in the template',
      id: 'u2z3kg',
      description: 'The aria label for the parameters table',
    }),
  };

  const { parameterDefinitions, currentPanelView, workflowsInTemplate, parameterErrors } = useSelector((state: RootState) => ({
    parameterDefinitions: state.template.parameterDefinitions,
    currentPanelView: state.panel.currentPanelView,
    workflowsInTemplate: state.template.workflows,
    parameterErrors: state.template.errors.parameters,
  }));

  const parameterErrorIds = useMemo(() => {
    return Object.entries(parameterErrors)
      .filter(([_id, error]) => error)
      .map(([id]) => id);
  }, [parameterErrors]);

  const isAccelerator = Object.keys(workflowsInTemplate).length > 1;
  const resourceStrings = useResourceStrings();

  const columns = useMemo(() => {
    const baseColumn = [
      { columnKey: 'displayName', label: resourceStrings.DisplayName },
      { columnKey: 'name', label: resourceStrings.Name },
      { columnKey: 'type', label: resourceStrings.Type },
      { columnKey: 'default', label: resourceStrings.DefaultValue },
      // { columnKey: 'allowedValues', label: resourceStrings.AllowedValues },  //TODO: revisit allowedValues
    ];
    const column2 = [
      { columnKey: 'description', label: resourceStrings.Description },
      { columnKey: 'required', label: resourceStrings.Required },
    ];
    if (isAccelerator) {
      return [...baseColumn, { columnKey: 'associatedWorkflows', label: resourceStrings.AssociatedWorkflows }, ...column2];
    }
    return [...baseColumn, ...column2];
  }, [isAccelerator, resourceStrings]);

  const items = useMemo(
    () =>
      Object.values(parameterDefinitions)?.map((parameter) => ({
        name: parameter?.name ?? resourceStrings.Placeholder,
        displayName: parameter?.displayName ?? resourceStrings.Placeholder,
        type: parameter.type,
        default: parameter?.default ?? resourceStrings.Placeholder,
        // allowedValues:
        //   parameter?.allowedValues?.map((allowedValue) => `${allowedValue.displayName} ${allowedValue.value}`)?.join(', ') ??
        //   resourceStrings.Placeholder,
        associatedWorkflows: parameter?.associatedWorkflows?.join(', ') ?? resourceStrings.Placeholder,
        description: parameter?.description ?? resourceStrings.Placeholder,
        required: parameter?.required ?? false,
      })) ?? [],
    [parameterDefinitions, resourceStrings]
  );

  const handleSelectParameter = useCallback(
    (parameterId: string) => {
      dispatch(openPanelView({ panelView: TemplatePanelView.CustomizeParameter, selectedTabId: parameterId }));
    },
    [dispatch]
  );

  if (Object.keys(parameterDefinitions).length === 0) {
    return (
      <div style={{ overflowX: 'auto', paddingTop: '12px' }}>
        <Text>{resourceStrings.NoParameterInTemplate}</Text>
      </div>
    );
  }

  return (
    <div className="msla-templates-wizard-tab-content" style={{ overflowX: 'auto', paddingTop: '12px' }}>
      {currentPanelView === TemplatePanelView.CustomizeParameter && <CustomizeParameterPanel />}
      <MessageBar intent="error" className="msla-templates-error-message-bar" hidden={!parameterErrorIds.length}>
        <MessageBarBody>
          <MessageBarTitle>{resourceStrings.MissingRequiredFields}</MessageBarTitle>
          <Text>{parameterErrorIds.join(', ')}</Text>
        </MessageBarBody>
      </MessageBar>

      <Table aria-label={intlText.AriaLabel} size="small" style={{ width: '80%' }}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHeaderCell key={column.columnKey}>
                <Text weight="semibold">{column.label}</Text>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.name}>
              <TableCell>
                <TableCellLayout>{item.displayName}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout
                  style={{
                    overflow: 'hidden',
                  }}
                >
                  <Text
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name}
                  </Text>
                </TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.type}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.default}</TableCellLayout>
              </TableCell>
              {/* <TableCell>
                <TableCellLayout>{item.allowedValues}</TableCellLayout>
              </TableCell> */}
              {isAccelerator && (
                <TableCell>
                  <TableCellLayout>{getResourceNameFromId(item.associatedWorkflows)}</TableCellLayout>
                </TableCell>
              )}
              <TableCell>
                <TableCellLayout>{item.description}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.required ? resourceStrings.RequiredOn : resourceStrings.RequiredOff}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>
                  <Button icon={<MoreHorizontal16Filled />} appearance="subtle" onClick={() => handleSelectParameter(item.name)} />
                </TableCellLayout>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
