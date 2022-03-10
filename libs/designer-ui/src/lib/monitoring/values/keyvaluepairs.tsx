import type { ValueProps } from './types';
import type { IColumn } from '@fluentui/react';
import { CheckboxVisibility, DetailsList, DetailsListLayoutMode, SelectionMode } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const KeyValuePairs: React.FC<ValueProps> = ({ displayName, value = {}, visible = true }) => {
  const intl = useIntl();
  if (!visible) {
    return null;
  }

  const Resources = {
    KVP_KEY: intl.formatMessage({
      defaultMessage: 'Key',
      description: 'Header text for key-value pair keys',
    }),
    KVP_VALUE: intl.formatMessage({
      defaultMessage: 'Value',
      description: 'Header text for key-value pair values',
    }),
  };

  const columns: IColumn[] = [
    {
      ariaLabel: Resources.KVP_KEY,
      fieldName: '$key',
      flexGrow: 1,
      key: '$key',
      isMultiline: true,
      isResizable: true,
      minWidth: 0,
      name: Resources.KVP_KEY,
      targetWidthProportion: 1,
    },
    {
      ariaLabel: Resources.KVP_VALUE,
      fieldName: '$value',
      flexGrow: 1,
      key: '$value',
      isMultiline: true,
      isResizable: true,
      minWidth: 0,
      name: Resources.KVP_VALUE,
      targetWidthProportion: 1,
    },
  ];
  const items = Object.entries(value).reduce((pairs: Record<string, unknown>[], [$key, $value]) => [...pairs, { $key, $value }], []);

  return (
    <section className="msla-trace-value-label">
      <label className="msla-trace-value-display-name">{displayName}</label>
      <div className="msla-trace-value-text msla-trace-value-key-value-pairs">
        <DetailsList
          ariaLabel={displayName}
          ariaLabelForListHeader={displayName}
          checkboxVisibility={CheckboxVisibility.hidden}
          columns={columns}
          compact={true}
          isHeaderVisible={true}
          items={items}
          layoutMode={DetailsListLayoutMode.justified}
          selectionMode={SelectionMode.none}
        />
      </div>
    </section>
  );
};
