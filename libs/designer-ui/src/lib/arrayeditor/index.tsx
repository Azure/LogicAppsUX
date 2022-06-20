// import { isHighContrastBlack } from '../utils';
// import { ICalloutProps, IconButton } from '@fluentui/react';
// import { TooltipHost, DirectionalHint } from '@fluentui/react';
// import { useIntl } from 'react-intl';

// export interface IArrayEditorStyles {
//   root?: React.CSSProperties;
//   toggleButton?: React.CSSProperties;
//   itemContainer?: React.CSSProperties;
//   item?: React.CSSProperties;
//   commandContainer?: React.CSSProperties;
// }

// export interface ArrayEditorItemProps {
//   key: string;
//   content: JSX.Element | JSX.Element[];
// }

// export interface ArrayEditorProps {
//   addItemToolbarComponent?: JSX.Element;
//   canDeleteLastItem?: boolean;
//   collapsed: boolean;
//   disableAddNew?: boolean;
//   disabledToggle?: boolean;
//   items?: ArrayEditorItemProps[];
//   styles?: IArrayEditorStyles;
//   readOnly?: boolean;
//   toggleExpand?(key: string, collapsed: boolean): void;
//   onAddItemClick?(key: string): void;
//   onDeleteItemClick?(itemKey: string): void;
// }

// const calloutProps: ICalloutProps = {
//   directionalHint: DirectionalHint.topCenter,
// };

// export const ArrayEditor: React.FC<ArrayEditorProps> = ({ collapsed, readOnly = false, disabledToggle }) => {
//   const intl = useIntl();

//   return (
//     <div className="msla-array-editor-container">
//       {collapsed ? renderCollapsedArray() : renderExpandedArray()}
//       {/* <div className="msla-array-commands">{renderToggleButton(collapsed, !readOnly && !disabledToggle)}</div> */}
//     </div>
//   );
// };

// const renderCollapsedArray = (): JSX.Element => {
//   return (
//     <div className="msla-array-container msla-array-editor-collapsed">
//       {label}
//       <div className="msla-array-content">
//         <Parameter {...this.props} hideLabel={true} />
//       </div>
//     </div>
//   );
// };

// const renderToggleButton = (collapsed: boolean, enabled: boolean): JSX.Element => {
//   const isInverted = isHighContrastBlack();
//   const toggleIcon = collapsed ? (isInverted ? ExpandIconInverted : ExpandIcon) : isInverted ? CollapseIconInverted : CollapseIcon;
//   const toggleText = collapsed ? Resources.PARAMETER_EXPAND_ICON_DESC : Resources.PARAMETER_COLLAPSE_ICON_DESC;
//   const { styles } = this.props;

//   return (
//     <div style={styles && styles.toggleButton}>
//       <TooltipHost calloutProps={calloutProps} content={toggleText}>
//         <IconButton
//           aria-label={toggleText}
//           className="msla-button msla-array-toggle-button"
//           disabled={!enabled}
//           iconProps={{ imageProps: { src: toggleIcon } }}
//           onClick={this._handleToggle}
//         />
//       </TooltipHost>
//     </div>
//   );
// };
