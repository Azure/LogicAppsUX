import type { IIconStyles, ITheme } from '@fluentui/react';
import { FontSizes, getTheme, Icon, registerOnThemeChangeCallback, removeOnThemeChangeCallback } from '@fluentui/react';
import React from 'react';
import type { WrappedComponentProps } from 'react-intl';
import { injectIntl } from 'react-intl';

export type ErrorHandler = (error: Error, info: React.ErrorInfo) => void;

export interface ErrorBoundaryProps {
  className?: string;
  fallback?: JSX.Element;
  onError?: ErrorHandler;
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  isInverted: boolean;
}

const errorStyle: IIconStyles = {
  root: {
    fontSize: FontSizes.mega,
    alignSelf: 'center',
    margin: '10% 0 15px',
  },
};

const errorTextStyle: React.CSSProperties = {
  fontSize: FontSizes.large,
  alignSelf: 'center',
  marginBottom: '10%',
};

const errorDark = '#fd4444';
const errorLight = '#e00202';

export class ErrorBoundaryInternal extends React.Component<ErrorBoundaryProps & WrappedComponentProps<'intl'>, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps & WrappedComponentProps<'intl'>) {
    super(props);
    this.state = {
      hasError: false,
      isInverted: getTheme().isInverted,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  compoenntDidMount() {
    registerOnThemeChangeCallback(this._handleThemeChange);
  }

  componentWillUnmount() {
    removeOnThemeChangeCallback(this._handleThemeChange);
  }

  render() {
    const { children, className, fallback, intl } = this.props;
    const { hasError, isInverted } = this.state;

    if (!hasError) {
      return children;
    } else if (fallback !== undefined) {
      return fallback;
    } else {
      const iconStyles = {
        ...errorStyle,
        color: isInverted ? errorDark : errorLight,
      };
      const spanStyle = {
        ...errorTextStyle,
        color: isInverted ? errorDark : errorLight,
      };

      return (
        <div className={className ? className : 'msla-panel-container-error'}>
          <Icon className="msla-card-title-button-icon" iconName="Error" styles={iconStyles} />
          <span style={spanStyle}>
            {intl.formatMessage({
              defaultMessage: 'Error loading component.',
              description: 'This is a generic error message shown when something in the app fails to load.',
            })}
          </span>
        </div>
      );
    }
  }

  private _handleThemeChange = ({ isInverted }: ITheme) => {
    this.setState({
      isInverted,
    });
  };
}

export const ErrorBoundary = injectIntl<'intl', ErrorBoundaryProps & WrappedComponentProps<'intl'>>(ErrorBoundaryInternal);
