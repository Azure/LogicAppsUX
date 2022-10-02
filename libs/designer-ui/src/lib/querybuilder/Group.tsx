import { Checkbox } from '../checkbox';
import type { ValueSegment } from '../editor';
import { GroupDropdown } from './GroupDropdown';
import { Row } from './Row';
import type { ICalloutProps, IIconProps, IOverflowSetItemProps, IOverflowSetStyles } from '@fluentui/react';
import { css, IconButton, DirectionalHint, TooltipHost, OverflowSet } from '@fluentui/react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const overflowStyle: Partial<IOverflowSetStyles> = {
  root: {
    height: '32px',
    backgroundColor: 'transparent',
  },
};

const menuIconProps: IIconProps = {
  iconName: 'More',
};

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.leftCenter,
};

interface GroupProps {
  checked?: boolean;
  groupMenuItems: IOverflowSetItemProps[];
  rowMenuItems: IOverflowSetItemProps[];
  GetTokenPicker: (
    editorId: string,
    labelId: string,
    onClick?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void
  ) => JSX.Element;
}

export const Group = ({ checked = false, groupMenuItems, rowMenuItems, GetTokenPicker }: GroupProps) => {
  const intl = useIntl();
  const [collapsed, setCollapsed] = useState(false);

  const onRenderOverflowButton = (): JSX.Element => {
    const groupCommands = intl.formatMessage({
      defaultMessage: 'More commands',
      description: 'Label for commands in row',
    });
    return (
      <TooltipHost calloutProps={calloutProps} content={groupCommands}>
        <IconButton
          ariaLabel={groupCommands}
          styles={overflowStyle}
          menuIconProps={menuIconProps}
          menuProps={groupMenuItems && { items: groupMenuItems }}
        />
      </TooltipHost>
    );
  };

  const collapseLabel = intl.formatMessage({
    defaultMessage: 'Collapse',
    description: 'Label for collapsing group',
  });

  const collapseIconProps: IIconProps = {
    iconName: collapsed ? 'FullScreen' : 'BackToWindow',
  };

  return (
    <div className="msla-querybuilder-group-container">
      <div className="msla-querybuilder-group-gutter-hook" />
      <div className={css('msla-querybuilder-group-content', collapsed && 'collapsed')}>
        {!collapsed ? (
          <>
            <Checkbox className="msla-querybuilder-group-checkbox" initialChecked={checked} />
            <div className="msla-querybuilder-row-section">
              <GroupDropdown />
              <Row rowMenuItems={rowMenuItems} GetTokenPicker={GetTokenPicker} />
            </div>
          </>
        ) : (
          <GroupDropdown />
        )}
        <div className={css('msla-querybuilder-group-controlbar', collapsed && 'collapsed')}>
          <TooltipHost calloutProps={calloutProps} content={collapseLabel}>
            <IconButton
              ariaLabel={collapseLabel}
              styles={overflowStyle}
              menuIconProps={collapseIconProps}
              onClick={() => setCollapsed(!collapsed)}
            />
          </TooltipHost>
          <OverflowSet
            className="msla-querybuilder-group-more"
            styles={overflowStyle}
            items={[]}
            overflowItems={groupMenuItems}
            onRenderOverflowButton={onRenderOverflowButton}
            onRenderItem={function (_item: IOverflowSetItemProps) {
              throw new Error('No items in overflowset');
            }}
          />
        </div>
      </div>
    </div>
  );
};
