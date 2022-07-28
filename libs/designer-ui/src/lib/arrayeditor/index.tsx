import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps, Segment } from '../editor/base';
import type { LabelProps } from '../label';
import { CollapsedArray } from './collapsedarray';
import { ExpandedArray } from './expandedarray';
import { useState } from 'react';

export interface ArrayEditorItemProps {
  key?: string;
  content: Segment[];
}

export interface ArrayEditorProps extends BaseEditorProps {
  canDeleteLastItem?: boolean;
  disabledToggle?: boolean;
  initialItems?: ArrayEditorItemProps[];
  labelProps: LabelProps;
  readOnly?: boolean;
}

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  canDeleteLastItem = true,
  disabledToggle = false,
  initialItems = [],
  labelProps,
  readOnly = false,
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [isValid, setIsValid] = useState(true);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="msla-array-editor-container">
      {collapsed ? (
        <CollapsedArray labelProps={labelProps} items={items} isValid={isValid} setItems={setItems} setIsValid={setIsValid} />
      ) : (
        <ExpandedArray
          items={items}
          setItems={setItems}
          labelProps={labelProps}
          readOnly={readOnly}
          canDeleteLastItem={canDeleteLastItem}
        />
      )}
      <div className="msla-array-commands">
        {!disabledToggle ? (
          <EditorCollapseToggle collapsed={collapsed} disabled={!isValid || readOnly} toggleCollapsed={toggleCollapsed} />
        ) : null}
      </div>
    </div>
  );
};
