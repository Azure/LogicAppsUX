import { findDOMNode } from 'react-dom';
import * as React from 'react';
import { ITextField, ITextFieldStyles, TextField } from '@fluentui/react/lib/TextField';

import Constants from '../constants';
import { Event, EventHandler } from '../eventhandler';
import { getDragStartHandlerWhenDisabled } from '../helper';
import { isNullOrUndefined } from '@microsoft-logic-apps/utils';
import { injectIntl, WrappedComponentProps } from 'react-intl';

export interface TitleProps {
  className?: string;
  expanded?: boolean;
  isEditingTitle?: boolean;
  tag?: string;
  text?: string;
  onClick?: EventHandler<Event<InnerControlTitle>>;
  onCommit?: EventHandler<TitleChangeEvent>;
  onDiscard?: EventHandler<Event<InnerControlTitle>>;
}

export interface TitleState {
  text: string;
}

export interface TitleChangeEvent extends Event<InnerControlTitle> {
  text: string;
}

const onDragStartWhenDisabled = getDragStartHandlerWhenDisabled();

const transparentTextFieldStyles: Partial<ITextFieldStyles> = {
  wrapper: {
    width: '100%',
  },
  field: {
    border: 'none',
  },
  fieldGroup: {
    backgroundColor: 'transparent',
    border: 'none',
  },
};

export class InnerControlTitle extends React.Component<TitleProps & WrappedComponentProps<'intl'>, TitleState> {
  static defaultProps: Partial<TitleProps> = {
    expanded: false,
    isEditingTitle: false,
  };

  private _editingTitleInputRef: ITextField | undefined | null;
  private _titleLinkRef = React.createRef<HTMLAnchorElement>();

  constructor(props: TitleProps & WrappedComponentProps<'intl'>) {
    super(props);

    this.state = {
      text: props.text ?? '',
    };
  }

  // TODO(joechung): Replace with componentDidUpdate and-or getDerivedStateFromProps.
  UNSAFE_componentWillReceiveProps(nextProps: TitleProps): void {
    if (this.state.text !== nextProps.text) {
      this.setState({ text: nextProps.text ?? '' });
    }
  }

  componentDidMount(): void {
    if (this.props.isEditingTitle) {
      this._ensureFocus();
    }
  }

  componentDidUpdate(): void {
    if (this.props.isEditingTitle) {
      this._ensureFocus();
    }
  }

  render(): JSX.Element {
    const { className, isEditingTitle, intl } = this.props;

    const editingCardTitle = intl.formatMessage({
      defaultMessage: 'Editing card title',
      description: 'This is shown as an aria label that can be read by screen readers only when the text is editable',
    });
    if (isEditingTitle) {
      return (
        <TextField
          componentRef={(textField) => (this._editingTitleInputRef = textField)}
          className={`${className}-edit`}
          ariaLabel={editingCardTitle}
          draggable={false}
          styles={transparentTextFieldStyles}
          type="text"
          value={this.state.text}
          onBlur={this._onEditBlur}
          onChange={this._onEditChange as any}
          onDragStart={onDragStartWhenDisabled}
          onClick={this._onEditClick}
          onKeyDown={this._onEditKeyDown}
        />
      );
    } else {
      const { text } = this.props;

      return (
        // TODO
        // eslint-disable-next-line jsx-a11y/anchor-is-valid
        <a
          ref={this._titleLinkRef}
          aria-expanded={this.props.expanded}
          className={`${className}-view`}
          tabIndex={-1}
          draggable={false}
          role="button"
          onClick={this._onClick}
          onDragStart={onDragStartWhenDisabled}
        >
          <div className="msla-card-title">{text}</div>
          {this._renderTag()}
        </a>
      );
    }
  }

  focus(): void {
    if (this._titleLinkRef) {
      this._titleLinkRef?.current?.focus();
    }
  }

  scrollIntoView(options?: boolean | ScrollIntoViewOptions): void {
    if (this._titleLinkRef) {
      this._titleLinkRef?.current?.scrollIntoView(options);
    }
  }

  protected get telemetryIdentifier(): string {
    return Constants.TELEMETRY_IDENTIFIERS.TITLE;
  }

  private _onEditClick = (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    e.stopPropagation();
  };

  private _renderTag(): JSX.Element | null {
    const { className, tag } = this.props;
    const text = !isNullOrUndefined(tag) ? ` (${tag})` : null;
    return text !== null ? <span className={`${className}-tag`}>{text}</span> : null;
  }

  private _onEditChange = (e: React.FormEvent<HTMLInputElement>, text: string): void => {
    e.preventDefault();

    if (this.props.isEditingTitle) {
      this.setState({
        text,
      });
    }
  };

  private _onClick = (e: React.FormEvent<HTMLAnchorElement>): void => {
    const { onClick } = this.props;
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick({
        currentTarget: this,
      });
    }
  };

  private _onEditBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    e.preventDefault();
    if (!e.currentTarget.contains(document.activeElement)) {
      this._handleCommit();
    }
  };

  // NOTE(tonytang): Ideally we should use key up event. However the card menu honors key down, thus
  // we will receive a key up event when entering editing mode, which would commit the change if we were to use key up.
  // Thus we also use key down so to be consistent with card menu dropdown and avoid the above issue.
  private _onEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    // TODO(tonytang): Find out if the enum of keys are defined some where and use the enum, or come up with our own list of key values.
    if (e.key === 'Enter') {
      this._handleCommit();
    } else if (e.key === 'Escape') {
      this._handleDiscard();
    }
  };

  private _handleCommit = (): void => {
    const { onCommit } = this.props;
    if (onCommit) {
      onCommit({
        currentTarget: this,
        text: this._editingTitleInputRef?.value ?? '',
      });
    }
  };

  private _handleDiscard = (): void => {
    const { onDiscard } = this.props;
    if (onDiscard) {
      onDiscard({
        currentTarget: this,
      });
    }
  };

  private _ensureFocus(): void {
    // eslint-disable-next-line react/no-find-dom-node
    const textField = findDOMNode(this._editingTitleInputRef as any) as Element;
    const textFieldElement = textField.querySelector('input, textarea');
    if (document.activeElement !== textFieldElement) {
      this._editingTitleInputRef?.setSelectionRange(0, this._editingTitleInputRef?.value?.length ?? 0);
    }

    this._editingTitleInputRef?.focus();
  }
}

export const Title = injectIntl<'intl', TitleProps & WrappedComponentProps<'intl'>>(InnerControlTitle);
