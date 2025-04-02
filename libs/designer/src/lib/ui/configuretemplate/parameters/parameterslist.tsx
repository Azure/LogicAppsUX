import { Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow, Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { useResourceStrings } from '../resources';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

export const TemplateParametersList = () => {
  const intl = useIntl();
  const intlText = {
    AriaLabel: intl.formatMessage({
      defaultMessage: 'List of parameters in the template',
      id: 'u2z3kg',
      description: 'The aria label for the parameters table',
    }),
  };

  const { parameterDefinitions } = useSelector((state: RootState) => ({
    parameterDefinitions: state.template.parameterDefinitions,
  }));

  const resourceStrings = useResourceStrings();

  const columns = [
    { columnKey: 'name', label: resourceStrings.Name },
    { columnKey: 'displayName', label: resourceStrings.DisplayName },
    { columnKey: 'type', label: resourceStrings.Type },
    { columnKey: 'default', label: resourceStrings.DefaultValue },
    { columnKey: 'allowedValues', label: resourceStrings.AllowedValues },
    { columnKey: 'associatedWorkflows', label: resourceStrings.AssociatedWorkflows },
    { columnKey: 'description', label: resourceStrings.Description },
    { columnKey: 'required', label: resourceStrings.Required },
  ];

  const items = useMemo(
    () =>
      Object.values(parameterDefinitions)?.map((parameter) => ({
        name: parameter?.name ?? resourceStrings.Placeholder,
        displayName: parameter?.displayName ?? resourceStrings.Placeholder,
        type: parameter.type,
        default: parameter?.default ?? resourceStrings.Placeholder,
        allowedValues:
          parameter?.allowedValues?.map((allowedValue) => `${allowedValue.displayName} ${allowedValue.value}`)?.join(', ') ??
          resourceStrings.Placeholder,
        associatedWorkflows: parameter?.associatedWorkflows?.join(', ') ?? resourceStrings.Placeholder,
        description: parameter?.description ?? resourceStrings.Placeholder,
        required: parameter?.required ?? false,
      })) ?? [],
    [parameterDefinitions, resourceStrings]
  );

  return (
    <div style={{ overflowX: 'auto', paddingTop: '12px' }}>
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
                <TableCellLayout>{item.name}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.type}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.default}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.allowedValues}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.associatedWorkflows}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.description}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.required}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{'placeholder'}</TableCellLayout>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
