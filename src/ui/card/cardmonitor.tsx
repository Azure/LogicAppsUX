import { MessageBarType } from '@fluentui/react/lib/MessageBar';
import * as React from 'react';

import guid from '../../common/utilities/guid';
import { hexToRgbA } from '../../common/utilities/Utils';

import { BaseComponent, BaseComponentProps } from '../base';
// import { CardWidth } from '../card';
import Constants from '../constants';
// import { StatusPill } from '../monitoring/statuspill';
import { Title } from '../title';
import { isEnterKey, isSpaceKey } from '../utils/keyboardUtils';
import { getStatusString } from '../utils/utils';
// import { CardV2 } from './cardv2/cardv2';
import { CommentBoxProps } from './commentbox';
import AbortedBadge from './images/badges/aborted.svg';
import CancelledBadge from './images/badges/cancelled.svg';
import FailedBadge from './images/badges/failed.svg';
import RunningBadge from './images/badges/running.svg';
import SkippedBadge from './images/badges/skipped.svg';
import SucceededBadge from './images/badges/succeeded.svg';
import SucceededWithRetriesBadge from './images/badges/succeededwithretries.svg';
import { BadgeHeaderIcons, BadgeProps, ImageHeaderIcon, ImageHeaderIcons } from './card';

export interface CardProps extends BaseComponentProps {
  active?: boolean;
  brandColor?: string;
  children?: React.ReactNode;
  collapsed?: boolean;
  colorizingEnabled?: boolean;
  commentBox?: CommentBoxProps;
  connectionDisplayName?: string;
  connectionRequired?: boolean;
  duration?: string;
  durationAnnounced?: string;
  errorLevel?: MessageBarType;
  errorMessage?: string;
  failed?: boolean;
  headerBadges?: BadgeProps[];
  headerIcons?: ImageHeaderIcon[];
  hasMonitoringErrors?: boolean;
  hasRetries?: boolean;
  hideHeaderLogo?: boolean;
  icon?: string;
  isLoadingContent?: boolean;
  isPanelModeEnabled?: boolean;
  rootRef?: React.RefObject<HTMLDivElement>;
  selected?: boolean;
  staticResultsEnabled?: boolean;
  status?: string;
  title?: string;
  width?: string;
  onClick?(): void;
  onCollapse?(): void;
}

export interface CardBodyProps extends BaseComponentProps {
  children?: React.ReactNode;
  collapsed?: boolean;
  errorMessage?: string;
  failed?: boolean;
  hasMonitoringErrors?: boolean;
}

export interface CardDurationProps {
  brandColor?: string;
  duration?: string;
  durationAnnounced?: string;
  hasRetries?: boolean;
  status?: string;
}

export interface CardErrorProps extends BaseComponentProps {
  errorMessage?: string;
  failed?: boolean;
}

export interface CardHeaderProps extends BaseComponentProps {
  active?: boolean;
  additionalIcons?: ImageHeaderIcon[];
  headerBadges?: BadgeProps[];
  brandColor?: string;
  collapsed?: boolean;
  duration?: string;
  durationAnnounced?: string;
  hasRetries?: boolean;
  hideHeaderLogo?: boolean;
  icon?: string;
  status?: string;
  title?: string;
  onCollapse?(): void;
}

export interface CardHeaderLogoProps {
  brandColor?: string;
  hideHeaderLogo?: boolean;
  icon?: string;
}

export interface CardStatusProps {
  hasRetries?: boolean;
  status: string;
}

// export class Card extends BaseComponent<CardProps> {
//   private readonly _cardRef = React.createRef<HTMLDivElement>();
//   private readonly _ref = React.createRef<HTMLDivElement>();

//   focus(): void {
//     const { current } = this._cardRef;
//     if (current) {
//       current.focus();
//     }
//   }

//   render(): JSX.Element {
//     const { isPanelModeEnabled } = this.props;

//     if (isPanelModeEnabled) {
//       return <CardContainer {...this.props} rootRef={this._cardRef} />;
//     }

//     const {
//       active,
//       brandColor,
//       children,
//       collapsed,
//       duration,
//       durationAnnounced,
//       errorMessage,
//       failed,
//       hasMonitoringErrors,
//       hasRetries,
//       headerBadges,
//       headerIcons,
//       hideHeaderLogo,
//       icon,
//       status,
//       title,
//       trackEvent,
//       onCollapse,
//     } = this.props;

//     return (
//       <div className={this._getClassName()} onClick={this._onClick} style={this._getCardStyle()} ref={this._ref}>
//         <CardHeader
//           active={active}
//           additionalIcons={headerIcons}
//           brandColor={brandColor}
//           collapsed={collapsed}
//           duration={duration}
//           durationAnnounced={durationAnnounced}
//           hasRetries={hasRetries}
//           headerBadges={headerBadges}
//           hideHeaderLogo={hideHeaderLogo}
//           icon={icon}
//           status={status}
//           title={title}
//           trackEvent={trackEvent}
//           onCollapse={onCollapse}
//         />
//         <CardBody
//           collapsed={collapsed}
//           errorMessage={errorMessage}
//           failed={failed}
//           trackEvent={trackEvent}
//           hasMonitoringErrors={hasMonitoringErrors}>
//           {children}
//         </CardBody>
//       </div>
//     );
//   }

//   private _getCardStyle(): React.CSSProperties | undefined {
//     const { active: $active, brandColor, selected } = this.props;
//     if (selected && $active) {
//       const color = brandColor || Constants.DEFAULT_BRAND_COLOR;
//       return {
//         borderColor: color,
//         outlineColor: color,
//       };
//     }

//     return undefined;
//   }

//   private _getClassName(): string {
//     const classes = ['msla-card', 'msla-monitoring-card'];

//     const { active: $active } = this.props;
//     if (!$active) {
//       classes.push('msla-monitoring-inactive');
//     }

//     const { selected } = this.props;
//     if (selected) {
//       classes.push('msla-card-selected');
//     }

//     const { width } = this.props;
//     if (!width || equals(width, CardWidth.CARD)) {
//       classes.push('msla-card-fixed-width');
//     } else if (equals(width, CardWidth.SCOPE)) {
//       classes.push('msla-card-variable-width');
//     } else if (equals(width, CardWidth.EXPRESSIONBUILDER)) {
//       classes.push('msla-card-variable-width', 'msla-card-expression-builder');
//     }

//     return classes.join(' ');
//   }

//   private _onClick = (e: React.MouseEvent<HTMLElement>): void => {
//     const { active: $active, onClick: onClickHandler } = this.props;

//     if (onClickHandler && $active) {
//       const firstCardParent = findAncestorElement(e.target as HTMLElement, (currentElement: HTMLElement) =>
//         currentElement.classList.contains('msla-monitoring-card')
//       );

//       if (firstCardParent === this._ref.current) {
//         onClickHandler();
//       }
//     }
//   };
// }

// export function CardBody(props: CardBodyProps) {
//   const { collapsed } = props;
//   if (collapsed) {
//     return null;
//   }

//   const { children, errorMessage, failed, trackEvent, hasMonitoringErrors } = props;
//   return (
//     <div className={hasMonitoringErrors ? 'msla-card-body msla-has-errors' : 'msla-card-body'}>
//       <CardError errorMessage={errorMessage} failed={failed} trackEvent={trackEvent} />
//       {children}
//     </div>
//   );
// }

// function CardContainer(props: CardProps) {
//   const { duration, durationAnnounced, hasRetries, rootRef, status } = props;
//   const id = React.useRef(guid());

//   return (
//     <div className="msla-monitoring-card-container">
//       <CardV2 describedBy={id.current} {...props} hideShowContents={true} rootRef={rootRef} />
//       <StatusPill id={id.current} duration={duration} durationAnnounced={durationAnnounced} hasRetries={hasRetries} status={status} />
//     </div>
//   );
// }

export function CardDuration(props: CardDurationProps): JSX.Element | null {
  const { brandColor, duration, durationAnnounced, hasRetries, status } = props;
  const id = React.useRef<string>(guid());
  if (!duration) {
    return null;
  }

  const brandColorRgbA = hexToRgbA(brandColor ?? Constants.DEFAULT_BRAND_COLOR, Constants.DURATION_OPACITY);

  const durationStyles = {
    backgroundColor: brandColorRgbA,
  };

  const statusString = getStatusString(status ?? '', hasRetries ?? false);
  const description = [durationAnnounced, statusString].join('. ');

  return (
    <>
      <span className="msla-sr-only" id={id.current}>
        {description}
      </span>
      <div
        aria-describedby={id.current}
        className="msla-monitoring-card-duration"
        role="region"
        style={durationStyles}
        title={durationAnnounced}>
        {duration}
      </div>
    </>
  );
}

export function CardError(props: CardErrorProps) {
  const { failed } = props;
  if (!failed) {
    return null;
  }

  const { errorMessage } = props;
  return (
    <div className="msla-error">
      <div className="msla-error-text">{errorMessage}</div>
    </div>
  );
}

export class CardHeader extends BaseComponent<CardHeaderProps> {
  static defaultProps: Pick<CardHeaderProps, 'additionalIcons' | 'headerBadges'> = {
    additionalIcons: [],
    headerBadges: [],
  };

  render(): JSX.Element {
    const {
      additionalIcons,
      brandColor,
      collapsed,
      duration,
      durationAnnounced,
      hasRetries,
      headerBadges,
      hideHeaderLogo,
      icon,
      status,
      title,
      trackEvent,
    } = this.props;

    let brandColorRgbA: string;
    try {
      brandColorRgbA = hexToRgbA(brandColor || Constants.DEFAULT_BRAND_COLOR, Constants.HEADER_AND_TOKEN_OPACITY);
    } catch {
      brandColorRgbA = hexToRgbA(Constants.DEFAULT_BRAND_COLOR, Constants.HEADER_AND_TOKEN_OPACITY);
    }

    const headerStyles = {
      backgroundColor: brandColorRgbA,
    };

    return (
      <div className="msla-card-header msla-header-fixed-width msla-monitoring-card-header" style={headerStyles}>
        <div
          className="msla-card-title-group"
          role="button"
          aria-expanded={!this.props.collapsed}
          tabIndex={0}
          onClick={this._toggleCollapse}
          onKeyPress={this._handleKeyPress}
          onKeyUp={this._handleKeyUp}>
          <CardHeaderLogo brandColor={brandColor} hideHeaderLogo={hideHeaderLogo} icon={icon} />
          <Title className="msla-card-header-title" text={title} trackEvent={trackEvent} expanded={!collapsed} />
          <BadgeHeaderIcons headerIcons={headerBadges ?? []} />
        </div>
        <div className="msla-card-title-button-group" tabIndex={0}>
          <ImageHeaderIcons headerIcons={additionalIcons ?? []} />
          <CardDuration
            brandColor={brandColor}
            duration={duration}
            durationAnnounced={durationAnnounced}
            hasRetries={hasRetries}
            status={status}
          />
          <CardStatus hasRetries={hasRetries} status={status ?? ''} />
        </div>
      </div>
    );
  }

  private _handleKeyPress: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (isSpaceKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      this._toggleCollapse();
    }
  };

  private _handleKeyUp: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (isEnterKey(e)) {
      this._toggleCollapse();
    }
  };

  private _toggleCollapse = (): void => {
    const { active, onCollapse } = this.props;
    if (onCollapse && active) {
      onCollapse();
    }
  };
}

export function CardHeaderLogo(props: CardHeaderLogoProps) {
  const { hideHeaderLogo } = props;
  if (hideHeaderLogo) {
    return null;
  }

  const { brandColor, icon } = props;
  const logoStyle = {
    backgroundColor: brandColor || Constants.DEFAULT_BRAND_COLOR,
  };

  return (
    <div className="msla-card-header-logo" style={logoStyle}>
      <img className="msla-card-header-icon" src={icon} alt="" role="presentation" />
    </div>
  );
}

export function CardStatus(props: CardStatusProps): JSX.Element | null {
  const { hasRetries, status } = props;

  let src = '';
  switch (status) {
    case Constants.STATUS.ABORTED:
      src = AbortedBadge;
      break;
    case Constants.STATUS.CANCELLED:
      src = CancelledBadge;
      break;
    case Constants.STATUS.FAILED:
      src = FailedBadge;
      break;
    case Constants.STATUS.RUNNING:
    case Constants.STATUS.WAITING: // TODO(joechung): Should we use a different icon for the Waiting status?
      src = RunningBadge;
      break;
    case Constants.STATUS.SKIPPED:
      src = SkippedBadge;
      break;
    case Constants.STATUS.SUCCEEDED:
      src = hasRetries ? SucceededWithRetriesBadge : SucceededBadge;
      break;
    default:
      break;
  }

  if (!src) {
    return null;
  }

  return <img className="msla-monitoring-card-badge" src={src} alt={status} />;
}
