import * as React from 'react';
import { render } from '@testing-library/react';

import { describe, it, expect, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import { guid, TokenType } from '@microsoft/logic-apps-shared';
import { ValueSegmentType } from '../../models/parameter';
import { VariableEditor } from '../variableEditor';

describe('VariableEditor', () => {
  it('renders correctly with empty variables', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <VariableEditor
          initialValue={[]}
          onChange={vi.fn()}
          getTokenPicker={vi.fn()}
          index={0}
          variable={{ name: [], type: [], value: [] }}
          disableDelete={false}
          onDelete={vi.fn()}
          onVariableChange={vi.fn()}
        />
      </IntlProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('renders correctly with single variable', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <VariableEditor
          initialValue={[]}
          onChange={vi.fn()}
          getTokenPicker={vi.fn()}
          index={0}
          variable={{
            name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
            type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'boolean' }],
            value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testValue' }],
          }}
          disableDelete={false}
          onDelete={vi.fn()}
          onVariableChange={vi.fn()}
        />
      </IntlProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('renders correctly with single variable with Token', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <VariableEditor
          initialValue={[]}
          onChange={vi.fn()}
          getTokenPicker={vi.fn()}
          index={0}
          variable={{
            name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
            type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'boolean' }],
            value: [
              {
                type: ValueSegmentType.TOKEN,
                id: guid(),
                token: { key: 'test', title: 'test', tokenType: TokenType.FX, value: 'testTokenValue' },
                value: 'testTokenValue',
              },
            ],
          }}
          disableDelete={false}
          onDelete={vi.fn()}
          onVariableChange={vi.fn()}
        />
      </IntlProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
