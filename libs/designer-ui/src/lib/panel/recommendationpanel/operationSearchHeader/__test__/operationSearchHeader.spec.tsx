import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import { OperationSearchHeader } from '../index';

describe('OperationSearchHeader', () => {
  it('renders correctly with isTriggerNode=true', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <OperationSearchHeader searchCallback={vi.fn()} isTriggerNode={true} />
      </IntlProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('renders correctly with isTriggerNode=false', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <OperationSearchHeader searchCallback={vi.fn()} isTriggerNode={false} />
      </IntlProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('renders correctly with search term and filters', () => {
    const mockFilters = { actionType: 'actions' };
    const { container } = render(
      <IntlProvider locale="en">
        <OperationSearchHeader
          searchCallback={vi.fn()}
          searchTerm="test search"
          filters={mockFilters}
          setFilters={vi.fn()}
          isTriggerNode={false}
        />
      </IntlProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
