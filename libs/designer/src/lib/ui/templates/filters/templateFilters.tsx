import { SearchBox } from '@fluentui/react';
import { type FilterObject, TemplatesFilterPill } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface TemplateFiltersProps {
  connectors?: FilterObject[];
  detailFilters: Record<string, FilterObject[]>;
}

export const TemplateFilters = ({ connectors, detailFilters }: TemplateFiltersProps) => {
  const intl = useIntl();

  const intlText = {
    SEARCH: intl.formatMessage({
      defaultMessage: 'Search',
      id: 'IUbVFR',
      description: 'Placeholder text for search templates',
    }),
    CONNECTORS: intl.formatMessage({
      defaultMessage: 'Connectors',
      id: 'KO2eUv',
      description: 'Label text for connectors filter',
    }),
    TYPE: intl.formatMessage({
      defaultMessage: 'Type',
      id: 'wfekJ7',
      description: 'Label text for type filter',
    }),
  };

  return (
    <div className="msla-templates-detailFilters">
      <div className="msla-templates-detailFilters-search">
        <SearchBox placeholder={intlText.SEARCH} autoFocus={false} onChange={(_e, _newValue) => {}} />
      </div>
      <div className="msla-templates-detailFilters-pills">
        {connectors && <TemplatesFilterPill filterName={intlText.CONNECTORS} items={connectors} onApplyButtonClick={() => {}} />}
        {Object.keys(detailFilters).map((filterName, index) => (
          <TemplatesFilterPill key={index} filterName={filterName} items={detailFilters[filterName]} onApplyButtonClick={() => {}} />
        ))}
      </div>
    </div>
  );
};
