import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { CollapsedCard } from '../index';

const defaultId = 'test-id';

const renderComponent = (props: React.ComponentProps<typeof CollapsedCard>) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <CollapsedCard {...props} />
    </IntlProvider>
  );
};

describe('CollapsedCard', () => {
  it('should render expanding state correctly', async () => {
    const { container } = renderComponent({
      id: defaultId,
      actionCount: 5,
      isExpanding: true,
    });

    // Check for the expanding text rendered from react-intl
    const expandingText = await screen.findByText('Expanding actions...');
    expect(expandingText).toBeDefined();

    // Snapshot test
    expect(container).toMatchSnapshot();
  });

  it('should render non-expanding state with operation visuals and action text when actionCount > 0', async () => {
    const operationVisuals = [
      {
        id: 'op1',
        iconUri: 'http://example.com/icon1.png',
        brandColor: '#000',
      },
      {
        id: 'op2',
        iconUri: 'http://example.com/icon2.png',
        brandColor: '#fff',
      },
    ];
    const actionCount = 3;
    const { container } = renderComponent({
      id: defaultId,
      actionCount,
      isExpanding: false,
      operationVisuals,
    });

    // Check aria-label on the inner div
    const innerDiv = container.querySelector(`div[aria-label]`);
    expect(innerDiv).toBeDefined();

    // Check if img elements are rendered for each operation visual
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(2);
    imgs.forEach((img, index) => {
      expect(img.getAttribute('src')).toBe(operationVisuals[index].iconUri);
      expect(img.getAttribute('aria-label')).toBe(`${operationVisuals[index].id} operation icon`);
    });

    // Check for Text element containing the formatted action count
    const collapsedText = container.querySelector('[data-automation-id="collapsed-text-' + defaultId + '"]');
    expect(collapsedText?.textContent).toContain(`+ ${actionCount}`);

    // Snapshot test
    expect(container).toMatchSnapshot();
  });

  it('should render non-expanding state without action text when actionCount <= 0', () => {
    const operationVisuals = [
      {
        id: 'op1',
        iconUri: 'http://example.com/icon1.png',
        brandColor: '#000',
      },
    ];
    const { container } = renderComponent({
      id: defaultId,
      actionCount: 0,
      isExpanding: false,
      operationVisuals,
    });

    // Only img element should be rendered inside inner div
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(1);

    // There should be no element with data-automation-id matching the collapsed text
    const collapsedText = container.querySelector('[data-automation-id="collapsed-text-' + defaultId + '"]');
    expect(collapsedText).toBeNull();

    // Snapshot test
    expect(container).toMatchSnapshot();
  });
});
