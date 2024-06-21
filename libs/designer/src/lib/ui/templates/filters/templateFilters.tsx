import { SearchBox } from '@fluentui/react';
import { TemplatesFilterPill } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';
// import { PillEditorFilterableList } from "@microsoft/azureportal-reactview/PillEditorHelpers";
interface FilterObject {
  value: string;
  displayName: string;
}

export interface TemplateFiltersProps {
  connectors?: FilterObject[];
  triggers?: FilterObject[];
  filters: Record<string, FilterObject[]>;
}

export const TemplateFilters = ({ connectors, triggers, filters }: TemplateFiltersProps) => {
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
    TRIGGERS: intl.formatMessage({
      defaultMessage: 'Triggers',
      id: 'ZhLAAn',
      description: 'Label text for triggers filter',
    }),
  };

  return (
    <div className="msla-templates-filters">
      <div className="msla-templates-filters-search">
        <SearchBox placeholder={intlText.SEARCH} autoFocus={false} onChange={(_e, _newValue) => {}} />
      </div>
      <div className="msla-templates-filters-pills">
        {connectors && <TemplatesFilterPill filterName={intlText.CONNECTORS} items={connectors} onApplyButtonClick={() => {}} />}
        {triggers && <TemplatesFilterPill filterName={intlText.TRIGGERS} items={triggers} onApplyButtonClick={() => {}} />}
        {Object.keys(filters).map((filterName, index) => (
          <TemplatesFilterPill key={index} filterName={filterName} items={filters[filterName]} onApplyButtonClick={() => {}} />
        ))}
      </div>
    </div>
  );
};
