import * as React from 'react';

import Constants from './constants';
import { PageActionTelemetryData, UserAction } from './telemetry/models';

export interface BaseComponentProps {
  children?: React.ReactNode;
  key?: React.Key;
  ref?: string | ((instance: any) => any) | React.RefObject<any>; // tslint:disable-line: no-any
  telemetryPath?: string;
  telemetryScopes?: UserAction[];
  trackEvent(data: PageActionTelemetryData): void;
}

export abstract class BaseComponent<P extends BaseComponentProps, S = Record<string, unknown>> extends React.Component<P, S> {
  /**
   * @prop {string} telemetryIdentifier - A string with the identifier to include in the telemetry event.
   */
  protected get telemetryIdentifier(): string {
    return Constants.TELEMETRY_IDENTIFIERS.BASECOMPONENT;
  }

  protected getTelemetryContext(): Record<string, any> {
    // tslint:disable-line: no-any
    return {
      telemetryPath: this.props.telemetryPath,
    };
  }

  /**
   * @prop {array} telemetryIdentifier - An array of the default tracking scopes for the control.
   */
  protected get defaultTelemetryScopes(): UserAction[] {
    return [UserAction.click];
  }

  protected handleClickEvent(): void {
    this.trackAction(UserAction.click, this.telemetryIdentifier);
  }

  protected handleDragEvent(): void {
    this.trackAction(UserAction.drag, this.telemetryIdentifier);
  }

  protected handleDropEvent(): void {
    this.trackAction(UserAction.drop, this.telemetryIdentifier);
  }

  protected handleFocusEvent(): void {
    this.trackAction(UserAction.focus, this.telemetryIdentifier);
  }

  protected trackAction(action: UserAction, telemetryIdentifier: string, additionalTelemetryContext?: Record<string, any>): void {
    // tslint:disable-line: no-any
    const shouldTrack = this._shouldTrackAction(action);
    if (!shouldTrack) {
      return;
    }

    const { trackEvent } = this.props;
    if (trackEvent) {
      trackEvent({
        controlId: telemetryIdentifier,
        action,
        actionContext: {
          ...this.getTelemetryContext(),
          ...additionalTelemetryContext,
        },
      });
    }
  }

  private _shouldTrackAction(action: UserAction): boolean {
    const { telemetryScopes } = this.props;
    const scopes: UserAction[] = (telemetryScopes || this.defaultTelemetryScopes) ?? [];

    return scopes.some((scope) => scope === action);
  }
}
