import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import * as React from 'react';

export interface Category {
  itemKey: string;
  linkText: string;
}

export interface CategoryPivotProps {
  categories: Category[];
  disabled?: boolean;
  selectedCategory: string;
  visible?: boolean;
  onCategoryClick?(item: PivotItem): void;
}

export const CategoryPivot: React.FC<CategoryPivotProps> = (props) => {
  const { disabled = false, visible = true, categories, selectedCategory, onCategoryClick } = props;

  if (!visible) {
    return null;
  }

  // TODO(joechung): Disable the pivot when Fabric Pivots become disableable.
  const p: any = {
    ...(!disabled ? { onLinkClick: onCategoryClick } : undefined),
  };

  return (
    <div className="msla-categories">
      <Pivot headersOnly={true} selectedKey={selectedCategory} {...p}>
        {categories.map(({ itemKey, linkText }: Category) => (
          <PivotItem key={itemKey} itemKey={itemKey} headerText={linkText} />
        ))}
      </Pivot>
    </div>
  );
};
