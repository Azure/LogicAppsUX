import { Icon, IIconStyles } from '@fluentui/react/lib/Icon';
import * as React from 'react';
import { FormattedMessage } from 'react-intl';

export type ErrorHandler = (error: Error, info: React.ErrorInfo) => void;

export interface ErrorBoundaryProps {
  className?: string;
  fallback?: JSX.Element;
  onError?: ErrorHandler;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

const errorStyle: IIconStyles = {
  root: {
    fontSize: 70,
    alignSelf: 'center',
    margin: '10% 0 15px 0',
    color: 'rgb(224, 2, 2)',
  },
};

const errorTextStyle: React.CSSProperties = {
  fontSize: 20,
  alignSelf: 'center',
  color: 'rgb(224, 2, 2)',
  marginBottom: '10%',
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const { onError } = this.props;
    if (onError) {
      onError(error, info);
    }
  }

  render() {
    const { children, className, fallback } = this.props;
    if (this.state.hasError) {
      const errorClassName = className ? className : 'msla-panel-container-error';
      return fallback !== undefined ? (
        fallback
      ) : (
        <div className={errorClassName}>
          <Icon className="msla-card-title-button-icon" iconName="Error" styles={errorStyle} />
          <span style={errorTextStyle}>
            <FormattedMessage defaultMessage="Error loading component."></FormattedMessage>
          </span>
        </div>
      );
    }

    return children;
  }
}
