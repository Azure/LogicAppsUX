/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

import {
  makeStyles,
  TeachingPopover,
  TeachingPopoverBody,
  TeachingPopoverFooter,
  type TeachingPopoverProps,
  TeachingPopoverSurface,
  TeachingPopoverTitle,
} from '@fluentui/react-components';
import { useState } from 'react';
import { useIntl } from 'react-intl';

interface TeachingPopupOwnProps {
  defaultClose?: boolean;
  targetElement: HTMLElement | null;
  title: string;
  message?: string;
  messageBody?: JSX.Element;
  primaryButtonText?: string;
  handlePopupPrimaryOnClick?: () => void;
  secondaryButtonText?: string;
  handlePopupSecondaryOnClick?: () => void;
}

export type TeachingPopupProps = TeachingPopupOwnProps & Pick<TeachingPopoverProps, 'positioning' | 'withArrow' | 'size'>;

const useStyles = makeStyles({
  popoverSurface: {
    maxWidth: '320px',
  },
});

export const TeachingPopup: React.FC<TeachingPopupProps> = (props) => {
  const {
    targetElement,
    title,
    message,
    messageBody,
    positioning,
    primaryButtonText,
    handlePopupPrimaryOnClick,
    secondaryButtonText,
    handlePopupSecondaryOnClick,
    size,
    withArrow,
    defaultClose,
  } = props;
  const intl = useIntl();
  const [open, setOpen] = useState(!defaultClose);

  const classNames = useStyles();

  const defaultPrimaryButtonText = intl.formatMessage({
    defaultMessage: 'Got it',
    id: 'iovsbI',
    description: 'Default text for the default dismiss button text for a teaching popover.',
  });

  return (
    <TeachingPopover
      onOpenChange={(_e, data) => setOpen(data.open)}
      appearance={'brand'}
      withArrow={withArrow}
      positioning={
        positioning ?? {
          target: targetElement,
          position: 'after',
          align: 'top',
        }
      }
      size={size || 'small'}
      open={open}
      trapFocus={false}
    >
      <TeachingPopoverSurface className={classNames.popoverSurface}>
        <TeachingPopoverBody>
          <TeachingPopoverTitle>{title}</TeachingPopoverTitle>
          {message}
          {message && messageBody ? <br /> : null}
          {messageBody}
        </TeachingPopoverBody>

        {handlePopupPrimaryOnClick ? (
          <TeachingPopoverFooter
            primary={{
              children: primaryButtonText || defaultPrimaryButtonText,
              onClick: handlePopupPrimaryOnClick,
            }}
            secondary={
              handlePopupSecondaryOnClick
                ? {
                    children: secondaryButtonText,
                    onClick: handlePopupSecondaryOnClick,
                  }
                : undefined
            }
          />
        ) : null}
      </TeachingPopoverSurface>
    </TeachingPopover>
  );
};
