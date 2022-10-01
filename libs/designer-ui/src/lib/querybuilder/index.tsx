import type { ValueSegment } from '../editor';
import { AddSection } from './AddSection';
import { GroupDropdown } from './GroupDropdown';
import { Row } from './Row';
import type { IOverflowSetItemProps } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface QueryBuilderProps {
  readonly?: boolean;
  GetTokenPicker: (
    editorId: string,
    labelId: string,
    onClick?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void
  ) => JSX.Element;
}

export const QueryBuilderEditor = ({ GetTokenPicker }: QueryBuilderProps) => {
  const intl = useIntl();

  const deleteButton = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'delete button',
  });
  const moveUpButton = intl.formatMessage({
    defaultMessage: 'Move up',
    description: 'Move up button',
  });
  const moveDownButton = intl.formatMessage({
    defaultMessage: 'Move down',
    description: 'Move down button',
  });
  const makeGroupButton = intl.formatMessage({
    defaultMessage: 'Make Group',
    description: 'Make group button',
  });

  const handleDelete = () => {
    console.log('delete');
  };
  const rowMenuItems: IOverflowSetItemProps[] = [
    {
      key: deleteButton,
      disabled: false,
      iconProps: {
        iconName: 'Delete',
      },
      iconOnly: true,
      name: deleteButton,
      onClick: handleDelete,
    },
    {
      key: moveUpButton,
      disabled: false,
      iconProps: {
        iconName: 'Up',
      },
      iconOnly: true,
      name: moveUpButton,
      onClick: handleDelete,
    },
    {
      key: moveDownButton,
      disabled: false,
      iconProps: {
        iconName: 'Down',
      },
      iconOnly: true,
      name: moveDownButton,
      onClick: handleDelete,
    },
    {
      key: makeGroupButton,
      disabled: false,
      iconProps: {
        iconName: 'ViewAll',
      },
      iconOnly: true,
      name: makeGroupButton,
      onClick: handleDelete,
    },
  ];

  return (
    <>
      <GroupDropdown />
      <Row GetTokenPicker={GetTokenPicker} rowMenuItems={rowMenuItems} />
      <Row GetTokenPicker={GetTokenPicker} rowMenuItems={rowMenuItems} />
      <AddSection />
    </>
  );
};
