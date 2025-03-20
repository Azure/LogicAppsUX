import { TemplatesSection } from '..';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { TemplatesSectionProps } from '../templatesSectionModel';
describe('ui/templates/templatesSection', () => {
  const classNames = {
    templatesSection: 'msla-templates-section',
    sectionTitle: 'msla-templates-section-title',
    sectionDescription: 'msla-templates-section-description',
    sectionDescriptionLink: 'msla-templates-section-description-link',
    sectionDescriptionLinkIcon: 'msla-templates-section-description-icon',
    sectionItems: 'msla-templates-section-items',
    sectionItem: 'msla-templates-section-item',
    sectionItemLabel: 'msla-templates-section-item-label',
    sectionItemValue: 'msla-templates-section-item-value',
  };

  let minimal1: TemplatesSectionProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal1 = {
      title: 'sample title',
      items: [],
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<TemplatesSection {...minimal1} />);

    const callout = renderer.getRenderOutput();
    expect(callout).toBeDefined();
  });

  it('should have title and empty children wrapper only', () => {
    renderer.render(<TemplatesSection {...minimal1} />);

    const callout = renderer.getRenderOutput();
    expect(callout.props.className).toBe(classNames.templatesSection);
    const [first, second]: any[] = React.Children.toArray(callout.props.children);
    expect(first.props.className).toBe(classNames.sectionTitle);
    expect(second.props.className).toBe(classNames.sectionItems);
  });

  it('should have title, description and empty children wrapper only', () => {
    renderer.render(
      <TemplatesSection {...minimal1} description={'description'} descriptionLink={{ text: 'description', href: '/link' }} />
    );

    const callout = renderer.getRenderOutput();
    expect(callout.props.className).toBe(classNames.templatesSection);
    const [first, second, third]: any[] = React.Children.toArray(callout.props.children);
    expect(first.props.className).toBe(classNames.sectionTitle);
    expect(second.props.className).toBe(classNames.sectionDescription);
    const [_desText, desLink]: any[] = React.Children.toArray(second.props.children);
    expect(desLink.props.className).toBe(classNames.sectionDescriptionLink);
    expect(third.props.className).toBe(classNames.sectionItems);
  });

  it('text display section', () => {
    renderer.render(
      <TemplatesSection
        title={'title'}
        description={'description'}
        items={[
          {
            type: 'text',
            label: 'label1',
            value: 'value 1',
          },
          {
            type: 'text',
            value: 'value 2',
          },
        ]}
      />
    );

    const callout = renderer.getRenderOutput();
    expect(callout.props.className).toBe(classNames.templatesSection);
    const [_first, _second, third]: any[] = React.Children.toArray(callout.props.children);
    expect(third.props.className).toBe(classNames.sectionItems);
    const [firstText, secondText]: any[] = React.Children.toArray(third.props.children);
    expect(firstText.props.className).toBe(classNames.sectionItem);
    expect(secondText.props.className).toBe(classNames.sectionItem);
    const [firstLabel, firstValue]: any[] = React.Children.toArray(firstText.props.children);
    expect(firstLabel.props.className).toBe(classNames.sectionItemLabel);
    expect(firstValue.props.className).toBe(classNames.sectionItemValue);

    const [secondValue]: any[] = React.Children.toArray(secondText.props.children);
    expect(secondValue.props.className).toBe(classNames.sectionItemValue);
  });
});
