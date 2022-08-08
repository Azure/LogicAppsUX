import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import type { LabelProps } from '../label';
import { CollapsedArray } from './collapsedarray';
import { ExpandedArray } from './expandedarray';
import { useState } from 'react';

export interface ArrayEditorItemProps {
  key?: string;
  content: ValueSegment[];
}

export interface ArrayEditorProps extends BaseEditorProps {
  canDeleteLastItem?: boolean;
  disableToggle?: boolean;
  initialItems?: ArrayEditorItemProps[];
  labelProps: LabelProps;
  readOnly?: boolean;
  addArrayLabel?: boolean;
}

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  canDeleteLastItem = true,
  disableToggle = false,
  initialItems = [],
  labelProps,
  addArrayLabel,
  readOnly = false,
  tokenGroup,
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [isValid, setIsValid] = useState(true);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="msla-array-editor-container">
      {collapsed || !initialItems ? (
        <CollapsedArray
          labelProps={addArrayLabel ? labelProps : undefined}
          items={items}
          isValid={isValid}
          setItems={setItems}
          setIsValid={setIsValid}
          tokenGroup={tokenGroup}
        />
      ) : (
        <ExpandedArray
          items={items}
          setItems={setItems}
          labelProps={labelProps}
          readOnly={readOnly}
          canDeleteLastItem={canDeleteLastItem}
          tokenGroup={tokenGroup}
        />
      )}
      <div className="msla-array-commands">
        {!disableToggle ? (
          <EditorCollapseToggle collapsed={collapsed} disabled={!isValid || readOnly} toggleCollapsed={toggleCollapsed} />
        ) : null}
      </div>
    </div>
  );
};
