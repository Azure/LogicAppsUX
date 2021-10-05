import { Icon, IIconStyles } from '@fluentui/react/lib/Icon';
import { List } from '@fluentui/react/lib/List';
import * as React from 'react';

import { Badge } from './badge';
import Constants from '../constants';
import DefaultIcon from '../recommendation/images/defaulticon.svg';
import { ImageWithFallback } from '../imagewithfallback';
import { Operation, SuggestedItem } from './models';
import { getIntl } from '../../common/i18n/intl';
import { FormattedMessage } from 'react-intl';

export interface SuggestionsProps {
  disabled?: boolean;
  showEnvironmentBadge?: boolean;
  suggestedItems: SuggestedItem[];
  visible: boolean;
  onConnectorClick?(connector: string): void;
  onOperationClick?(operation: string): void;
}

export class Suggestions extends React.Component<SuggestionsProps> {
  private intl = getIntl();
  static defaultProps: Partial<SuggestionsProps> = {
    disabled: false,
  };

  render(): JSX.Element | null {
    const { suggestedItems, visible } = this.props;
    if (!visible) {
      return null;
    }

    const iconStyle: Partial<IIconStyles> = {
      root: {
        marginRight: '5px',
      },
    };

    const suggestionList =
      suggestedItems.length > 0 ? (
        <List className="msla-suggestion-list" items={suggestedItems} onRenderCell={this._renderSuggestedItem as any} />
      ) : null;

    return (
      <div className="msla-suggestions">
        <div className="msla-suggestions-header">
          <Icon iconName="Robot" styles={iconStyle} />
          <FormattedMessage defaultMessage="Recommended based on your activity" id="sxcPBW" description="Header of a list" />
        </div>
        <NoSuggestions count={suggestedItems.length} />
        {suggestionList}
      </div>
    );
  }

  private _renderSuggestedItem = (item: SuggestedItem, index: number): JSX.Element => {
    const { disabled } = this.props;
    const { connector, operations } = item;
    const style = {
      backgroundColor: connector.brandColor || Constants.DEFAULT_BRAND_COLOR,
    };
    const { environmentBadge, id, title } = connector;
    const icon = connector.icon || DefaultIcon;
    let className = 'msla-suggestion-cell';
    if (index === this.props.suggestedItems.length - 1) {
      className += ' last-item';
    }

    const suggestionOperations = !operations.length ? null : (
      <div className="msla-suggestion-operations">
        <List className="msla-suggestion-operation-list" items={operations} onRenderCell={this._renderSuggestedOperation as any} />
      </div>
    );

    return (
      <div className={className}>
        <div className="msla-suggestion-right">
          <button
            aria-labelledby={id}
            className="msla-suggestion-connector"
            onClick={this._handleConnectorClick.bind(this, id)}
            disabled={disabled}
            title={title}>
            <ImageWithFallback alt="" className="msla-connector-icon" role="presentation" src={icon || DefaultIcon} style={style} />
            <div id={id} className="msla-connector-title">
              {title}
            </div>
            {this._getEnvironmentBadge(environmentBadge)}
          </button>
          <div className="msla-connector-tier">{connector.category}</div>
        </div>
        {suggestionOperations}
      </div>
    );
  };

  private _getEnvironmentBadge(environmentBadge?: { name: string; description: string }): JSX.Element | null {
    return this.props.showEnvironmentBadge && environmentBadge ? (
      <Badge className="msla-ise" tag="div" text={environmentBadge.name} title={environmentBadge.description} visible={true} />
    ) : null;
  }

  private _renderSuggestedOperation = (item: Operation): JSX.Element => {
    const { disabled } = this.props;
    const { id, environmentBadge, premium, preview, description, title } = item;
    const { intl } = this;
    return (
      <button className="msla-operation" id={id} disabled={disabled} onClick={this._handleOperationClick.bind(this, id)}>
        <div className="msla-operation-text">
          <div className="msla-operation-title">
            {title}
            <Badge
              text={intl.formatMessage({
                defaultMessage: '(preview)',
                id: 't74v7p',
                description: 'This is a badge beside a list item saying that the feature shown in the item is preview',
              })}
              visible={!!preview}
            />
            <Badge
              className="msla-premium"
              text={intl.formatMessage({
                defaultMessage: 'Premium',
                id: 'unHYHq',
                description: 'This is a badge beside a list item saying that the feature shown in the item is a Premium feature',
              })}
              visible={!!premium}
            />
            {this._getEnvironmentBadge(environmentBadge)}
          </div>
          <div className="msla-operation-subtitle" title={description}>
            {description}
          </div>
        </div>
      </button>
    );
  };

  private _handleOperationClick(operationId: string): void {
    const { onOperationClick } = this.props;
    if (onOperationClick) {
      onOperationClick(operationId);
    }
  }

  private _handleConnectorClick(connectorId: string): void {
    const { onConnectorClick } = this.props;
    if (onConnectorClick) {
      onConnectorClick(connectorId);
    }
  }
}

interface NoSuggestionsProps {
  count: number;
}

const NoSuggestions: React.FC<NoSuggestionsProps> = ({ count }) => {
  if (count > 0) {
    return null;
  }

  return (
    <div className="msla-no-suggestions">
      <Icon iconName="InfoSolid" className="msla-no-suggestions-icon" />
      <FormattedMessage defaultMessage="Currently there are no suggestions available with your selection." id="RYIxqe" />
    </div>
  );
};
