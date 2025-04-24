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
import { useIntl } from 'react-intl';

interface TeachingPopupOwnProps {
  targetElement: HTMLElement | null;
  title: string;
  message: string;
  messageBody?: JSX.Element;
  primaryButtonText?: string;
  handlePopupPrimaryOnClick: () => void;
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
  } = props;
  const intl = useIntl();

  const classNames = useStyles();

  const defaultPrimaryButtonText = intl.formatMessage({
    defaultMessage: 'Got it',
    id: 'iovsbI',
    description: 'Default text for the default dismiss button text for a teaching popover.',
  });

  return (
    <TeachingPopover
      defaultOpen={true}
      appearance={'brand'}
      withArrow={withArrow}
      positioning={positioning ?? { target: targetElement, position: 'after', align: 'top' }}
      size={size || 'small'}
      open={true}
      trapFocus={false}
    >
      <TeachingPopoverSurface className={classNames.popoverSurface}>
        <TeachingPopoverBody>
          <TeachingPopoverTitle>{title}</TeachingPopoverTitle>
          {message}
          <br />
          {messageBody}
        </TeachingPopoverBody>
        <TeachingPopoverFooter
          primary={{
            children: primaryButtonText || defaultPrimaryButtonText,
            onClick: handlePopupPrimaryOnClick,
          }}
          secondary={secondaryButtonText ? { children: secondaryButtonText, onClick: handlePopupSecondaryOnClick } : undefined}
        />
      </TeachingPopoverSurface>
    </TeachingPopover>
  );
};
