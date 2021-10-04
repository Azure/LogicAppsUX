// import { IButton, IconButton } from '@fluentui/react/lib/Button';
// import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
// import { IMessageBarStyles, MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
// import { TooltipHost } from '@fluentui/react/lib/Tooltip';
// import { css } from '@fluentui/react/lib/Utilities';
// import * as React from 'react';
// import { findDOMNode } from 'react-dom';
// import { equals, format, hexToRgbA } from '../../common/utilities/Utils';

// import { BaseComponent, BaseComponentProps } from '../base';
// import Constants from '../constants';
// import { Event, EventHandler } from '../eventhandler';
// import { getDragStartHandlerWhenDisabled } from '../helper';
// import { InfoControl, InfoControlProps } from '../infocontrol';
// import { DocLinkClickedEventHandler, DocumentationItem } from '../recommendation3/_documentationitem';
// import { UserAction } from '../telemetry/models';
// import { Tip, TipProps } from '../tip';
// import { Title, TitleChangeEvent } from '../title';
// import { isEnterKey, isSpaceKey } from '../utils/keyboardUtils';
// import { CardV2 } from './cardv2/cardv2';
// import { CommentBox, CommentBoxProps } from './commentbox';
// import WarningIcon from './images/badges/warning.generated';
// import { Menu, MenuItemOption } from './menu/_menu';

// export const CardWidth = {
//   CARD: 'CARD',
//   IF: 'IF',
//   SCOPE: 'SCOPE',
//   EXPRESSIONBUILDER: 'EXPRESSIONBUILDER',
// };

// export interface ImageHeaderIcon {
//   additionalClassNames?: string[];
//   iconName: string;
//   title: string;
//   onClick?(): void;
// }

// export interface BadgeProps {
//   additionalClassNames?: string[];
//   badgeText: string;
//   title: string;
// }

// export interface CardProps extends BaseComponentProps {
//   brandColor?: string;
//   collapsed?: boolean;
//   commentBox?: CommentBoxProps;
//   connectionDisplayName?: string;
//   connectionRequired?: boolean;
//   contextMenuOptions?: MenuItemOption[];
//   darkHeader?: boolean;
//   description?: string;
//   documentation?: Swagger.ExternalDocumentation;
//   draggable?: boolean;
//   errorLevel?: MessageBarType;
//   errorMessage?: string;
//   failed?: boolean;
//   headerBadges?: BadgeProps[];
//   headerIcons?: ImageHeaderIcon[];
//   headerWidth?: string;
//   hideComment?: boolean;
//   hideHeaderLogo?: boolean;
//   hideShowContents?: boolean;
//   icon?: string;
//   infoMessageOption?: InfoControlProps;
//   invalid?: boolean;
//   isEditingTitle?: boolean;
//   isLoadingContent?: boolean;
//   isPanelModeEnabled?: boolean;
//   menuItemOptions?: MenuItemOption[];
//   openWindow?(url: string): Promise<boolean>;
//   readOnly?: boolean;
//   rootRef?: React.RefObject<HTMLDivElement>;
//   staticResultsEnabled?: boolean;
//   selected?: boolean;
//   showConnectionsOnMenu?: boolean;
//   tag?: string;
//   tip?: TipProps;
//   title?: string;
//   warning?: string;
//   width?: string;
//   onClick?: EventHandler<Event<Card>>;
//   onCollapse?: EventHandler<Event<Card>>;
//   onCommitTitleChange?: EventHandler<TitleChangeEvent>;
//   onDiscardTitleChange?: EventHandler<Event<Title>>;
//   onDocLinkClick?: DocLinkClickedEventHandler;
//   onDragEnd?(): void;
//   onDragStart?: React.DragEventHandler<HTMLElement>;
//   onMenuShown?(): void;
//   onRenderCardViewHeaderServiceDescriptionIcon?(): JSX.Element;
//   handleCardViewHeaderService?(): boolean;
// }

// export interface CardState {
//   cardDescriptionExpanded?: boolean;
//   cardDescriptionTarget?: Element;
//   menuExpanded?: boolean;
// }

// export const loadingComponent = <div className="msla-card-loading">{Resources.LOADING_TEXT}</div>;

// const onDragStartWhenDisabled = getDragStartHandlerWhenDisabled();

// export class Card extends BaseComponent<CardProps, CardState> {
//   static defaultProps = {
//     hideShowContents: false,
//     menuItemOptions: [] as MenuItemOption[],
//   };

//   private _cardDescriptionIconButtonRef = React.createRef<IButton>();
//   private _header: HTMLElement;
//   private _menuIconButtonRef = React.createRef<IButton>();
//   private _titleRef: Title;

//   constructor(props: CardProps) {
//     super(props);

//     this.state = {
//       cardDescriptionExpanded: false,
//       menuExpanded: false,
//     };
//   }

//   componentDidUpdate(_: CardProps, prevState: CardState): void {
//     if (this._cardDescriptionIconButtonRef.current) {
//       const cardDescriptionTarget = findDOMNode(this._cardDescriptionIconButtonRef.current as unknown as React.ReactInstance) as Element;
//       if (cardDescriptionTarget !== prevState.cardDescriptionTarget) {
//         this.setState({
//           cardDescriptionTarget,
//         });
//       }
//     }
//   }

//   render(): JSX.Element {
//     const { selected, brandColor, isPanelModeEnabled } = this.props;
//     if (isPanelModeEnabled) {
//       return <CardV2 {...this.props}>{this.props.children}</CardV2>;
//     }

//     let selectedStyle = {};
//     if (selected) {
//       selectedStyle = {
//         borderColor: `${brandColor || Constants.DEFAULT_BRAND_COLOR}`,
//         outlineColor: `${brandColor || Constants.DEFAULT_BRAND_COLOR}`,
//       };
//     }

//     const { readOnly, tip } = this.props;
//     let cardTip: JSX.Element = null;
//     if (!readOnly && !!tip) {
//       cardTip = <Tip gapSpace={6} setTarget={this._setTipTarget} {...tip} />;
//     }

//     return (
//       <div className={this._getClassName()} style={selectedStyle} onClick={this._handleClick}>
//         {this._renderHeader()}
//         {this._renderCardDescription()}
//         {this._renderMenu()}
//         {this._renderBody()}
//         {cardTip}
//       </div>
//     );
//   }

//   focus(): void {
//     this.handleFocusEvent();
//     if (this._titleRef) {
//       this._titleRef.focus();
//     }
//   }

//   scrollIntoView(options?: boolean | ScrollIntoViewOptions): void {
//     if (this._titleRef) {
//       this._titleRef.scrollIntoView(options);
//     }
//   }

//   protected get telemetryIdentifier(): string {
//     return Constants.TELEMETRY_IDENTIFIERS.CARD;
//   }

//   protected getTelemetryContext() {
//     return {
//       ...super.getTelemetryContext(),
//       collapsed: this.props.collapsed,
//       selected: this.props.selected,
//     };
//   }

//   private _getClassName(): string {
//     let classes = ['msla-card'];

//     const { selected, width } = this.props;
//     if (selected) {
//       classes = [...classes, 'msla-card-selected'];
//     }

//     if (!width || equals(width, CardWidth.CARD)) {
//       classes = [...classes, 'msla-card-fixed-width'];
//     } else if (equals(width, CardWidth.SCOPE)) {
//       classes = [...classes, 'msla-card-variable-width'];
//     } else if (equals(width, CardWidth.EXPRESSIONBUILDER)) {
//       classes = [...classes, 'msla-card-variable-width', 'msla-card-expression-builder'];
//     }

//     return classes.join(' ');
//   }

//   private _renderBody(): JSX.Element | null {
//     const { children, collapsed, errorLevel, errorMessage, failed, headerWidth } = this.props;
//     if (collapsed) {
//       return null;
//     }

//     return (
//       <div className="msla-card-body">
//         {this._renderCommentBox()}
//         {this._renderInfoMessage()}
//         <CardError errorLevel={errorLevel} errorMessage={errorMessage} headerWidth={headerWidth} visible={failed} />
//         {children}
//       </div>
//     );
//   }

//   private _renderCommentBox(): JSX.Element | null {
//     const { commentBox, headerWidth } = this.props;
//     return commentBox ? <CommentBox {...commentBox} styleWidth={headerWidth} /> : null;
//   }

//   private _renderMenu(): JSX.Element | null {
//     const { menuItemOptions, showConnectionsOnMenu, trackEvent } = this.props;
//     const { menuExpanded } = this.state;
//     const anyMenuItems = menuItemOptions.length > 0;
//     if (!menuExpanded || !anyMenuItems) {
//       return null;
//     }

//     return (
//       <Menu
//         directionalHint={DirectionalHint.rightTopEdge}
//         gapSpace={2}
//         menuItems={menuItemOptions}
//         showConnectionsOnMenu={showConnectionsOnMenu}
//         target={findDOMNode(this._menuIconButtonRef.current as unknown as React.ReactInstance) as Element}
//         telemetryPath={Constants.TELEMETRY_IDENTIFIERS.CARD_HEADER}
//         trackEvent={trackEvent}
//         onClick={this._toggleMenu}
//         onDismiss={this._dismissMenu}
//       />
//     );
//   }

//   private _renderInfoMessage(): JSX.Element | null {
//     if (!this.props.infoMessageOption) {
//       return null;
//     }

//     return <InfoControl {...this.props.infoMessageOption} />;
//   }

//   private _renderCardDescription(): JSX.Element | null {
//     const { cardDescriptionExpanded } = this.state;
//     const { description, selected } = this.props;
//     if (!cardDescriptionExpanded || !selected) {
//       return null;
//     }

//     return (
//       <Callout
//         ariaLabel={description}
//         directionalHint={DirectionalHint.topLeftEdge}
//         gapSpace={0}
//         setInitialFocus={true}
//         target={this.state.cardDescriptionTarget}
//         onDismiss={this._handleDismiss}>
//         <div className="msla-information-box-container">
//           <div className="msla-information-box" role="dialog" data-is-focusable={true} tabIndex={0}>
//             {this._renderDoc()}
//           </div>
//         </div>
//       </Callout>
//     );
//   }

//   private _renderCardViewHeaderServiceDescriptionIcon(): JSX.Element | null {
//     const { description, onRenderCardViewHeaderServiceDescriptionIcon } = this.props;
//     if (!description) {
//       return null;
//     }

//     return onRenderCardViewHeaderServiceDescriptionIcon && onRenderCardViewHeaderServiceDescriptionIcon();
//   }

//   private _renderCardDescriptionIcon(): JSX.Element | null {
//     const { collapsed, description, selected } = this.props;
//     if (!selected || collapsed || !description) {
//       return null;
//     }

//     return (
//       <TooltipHost content={Resources.CARD_DESCRIPTION_DISPLAY_NAME}>
//         <IconButton
//           ariaLabel={Resources.CARD_DESCRIPTION_DISPLAY_NAME}
//           className="msla-button msla-card-title-button msla-card-title-button-description"
//           componentRef={this._cardDescriptionIconButtonRef}
//           iconProps={{ className: 'msla-card-title-button-icon', iconName: 'Info' }}
//           onClick={this._handleCardDescriptionIconClick}
//         />
//       </TooltipHost>
//     );
//   }

//   private _renderMenuIcon(): JSX.Element {
//     const { title } = this.props;
//     const { menuExpanded } = this.state;
//     const content = format(Resources.CARD_MENU_ARIA_LABEL, title);

//     return (
//       <TooltipHost content={content}>
//         <IconButton
//           aria-expanded={menuExpanded}
//           ariaLabel={content}
//           className="msla-button msla-card-title-button msla-card-title-button-menu"
//           componentRef={this._menuIconButtonRef}
//           iconProps={{ className: 'msla-card-title-button-icon', iconName: 'More' }}
//           onClick={this._handleMenuClick}
//         />
//       </TooltipHost>
//     );
//   }

//   private _renderDoc(): JSX.Element {
//     const { description, documentation, openWindow, trackEvent, onDocLinkClick } = this.props;

//     if (documentation && documentation.url) {
//       return (
//         <DocumentationItem
//           description={description}
//           link={{ url: documentation.url, urlDescription: Resources.DOCUMENTATION_URLDESCRIPTION }}
//           openWindow={openWindow}
//           trackEvent={trackEvent}
//           onClick={onDocLinkClick}
//         />
//       );
//     } else {
//       return <DocumentationItem description={description} trackEvent={trackEvent} />;
//     }
//   }

//   private _renderHeader() {
//     const { headerBadges, headerIcons, headerWidth, hideHeaderLogo, warning } = this.props;
//     let brandColorRgbA: string;
//     const brandColor = this.props.brandColor || Constants.DEFAULT_BRAND_COLOR;
//     const { darkHeader, icon, menuItemOptions, title, tag, trackEvent, readOnly, isEditingTitle } = this.props;
//     const { handleCardViewHeaderService } = this.props;

//     try {
//       brandColorRgbA = hexToRgbA(brandColor, Constants.HEADER_AND_TOKEN_OPACITY);
//     } catch {
//       brandColorRgbA = hexToRgbA(Constants.DEFAULT_BRAND_COLOR, Constants.HEADER_AND_TOKEN_OPACITY);
//     }

//     let headerClassName = darkHeader ? 'msla-card-header msla-dark-header' : 'msla-card-header';
//     headerClassName += !headerWidth ? ' msla-header-fixed-width' : '';

//     const headerStyle: React.CSSProperties = {
//       backgroundColor: darkHeader ? Constants.DARK_BRAND_COLOR : brandColorRgbA,
//     };

//     if (!!headerWidth) {
//       headerStyle.width = headerWidth;
//     }

//     const logoStyle = {
//       backgroundColor: brandColor,
//     };
//     const menuIcon = !readOnly && menuItemOptions.length > 0 ? this._renderMenuIcon() : null;

//     const draggable = this.props.draggable && !isEditingTitle;

//     const onDragStartHandler: React.DragEventHandler<HTMLElement> = draggable ? this._handleDragStart : onDragStartWhenDisabled;

//     const onRenderCardDescriptionIcon =
//       handleCardViewHeaderService && handleCardViewHeaderService()
//         ? this._renderCardViewHeaderServiceDescriptionIcon()
//         : this._renderCardDescriptionIcon();

//     return (
//       <div
//         className={headerClassName}
//         draggable={draggable}
//         ref={(header) => (this._header = header)}
//         style={headerStyle}
//         onDragStart={onDragStartHandler}
//         onDragEnd={this._handleDragEnd}>
//         <div
//           className="msla-card-title-group"
//           role="button"
//           aria-expanded={!this.props.collapsed}
//           aria-label={title}
//           tabIndex={0}
//           onClick={this._toggleCollapse}
//           onFocus={this._onCardFocus}
//           onKeyPress={this._handleKeyPress}
//           onKeyUp={this._handleKeyUp}>
//           {!hideHeaderLogo ? (
//             <div
//               className="msla-card-header-logo"
//               style={logoStyle}
//               draggable={false}
//               onClick={this._toggleCollapse}
//               onDragStart={onDragStartWhenDisabled}>
//               <img
//                 alt=""
//                 role="presentation"
//                 src={icon}
//                 className="msla-card-header-icon"
//                 draggable={false}
//                 onDragStart={onDragStartWhenDisabled}
//               />
//             </div>
//           ) : null}

//           <Title
//             ref={(titleRef: Title) => (this._titleRef = titleRef)}
//             className="msla-card-header-title"
//             text={title}
//             tag={tag}
//             trackEvent={trackEvent}
//             isEditingTitle={isEditingTitle}
//             onCommit={this.props.onCommitTitleChange}
//             onDiscard={this.props.onDiscardTitleChange}
//             expanded={!this.props.collapsed}
//           />
//           <BadgeHeaderIcons headerIcons={headerBadges} isVisible={isEditingTitle} />
//         </div>

//         <div className="msla-card-title-button-group">
//           {hideHeaderLogo ? null : <CardStatusIcon warning={warning} />}
//           {hideHeaderLogo ? null : onRenderCardDescriptionIcon}
//           <ImageHeaderIcons headerIcons={headerIcons} />
//           {menuIcon}
//         </div>
//       </div>
//     );
//   }

//   private _onCardFocus = (): void => {
//     const { onClick } = this.props;
//     if (onClick) {
//       onClick({
//         currentTarget: this,
//       });
//     }
//   };

//   private _handleCardDescriptionIconClick: React.MouseEventHandler<HTMLButtonElement> = () => {
//     this.setState({
//       cardDescriptionExpanded: !this.state.cardDescriptionExpanded,
//     });
//   };

//   private _handleDismiss = (): void => {
//     this.setState({
//       cardDescriptionExpanded: false,
//     });
//   };

//   private _handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
//     const { onClick } = this.props;
//     if (onClick) {
//       e.stopPropagation();
//       onClick({
//         currentTarget: this,
//       });
//     }
//   };

//   private _handleKeyPress: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
//     if (!this.props.isEditingTitle && isSpaceKey(e)) {
//       e.preventDefault();
//       e.stopPropagation();
//       this._toggleCollapse();
//     }
//   };

//   private _handleKeyUp: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
//     if (isEnterKey(e)) {
//       this._toggleCollapse();
//     }
//   };

//   private _toggleMenu = (): void => {
//     const { menuExpanded } = this.state;

//     const { onMenuShown } = this.props;
//     if (!menuExpanded && onMenuShown) {
//       onMenuShown();
//     }

//     this.setState({
//       menuExpanded: !menuExpanded,
//     });
//   };

//   private _dismissMenu = (): void => {
//     this.setState({
//       menuExpanded: false,
//     });
//   };

//   private _handleMenuClick = (e: React.MouseEvent<HTMLElement>): void => {
//     this.trackAction(UserAction.click, Constants.TELEMETRY_IDENTIFIERS.CARD_HEADER_MENU);
//     e.preventDefault();
//     this._toggleMenu();
//   };

//   private _handleDragStart = (e: React.DragEvent<HTMLElement>): void => {
//     this.handleDragEvent(e);
//     const { onDragStart } = this.props;
//     if (onDragStart) {
//       onDragStart(e);
//     }
//   };

//   private _handleDragEnd = (): void => {
//     const { onDragEnd } = this.props;
//     if (onDragEnd) {
//       onDragEnd();
//     }
//   };

//   private _setTipTarget = (): React.ReactInstance | string => {
//     return this._header;
//   };

//   private _toggleCollapse = (): void => {
//     this.handleClickEvent();

//     const { collapsed, onCollapse } = this.props;
//     if (onCollapse) {
//       onCollapse({
//         currentTarget: this,
//       });
//     }

//     if (!collapsed && this.state.menuExpanded) {
//       this.setState({
//         menuExpanded: false,
//       });
//     }
//   };
// }

// interface CardErrorProps {
//   errorLevel?: MessageBarType;
//   errorMessage?: string;
//   headerWidth?: string;
//   visible: boolean;
// }

// function CardError({ errorLevel, errorMessage, headerWidth, visible }: CardErrorProps): JSX.Element | null {
//   if (!visible) {
//     return null;
//   }

//   const className = headerWidth ? 'msla-error' : 'msla-error msla-fixed-width';
//   const styles: Partial<IMessageBarStyles> = {
//     innerText: {
//       overflowWrap: 'break-word',
//       textAlign: 'left',
//       width: '100%',
//       wordWrap: 'break-word',
//     },
//     root: {
//       ...(headerWidth ? { width: headerWidth } : undefined),
//     },
//   };

//   return (
//     <div className={className}>
//       <MessageBar messageBarType={errorLevel} styles={styles}>
//         {errorMessage.replace(/\\r/g, '').replace(/\\n/g, '\n')}
//       </MessageBar>
//     </div>
//   );
// }

// interface CardStatusIconProps {
//   warning?: string;
// }

// function CardStatusIcon({ warning }: CardStatusIconProps): JSX.Element | null {
//   if (!warning) {
//     return null;
//   }

//   return (
//     <img
//       alt={warning}
//       className="msla-card-title-img"
//       draggable={false}
//       src={WarningIcon}
//       title={warning}
//       onDragStart={onDragStartWhenDisabled}
//     />
//   );
// }

// CardStatusIcon.defaultProps = {
//   warning: '',
// };

// export function ImageHeaderIcons(props: { headerIcons: ImageHeaderIcon[] }): JSX.Element | null {
//   const { headerIcons } = props;

//   if (headerIcons && headerIcons.length > 0) {
//     return (
//       <>
//         {headerIcons.map(({ additionalClassNames = [], iconName, title, onClick }: ImageHeaderIcon) => (
//           <TooltipHost content={title}>
//             <IconButton
//               aria-label={title}
//               className={css('msla-button', 'msla-card-title-button', ...additionalClassNames)}
//               iconProps={{ className: 'msla-card-title-button-icon', iconName }}
//               onClick={onClick}
//             />
//           </TooltipHost>
//         ))}
//       </>
//     );
//   }

//   return null;
// }

// export function BadgeHeaderIcons(props: { headerIcons: BadgeProps[]; isVisible?: boolean }): JSX.Element | null {
//   const { headerIcons, isVisible: isEditingTitle } = props;

//   if (!isEditingTitle && headerIcons && headerIcons.length > 0) {
//     return (
//       <>
//         {headerIcons.map(({ additionalClassNames = [], badgeText, title }: BadgeProps) => (
//           <div title={title} aria-label={badgeText} className={css('msla-badge', ...additionalClassNames)}>
//             {badgeText}
//           </div>
//         ))}
//       </>
//     );
//   }

//   return null;
// }
