import * as React from 'react';
import { BaseComponent, BaseComponentProps } from '../base';

export type DocLinkClickedEventHandler = () => void;

export interface DocumentationLinkItemProps extends Swagger.ExternalDocumentation, BaseComponentProps {
  onClick?: DocLinkClickedEventHandler;
}

export class DocumentationLinkItem extends BaseComponent<DocumentationLinkItemProps, Record<string, unknown>> {
  render(): JSX.Element {
    const { description, url } = this.props;
    return (
      <div>
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={this._handleLinkClicked}>
          {description}
        </a>
      </div>
    );
  }

  private _handleLinkClicked = (): void => {
    const { onClick } = this.props;
    if (onClick) {
      onClick();
    }
  };
}
