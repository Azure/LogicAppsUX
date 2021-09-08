// import * as React from 'react';
// import * as ReactDOM from 'react-dom';

// import guid from '../../common/utilities/guid';

// import {
//     ActionButton,
//     ActionButtonProps
// } from '../actionbutton';
// import { BaseComponent, BaseComponentProps } from '../base';
// import Constants from '../constants';
// import { DirectionalHint } from 'office-ui-fabric-react/lib/common/DirectionalHint';
// import {
//     Menu,
//     MenuItemType,
//     MenuItemOption
// } from '../card/menu';
// import EllipsisIcon from './images/ellipsis.generated';

// export interface ActionInfo {
//     ariaLabel?: string;
//     icon: string;
//     title: string;
//     clickHandler(): void;
// }

// export interface PaletteToggleEvent {
//     close: boolean;
// }

// export interface PaletteProps extends BaseComponentProps {
//     actions?: ActionInfo[];
//     moreActionsDropdownVisible?: boolean;
//     numberOfVisibleActions?: number;
//     onPaletteMoreToggle?(e: PaletteToggleEvent): void;
// }

// export class Palette extends BaseComponent<PaletteProps> {
//     private _moreButton: HTMLElement;

//     constructor(props: PaletteProps) {
//         super(props);
//     }

//     render(): React.ReactElement<PaletteProps> {
//         return (
//             <div className="msla-embed-palette">
//                 {this._renderActions()}
//             </div>
//         );
//     }

//     protected get telemetryIdentifier(): string {
//         return Constants.TELEMETRY_IDENTIFIERS.PALETTE;
//     }

//     private _renderActions = (): JSX.Element => {
//         const { actions, numberOfVisibleActions } = this.props;
//         let visibleActions: ActionInfo[] = [],
//             showMoreButton = false,
//             expandDropdownMenu: JSX.Element | undefined;

//         if (actions) {
//             if (numberOfVisibleActions > 0) {
//                 visibleActions = actions.slice(0, numberOfVisibleActions);
//                 showMoreButton = actions.length > numberOfVisibleActions;
//             }
//         }

//         const actionButtonProps: ActionButtonProps = {
//             key: guid(),
//             text: Resources.ADD_MORE,
//             icon: EllipsisIcon,
//             onClick: this._handleClickMoreButton,
//             trackEvent: this.props.trackEvent
//         };

//         const moreButton = showMoreButton
//             ? <ActionButton {...actionButtonProps} />
//             : null;

//         if (showMoreButton) {
//             expandDropdownMenu = this._renderExpandDropdownActions(this.props.actions.slice(this.props.numberOfVisibleActions));
//         }

//         return (
//             <div className="msla-action-palette-list" ref={c => this._moreButton = ReactDOM.findDOMNode(c) as HTMLElement}>
//                 {visibleActions.map(this._renderActionLink)}
//                 {moreButton}
//                 {expandDropdownMenu}
//             </div>
//         );
//     };

//     private _renderActionLink = (action: ActionInfo): JSX.Element => {
//         const clickHandler = (): void => {
//             if (action.clickHandler) {
//                 action.clickHandler();
//             }

//             if (this.props.onPaletteMoreToggle) {
//                 this.props.onPaletteMoreToggle({
//                     close: true
//                 });
//             }
//         };
//         const { ariaLabel, icon, title } = action;
//         const actionButtonProps: ActionButtonProps = {
//             ariaLabel,
//             key: guid(),
//             text: title,
//             icon,
//             onClick: clickHandler,
//             trackEvent: this.props.trackEvent
//         };

//         return <ActionButton {...actionButtonProps} />;
//     };

//     private _renderExpandDropdownActions = (actions: ActionInfo[]): JSX.Element | null => {
//         if (!this.props.moreActionsDropdownVisible) {
//             return null;
//         }

//         const { trackEvent } = this.props;

//         const menuItems: MenuItemOption[] = actions.map(action => {
//             const clickHandler = (): void => {
//                 const actionClickHandler = action.clickHandler;
//                 if (actionClickHandler) {
//                     actionClickHandler();
//                 }

//                 const { onPaletteMoreToggle } = this.props;
//                 if (onPaletteMoreToggle) {
//                     onPaletteMoreToggle({
//                         close: true
//                     });
//                 }
//             };

//             return {
//                 ariaLabel: action.ariaLabel,
//                 key: guid(),
//                 iconUri: action.icon,
//                 title: action.title,
//                 type: MenuItemType.Normal,
//                 clickHandler
//             };
//         });

//         return (
//             <div className="msla-actionpalette-expanded-menu">
//                 <Menu menuItems={menuItems}
//                     target={this._moreButton}
//                     directionalHint={DirectionalHint.rightTopEdge}
//                     trackEvent={trackEvent}
//                     onDismiss={this._onDismiss}
//                 />
//             </div>
//         );
//     };

//     private _handleClickMoreButton = (e: React.MouseEvent<HTMLElement>) => {
//         e.preventDefault();
//         e.stopPropagation();
//         const { onPaletteMoreToggle } = this.props;
//         if (onPaletteMoreToggle) {
//             onPaletteMoreToggle({
//                 close: this.props.moreActionsDropdownVisible
//             });
//         }
//     };

//     private _onDismiss = (): void => {
//         const { onPaletteMoreToggle } = this.props;
//         if (onPaletteMoreToggle) {
//             onPaletteMoreToggle({
//                 close: true
//             });
//         }
//     };
// }
