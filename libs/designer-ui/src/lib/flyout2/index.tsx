import InformationImage from '../card/images/information_tiny.svg';
import Constants from '../constants';
import { getDragStartHandlerWhenDisabled } from '../helper';
import { FlyoutBalloon } from './flyoutballoon';
import type { FlyoutSelectedEventHandler } from './types';
import { useRef } from 'react';

export interface Flyout2Props {
  ariaLabel?: string;
  documentationLink?: Swagger.ExternalDocumentation;
  flyoutExpanded: boolean;
  flyoutKey: string;
  tabIndex?: number;
  text: string;
  title?: string;
  onClick?: FlyoutSelectedEventHandler;
  onDocumentationLinkClick?(): void;
}

const onDragStartWhenDisabled = getDragStartHandlerWhenDisabled();

export const Flyout2: React.FC<Flyout2Props> = ({
  ariaLabel,
  documentationLink,
  title,
  flyoutExpanded,
  flyoutKey,
  tabIndex = 0,
  text,
  onClick,
  onDocumentationLinkClick,
}) => {
  const iconRef = useRef<HTMLImageElement | null>(null);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    handleClickOrEnterKeyPress(e);
  };

  const handleEnterKeyPress: React.KeyboardEventHandler<HTMLButtonElement> = (e) => {
    if (e.which === Constants.KEYS.ENTER) {
      handleClickOrEnterKeyPress(e);
    }
  };

  const handleClickOrEnterKeyPress = (e: React.KeyboardEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.({ key: flyoutExpanded ? '' : flyoutKey });
  };

  return (
    <button
      aria-label={ariaLabel}
      className="msla-button msla-flyout"
      tabIndex={tabIndex}
      title={title}
      onClick={handleClick}
      onKeyPress={handleEnterKeyPress}
    >
      <img
        alt=""
        className="msla-flyout-icon"
        draggable={false}
        ref={iconRef}
        role="presentation"
        src={InformationImage}
        onDragStart={onDragStartWhenDisabled}
      />
      <FlyoutBalloon
        flyoutExpanded={flyoutExpanded}
        target={iconRef.current}
        text={text}
        documentationLink={documentationLink}
        onClick={onClick}
        onDocumentationLinkClick={onDocumentationLinkClick}
      />
    </button>
  );
};
