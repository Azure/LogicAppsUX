import { SearchBox } from '@fluentui/react';
// import { PillEditorFilterableList } from "@microsoft/azureportal-reactview/PillEditorHelpers";
interface FilterObject {
  value: string;
  displayName: string;
}

export interface TemplateFiltersProps {
  connectors?: Record<string, FilterObject>;
}

export const TemplateFilters = () => {
  return (
    <div>
      <SearchBox placeholder={'searchOperation'} autoFocus={false} onChange={(_e, _newValue) => {}} />
      <div></div>
    </div>
  );
};
