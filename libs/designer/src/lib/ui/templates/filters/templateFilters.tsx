import { SearchBox } from '@fluentui/react';
import { TemplatesFilterPill } from '@microsoft/designer-ui';
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
  return (
    <div>
      <div>
        <SearchBox placeholder={'searchOperation'} autoFocus={false} onChange={(_e, _newValue) => {}} />
      </div>
      <div>
        {connectors && <TemplatesFilterPill filterName={'Connectors'} items={connectors} onApplyButtonClick={() => {}} />}
        {triggers && <TemplatesFilterPill filterName={'Triggers'} items={triggers} onApplyButtonClick={() => {}} />}
        {Object.keys(filters).map((filterName, index) => (
          <TemplatesFilterPill key={index} filterName={filterName} items={filters[filterName]} onApplyButtonClick={() => {}} />
        ))}
      </div>
    </div>
  );
};
