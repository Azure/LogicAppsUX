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

  describe('title and description', () => {
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
  });
});
