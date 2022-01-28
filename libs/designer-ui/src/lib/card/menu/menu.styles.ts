import { getTheme, FontSizes } from '@fluentui/react/lib/Styling';
import { IMenuItemStyles, MenuItemOption, MenuProps } from '.';

export const getMenuItemStyles = (menuItem: MenuItemOption, props: MenuProps): IMenuItemStyles => {
  const palette = getTheme().palette;

  return {
    root: [
      'msla-menuItem-root',
      {
        cursor: 'pointer',
        display: 'flex',
        lineHeight: 'normal',
        width: '100%',
      },
    ],
    mainContentContainer: [
      'msla-menuItem-mainContentContainer',
      {
        backgroundColor: 'transparent',
        border: 'none',
        flex: 1,
        padding: '0 6px',
        display: 'flex',
        maxWidth: props.maxWidth,
      },
    ],
    mainIconRoot: [
      'msla-menuItem-mainIconRoot',
      {
        boxSizing: 'border-box',
        height: 32,
        width: 32,
        margin: 0,
        border: 0,
        padding: 10,
        opacity: menuItem.disabled ? 0.5 : undefined,
      },
    ],
    textContainer: [
      'msla-menuItem-textContainer',
      {
        border: 0,
        boxSizing: 'border-box',
        fontSize: FontSizes.small,
        height: 32,
        lineHeight: 32,
        margin: 0,
        overflow: 'hidden',
        textAlign: 'left',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    ],
    mainText: [
      'msla-menuItem-mainText',
      {
        boxSizing: 'border-box',
        margin: 0,
        border: 0,
        height: 16,
        lineHeight: 16,
        textAlign: 'left',
        fontSize: FontSizes.small,
      },
    ],
    textAreaIcon: [
      'msla-menuItem-textAreaIcon',
      {
        boxSizing: 'border-box',
        margin: 0,
        border: 0,
        height: 16,
        padding: 2,
      },
    ],
    secondaryText: [
      'msla-menuItem-secondaryText',
      {
        boxSizing: 'border-box',
        margin: 0,
        border: 0,
        height: 16,
        lineHeight: 16,
        textAlign: 'left',
        fontSize: FontSizes.small,
        color: menuItem.disabled ? palette.neutralTertiaryAlt : palette.themePrimary,
        maxWidth: 180,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      },
    ],
  };
};
