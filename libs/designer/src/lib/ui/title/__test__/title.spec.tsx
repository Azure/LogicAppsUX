import { findDOMNode } from 'react-dom';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import * as TestUtils from 'react-dom/test-utils';
import { TextField } from '@fluentui/react/lib/TextField';

import { InnerControlTitle as Title, TitleProps } from '..';
import { getTestIntl } from '../../../__test__/intl-test-helper';

describe('ui/title', () => {
  let minimal: TitleProps, renderer: ReactShallowRenderer.ShallowRenderer;

  const intl = getTestIntl();
  beforeEach(() => {
    minimal = {
      className: 'card-title',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render component correctly when not in editing mode.', () => {
    renderer.render(<Title intl={intl} {...minimal} />);

    const title = renderer.getRenderOutput();
    expect(title.type).toBe('a');
  });

  it('should render component correctly when in editing mode.', () => {
    renderer.render(<Title intl={intl} {...minimal} isEditingTitle={true} />);

    const title = renderer.getRenderOutput();
    expect(title.type).toEqual(TextField);
  });

  it('should select text when focusing on input in editing mode.', () => {
    const title = TestUtils.renderIntoDocument<TitleProps, Title>(<Title intl={intl} isEditingTitle={true} text="abc" {...minimal} />);
    expect(title).toBeDefined();

    const $title = getInputElementForTitle(title);
    expect($title.selectionStart).toBe(0);
    expect($title.selectionEnd).toBe($title.value.length);
  });

  describe('text', () => {
    describe('When not editing', () => {
      it('should render empty when text props is not set.', () => {
        renderer.render(<Title intl={intl} {...minimal} />);

        const title = renderer.getRenderOutput();
        const [span]: any[] = React.Children.toArray(title.props.children); // tslint:disable-line: no-any
        expect(span.props.children).toBeUndefined();
      });

      it('should render the text content correctly when text props is set.', () => {
        const text = 'Hello World';
        renderer.render(<Title intl={intl} {...minimal} text={text} />);

        const title = renderer.getRenderOutput();
        const [span]: any[] = React.Children.toArray(title.props.children); // tslint:disable-line: no-any
        expect(span.props.children).toBe(text);
      });
    });

    describe('When editing', () => {
      it('should render empty when text props is not set.', () => {
        renderer.render(<Title intl={intl} {...minimal} isEditingTitle={true} />);

        const title = renderer.getRenderOutput();
        expect(title.props.value).toBeFalsy();
      });

      it('should render the text content correctly when text props is set.', () => {
        const text = 'Hello World';
        renderer.render(<Title intl={intl} {...minimal} isEditingTitle={true} text={text} />);

        const title = renderer.getRenderOutput();
        expect(title.props.value).toBe(text);
      });

      it('should have aria label correctly set.', () => {
        renderer.render(<Title intl={intl} {...minimal} isEditingTitle={true} />);

        const title = renderer.getRenderOutput();
        expect(title.props.ariaLabel).toBe('Editing card title');
      });
    });
  });

  describe('tag', () => {
    it('should render empty when tag props is not set.', () => {
      renderer.render(<Title intl={intl} {...minimal} isEditingTitle={false} />);

      const title = renderer.getRenderOutput();
      const [span]: any[] = React.Children.toArray(title.props.children); // tslint:disable-line: no-any
      expect(span.props.children).toBeUndefined();
    });

    it('should render the tag content correctly when tag props is set.', () => {
      const text = 'Hello World';
      const tag = 'tag';
      renderer.render(<Title intl={intl} {...minimal} isEditingTitle={false} text={text} tag={tag} />);

      const title = renderer.getRenderOutput();
      const [titleSpan, tagSpan]: any[] = React.Children.toArray(title.props.children); // tslint:disable-line: no-any
      expect(titleSpan.props.children).toBe(text);
      expect(tagSpan.props.children).toBe(` (${tag})`);
    });

    it('should render the text content without tag when editing.', () => {
      const text = 'Hello World';
      const tag = 'tag';
      renderer.render(<Title intl={intl} {...minimal} isEditingTitle={true} text={text} tag={tag} />);

      const title = renderer.getRenderOutput();
      expect(title.props.value).toBe(text);
    });
  });

  describe('onCommit', () => {
    it('should call onCommit when blur on input.', () => {
      const onCommit = jest.fn();
      const title = TestUtils.renderIntoDocument<TitleProps, Title>(
        <Title intl={intl} isEditingTitle={true} onCommit={onCommit} {...minimal} />
      );
      const $title = getInputElementForTitle(title);
      TestUtils.Simulate.blur($title);

      expect(onCommit).toHaveBeenCalled();
    });

    it('should call onCommit when ENTER is pressed.', () => {
      const onCommit = jest.fn();
      const title = TestUtils.renderIntoDocument<TitleProps, Title>(
        <Title intl={intl} isEditingTitle={true} onCommit={onCommit} {...minimal} />
      );
      const $title = getInputElementForTitle(title);
      TestUtils.Simulate.keyDown($title, { key: 'Enter' });

      expect(onCommit).toHaveBeenCalled();
    });

    it('should not call onCommit when input text change.', () => {
      const onCommit = jest.fn();
      const title = TestUtils.renderIntoDocument<TitleProps, Title>(
        <Title intl={intl} isEditingTitle={true} onCommit={onCommit} {...minimal} />
      );
      const $title = getInputElementForTitle(title);
      TestUtils.Simulate.change($title);
      expect(onCommit.mock.calls.length).toBe(0);
    });
  });

  describe('onDiscard', () => {
    it('should call onDiscard when ESCAPE is pressed.', () => {
      const onCommit = jest.fn();
      const onDiscard = jest.fn();
      const title = TestUtils.renderIntoDocument<TitleProps, Title>(
        <Title intl={intl} isEditingTitle={true} onCommit={onCommit} onDiscard={onDiscard} {...minimal} />
      );
      const $title = getInputElementForTitle(title);
      TestUtils.Simulate.keyDown($title, { key: 'Escape' });

      expect(onDiscard).toHaveBeenCalled();
    });
  });

  describe('click', () => {
    it('should call onClick when click title.', () => {
      const onClick = jest.fn();
      const title = TestUtils.renderIntoDocument<TitleProps, Title>(<Title intl={intl} onClick={onClick} {...minimal} />);
      const $title = getAnchorElementForTitle(title);
      TestUtils.Simulate.click($title);

      expect(onClick).toHaveBeenCalled();
    });
  });
});

function getAnchorElementForTitle(component: Title): HTMLAnchorElement {
  // eslint-disable-next-line react/no-find-dom-node
  return findDOMNode(component) as HTMLAnchorElement;
}

function getInputElementForTitle(component: Title): HTMLInputElement {
  // eslint-disable-next-line react/no-find-dom-node
  const title = findDOMNode(component) as Element;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return title.querySelector('input')!;
}
