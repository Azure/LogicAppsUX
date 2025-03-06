import type { FloatingActionMenuItem } from '.';
import { DynamicallyAddedParameterType } from '../../dynamicallyaddedparameter';
import { getIconForDynamicallyAddedParameterType } from '../../dynamicallyaddedparameter/helper';
import { getIntl } from '@microsoft/logic-apps-shared';

export function getMenuItemsForDynamicAddedParameters(supportedTypes: string[]): FloatingActionMenuItem[] {
  const intl = getIntl();

  const menuItems: FloatingActionMenuItem[] = [];
  if (supportedTypes.includes('text')) {
    const type = DynamicallyAddedParameterType.Text;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Text', id: 'f5867cef7730', description: 'Label for Text type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('boolean')) {
    const type = DynamicallyAddedParameterType.Boolean;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Yes/No', id: '9ce86f7b8116', description: 'Label for Bool type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('file')) {
    const type = DynamicallyAddedParameterType.File;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'File', id: 'f74a3bb016ab', description: 'Label for File type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('email')) {
    const type = DynamicallyAddedParameterType.Email;
    menuItems.push({
      type,
      label: intl.formatMessage({
        defaultMessage: 'Email',
        id: '81f0567c7b8e',
        description: 'Label for Email type dynamically added parameter',
      }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('number')) {
    const type = DynamicallyAddedParameterType.Number;
    menuItems.push({
      type,
      label: intl.formatMessage({
        defaultMessage: 'Number',
        id: '87e5b755692f',
        description: 'Label for Number type dynamically added parameter',
      }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('date')) {
    const type = DynamicallyAddedParameterType.Date;
    menuItems.push({
      type,
      label: intl.formatMessage({
        defaultMessage: 'Date',
        id: '0ccbb0b897e7',
        description: 'The label for a dynamically added parameter that has Date type.',
      }),
      icon: getIconForDynamicallyAddedParameterType(DynamicallyAddedParameterType.Date),
    });
  }

  return menuItems;
}
