import { StringEditor } from '../editor/string';
import { TextField } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

export const DynamicallyAddedParameterType = {
  Text: 'TEXT',
  File: 'FILE',
  Email: 'EMAIL',
  Boolean: 'BOOLEAN',
  Number: 'NUMBER',
  Date: 'DATE',
} as const;
export type DynamicallyAddedParameterTypeType = (typeof DynamicallyAddedParameterType)[keyof typeof DynamicallyAddedParameterType];

export interface IDynamicallyAddedParameterProperties {
  title: string;
  type: string;
  description: string;
  'x-ms-content-hint': string;
  properties?: {
    name?: {
      type: string;
    };
    contentBytes?: {
      type: string;
      format: string;
    };
  };
  items?: {
    enum: string[];
    type: string;
  };
}

const DynamicallyAddedParameterMenuIcon = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgd2lkdGg9IjI4cHgiIGhlaWdodD0iMjhweCIgdmlld0JveD0iMCAwIDI4IDI4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogICAgPHRpdGxlPk1vcmVfMjwvdGl0bGU+CiAgICA8ZGVmcz48L2RlZnM+CiAgICA8ZyBpZD0iRmluYWwiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJBZGQtZmlsZS0vLUVudW0tLShtYWtlcikiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0zMzEuMDAwMDAwLCAtODMyLjAwMDAwMCkiPgogICAgICAgICAgICA8ZyBpZD0iNCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAuMDAwMDAwLCA3MjYuMDAwMDAwKSI+CiAgICAgICAgICAgICAgICA8ZyBpZD0iR3JvdXAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE5MS4wMDAwMDAsIDEwNi4wMDAwMDApIj4KICAgICAgICAgICAgICAgICAgICA8ZyBpZD0iTW9yZV8yIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMzAuMDAwMDAwLCAwLjAwMDAwMCkiPgogICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD0iLi4uIj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxjaXJjbGUgaWQ9Ik92YWwiIGZpbGwtb3BhY2l0eT0iMC43IiBmaWxsPSIjRjFGMUYxIiBjeD0iMTQiIGN5PSIxNCIgcj0iMTQiPjwvY2lyY2xlPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9Ikdyb3VwLTMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDkuMDAwMDAwLCAxMy4wMDAwMDApIiBmaWxsPSIjNzY3Njc2Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMSwyIEMxLjU1MjI4NDc1LDIgMiwxLjU1MjI4NDc1IDIsMSBDMiwwLjQ0NzcxNTI1IDEuNTUyMjg0NzUsMCAxLDAgQzAuNDQ3NzE1MjUsMCAwLDAuNDQ3NzE1MjUgMCwxIEMwLDEuNTUyMjg0NzUgMC40NDc3MTUyNSwyIDEsMiBaIiBpZD0iUGF0aCI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxjaXJjbGUgaWQ9Ik92YWwtMTE3LUNvcHkiIGN4PSI1LjMzMzMzMzMzIiBjeT0iMSIgcj0iMSI+PC9jaXJjbGU+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC0xMTctQ29weS0yIiBjeD0iOS42NjY2NjY2NyIgY3k9IjEiIHI9IjEiPjwvY2lyY2xlPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPgogICAgICAgICAgICAgICAgICAgICAgICA8L2c+CiAgICAgICAgICAgICAgICAgICAgPC9nPgogICAgICAgICAgICAgICAgPC9nPgogICAgICAgICAgICA8L2c+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=';

export type TextFieldOnChangeHandler = (key: string, type: string, newValue?: string) => void;

export interface DynamicallyAddedParameterProps {
  icon: string;
  key: string;
  properties: IDynamicallyAddedParameterProperties;
  required: boolean;
  onChange: TextFieldOnChangeHandler;
}

export const DynamicallyAddedParameter = (props: DynamicallyAddedParameterProps): JSX.Element => {
  const [menuExpanded, { toggle: toggleMenuExpanded }] = useBoolean(false);

  const intl = useIntl();
  const menuButtonTitle = intl.formatMessage({
    defaultMessage: 'Menu',
    description: 'Open dynamically added parameter options menu',
  });

  const onMenuButtonClicked = (e: React.MouseEvent<HTMLElement>): void => {
    e.preventDefault();
    toggleMenuExpanded();
};

  const renderMenuButton = (): JSX.Element => {
    return (
      <button
        className="msla-button msla-card-header-menu-button"
        onClick={onMenuButtonClicked}
        title={menuButtonTitle}
        aria-label={menuButtonTitle}
      >
        <img
          alt=""
          className="msla-card-header-menu-icon"
          draggable={false}
          role="presentation"
          src={DynamicallyAddedParameterMenuIcon}
        />
      </button>
    );
  };

  const onTitleChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
    e.preventDefault();
    props.onChange(props.key, 'title', newValue);
  }

  const onDescriptionChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
    e.preventDefault();
    props.onChange(props.key, 'description', newValue);
  }

  const renderDynamicParameterContainer = (): JSX.Element => {
    const iconStyle = {
      background: `url('${props.icon}') no-repeat center`,
      backgroundSize: 'contain',
    };

    return (
      <div>
        <div className="msla-dynamic-added-param-header">
          <div className="msla-dynamic-added-param-icon" style={iconStyle}></div>
          <div className="msla-dynamic-added-param-inputs-container">
          <TextField value={props.properties.title} onChange={onTitleChange} />
            <TextField value={props.properties.description} onChange={onDescriptionChange} />
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
      {menuExpanded ? renderMenu() : undefined}
    </div>
  );
};
