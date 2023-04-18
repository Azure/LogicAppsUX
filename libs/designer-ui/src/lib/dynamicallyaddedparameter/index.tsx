import { StringEditor } from '../editor/string';
import React from 'react';

export const DynamicallyAddedParameterType = {
  Text: 'TEXT',
  File: 'FILE',
  Email: 'EMAIL',
  Boolean: 'BOOLEAN',
  Number: 'NUMBER',
  Date: 'DATE',
} as const;
type DynamicallyAddedParameterType = (typeof DynamicallyAddedParameterType)[keyof typeof DynamicallyAddedParameterType];

export interface DynamicallyAddedParameterProps {
  labelIcon: string;
  propertyKey: string;
  title: string;
  type: string;
  description: string;
  contentHint: DynamicallyAddedParameterType;
  items?: any;
  fileProperties?: any;
}

export const DynamicallyAddedParameter = (props: DynamicallyAddedParameterProps): JSX.Element => {
  // return <p>{"Dynamically added parameter placeholder"}</p>;

  const renderTitle = (): JSX.Element => {
    return <p>{'Token title input'}</p>;
  };

  const renderMenuButton = (): JSX.Element => {
    return <p>{'Menu button'}</p>;

    // return (
    //   <button
    //     className="msla-button msla-card-header-menu-button"
    //     onClick={this._onMenuButtonClicked}
    //     title={Resources.MENU_BUTTON_ARIA_LABEL}
    //     aria-label={Resources.MENU_BUTTON_ARIA_LABEL}
    //     ref={(menuIcon) => (this._menuIconRef = menuIcon)}
    //   >
    //     <img
    //       alt=""
    //       className="msla-card-header-menu-icon"
    //       draggable={false}
    //       role="presentation"
    //       src={MenuIcon}
    //       onDragStart={onDragStartWhenDisabled}
    //     />
    //   </button>
    // );
  };

  const getTokenPicker = (_editorId: string, _labelId: string): JSX.Element => {
    return <></>;
  };

  const renderDynamicParameterContainer = (): JSX.Element => {
    const iconStyle = {
      background: `url('${props.labelIcon}') no-repeat center`,
      backgroundSize: 'contain',
    };

    return (
      <div>
        <div className="msla-dynamic-added-param-header">
          <div className="msla-dynamic-added-param-icon" style={iconStyle}></div>
          <div className="msla-dynamic-added-param-inputs-container">
            {renderTitle()}
            <div className="msla-input-parameter dynamic">
              <StringEditor
                className="msla-dictionary-editor-container-expanded"
                // placeholder={'[TEST] Enter dynamic input value'}
                initialValue={[]}
                isTrigger={true}
                readonly={false}
                BasePlugins={{ tokens: false, clearEditor: true, autoFocus: false }}
                getTokenPicker={getTokenPicker}
                // onFocus={() => addItem(index)}
              />
            </div>
          </div>
          <div className="msla-dynamic-add-param-menu-container">{renderMenuButton()}</div>
        </div>
        {/* <Error errorMessage={this.props.tokenErrorMessage} key={this.props.parameterId} isSchemaEditor={false} /> */}
        {/* {this._renderEnumOptions()} */}
      </div>
    );
  };

  const renderMenu = (): JSX.Element => {
    return <p>{'Menu element'}</p>;

    // if (!this.state.isMenuExpanded) {
    //   return null;
    // }

    // return (
    //   <Menu
    //     onDismiss={this._toggleMenuState}
    //     menuItems={this.props.menuItems}
    //     onClick={this._toggleMenuState}
    //     target={ReactDOM.findDOMNode(this._menuIconRef) as HTMLElement}
    //     trackEvent={this.props.trackEvent}
    //     gapSpace={2}
    //     directionalHint={DirectionalHint.leftBottomEdge}
    //   />
    // );
  };

  return (
    <div className="msla-dynamic-added-param-container">
      {renderDynamicParameterContainer()}
      <div className="msla-dynamic-added-param-bottom-divider" />
      {renderMenu()}
    </div>
  );
};
