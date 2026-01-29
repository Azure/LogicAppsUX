import * as React from 'react';
import renderer from 'react-test-renderer';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import { TemplatesPanelHeader, TemplatesPanelHeaderProps } from '../templatesPanelHeader';

const renderWithIntl = (component: React.ReactElement) => {
  return renderer.create(<IntlProvider locale="en">{component}</IntlProvider>);
};

describe('ui/templates/templatesPanelHeader', () => {
  let minimalProps: TemplatesPanelHeaderProps;

  beforeEach(() => {
    minimalProps = {
      title: 'Test Title',
      children: <div>Test Content</div>,
    };
  });

  it('should render with minimal props', () => {
    const component = renderWithIntl(<TemplatesPanelHeader {...minimalProps} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render title as h2 element', () => {
    const component = renderWithIntl(<TemplatesPanelHeader {...minimalProps} />);
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with back button when onBackClick is provided', () => {
    const onBackClick = vi.fn();
    const component = renderWithIntl(<TemplatesPanelHeader {...minimalProps} onBackClick={onBackClick} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render with right action when provided', () => {
    const rightAction = <button type="button">Action</button>;
    const component = renderWithIntl(<TemplatesPanelHeader {...minimalProps} rightAction={rightAction} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render with all props', () => {
    const onBackClick = vi.fn();
    const rightAction = <button type="button">Action</button>;
    const component = renderWithIntl(
      <TemplatesPanelHeader title="Full Title" onBackClick={onBackClick} rightAction={rightAction}>
        <div>Full Content</div>
      </TemplatesPanelHeader>
    );
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render children content', () => {
    const component = renderWithIntl(
      <TemplatesPanelHeader {...minimalProps}>
        <div>Child 1</div>
        <div>Child 2</div>
      </TemplatesPanelHeader>
    );
    expect(component.toJSON()).toMatchSnapshot();
  });
});
