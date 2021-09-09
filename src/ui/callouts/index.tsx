import { Callout } from '@fluentui/react/lib/Callout';
import { DirectionalHint } from '@fluentui/react/lib/common/DirectionalHint';
import * as React from 'react';
import './simple.less';

export interface SimpleCalloutProps {
  directionalHint: DirectionalHint;
  gapSpace?: number;
  target: HTMLElement;
  text: string;
  title: string;
  /* tslint:disable: no-any */
  onDismiss?(e: any): void;
  /* tslint:enable: no-any */
}

export function SimpleCallout(props: SimpleCalloutProps) {
  return (
    <Callout
      className="msla-simple-callout"
      gapSpace={props.gapSpace}
      target={props.target}
      directionalHint={props.directionalHint}
      doNotLayer={false}
      onDismiss={props.onDismiss}>
      <div className="msla-simple-callout-container">
        <div className="msla-simple-callout-title">{props.title}</div>
        <div className="msla-simple-callout-text">{props.text}</div>
      </div>
    </Callout>
  );
}
