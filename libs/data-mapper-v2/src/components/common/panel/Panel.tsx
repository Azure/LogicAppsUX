import type React from 'react';
import { useStyles } from './styles';
import {
  InlineDrawer,
  DrawerHeader,
  DrawerHeaderTitle,
  Text,
  type Slot,
  DrawerBody,
  DrawerFooter,
  type InputOnChangeData,
  mergeClasses,
  Caption2,
} from '@fluentui/react-components';
import { SearchBox } from '@fluentui/react-search';
import type { FluentIcon } from '@fluentui/react-icons';

type PanelProps = {
  id: string;
  isOpen: boolean;
  position?: 'start' | 'end';
  title?: {
    text: string;
    icon?: FluentIcon;
    size?: 500 | 100 | 200 | 300 | 400 | 600 | 700 | 800 | 900 | 1000;
    rightAction?: Slot<'div'>;
    subTitleText?: string;
  };
  search?: {
    placeholder?: string;
    text?: string;
    onChange: (value?: string) => void;
  };
  body?: React.ReactNode;
  footer?: React.ReactNode;
  styles?: {
    root?: string;
    header?: string;
    title?: string;
    search?: string;
    titleIcon?: string;
    body?: string;
    footer?: string;
    subTitle?: string;
  };
};

export const Panel = (props: PanelProps) => {
  const defaultStyles = useStyles();
  const { title, body, isOpen, styles, search, footer, position } = props;

  return (
    <InlineDrawer className={mergeClasses(defaultStyles.root, styles?.root)} open={isOpen} position={position}>
      {title ? (
        <DrawerHeader className={mergeClasses(defaultStyles.header, styles?.header)}>
          <DrawerHeaderTitle action={title?.rightAction} heading={{ as: 'div' }}>
            {title?.icon ? <title.icon className={mergeClasses(defaultStyles.titleIcon, styles?.titleIcon ?? '')} /> : null}
            <Text size={title?.size ?? 400} className={mergeClasses(defaultStyles.title, styles?.title)}>
              {title?.text}
            </Text>
            {title?.subTitleText ? (
              <Caption2 className={mergeClasses(defaultStyles.subTitle, styles?.subTitle ?? '')}>{title.subTitleText}</Caption2>
            ) : null}
          </DrawerHeaderTitle>
          {search ? (
            <SearchBox
              placeholder={search.placeholder}
              className={mergeClasses(defaultStyles.search, styles?.search)}
              value={search.text}
              size="small"
              onChange={(_e, data: InputOnChangeData) => {
                search.onChange(data?.value);
              }}
            />
          ) : null}
        </DrawerHeader>
      ) : null}
      {body ? <DrawerBody className={mergeClasses(defaultStyles.body, styles?.body)}>{body}</DrawerBody> : null}
      {footer ? <DrawerFooter className={mergeClasses(defaultStyles.footer, styles?.footer)}>{footer}</DrawerFooter> : null}
    </InlineDrawer>
  );
};
