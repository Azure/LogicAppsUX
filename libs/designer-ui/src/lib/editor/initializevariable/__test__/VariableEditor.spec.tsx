import * as React from 'react';
import { render, screen } from '@testing-library/react';

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

  describe('Type Badge', () => {
    it('displays type badge with correct type when isMultiVariableEnabled is true', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'string' }],
              value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testValue' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toBeInTheDocument();
      expect(badgeContainer).toHaveTextContent('String');
    });

    it('displays correct type badge for boolean variables', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'boolean' }],
              value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'true' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toBeInTheDocument();
      expect(badgeContainer).toHaveTextContent('Boolean');
    });

    it('displays correct type badge for float variables', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'float' }],
              value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: '3.14' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toBeInTheDocument();
      expect(badgeContainer).toHaveTextContent('Float');
    });

    it('displays correct type badge for integer variables', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'integer' }],
              value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: '42' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toBeInTheDocument();
      expect(badgeContainer).toHaveTextContent('Integer');
    });

    it('displays correct type badge for object variables', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'object' }],
              value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: '{}' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toBeInTheDocument();
      expect(badgeContainer).toHaveTextContent('Object');
    });

    it('displays correct type badge for array variables', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'array' }],
              value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: '[]' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toBeInTheDocument();
      expect(badgeContainer).toHaveTextContent('Array');
    });

    it('does not display type badge when isMultiVariableEnabled is false', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'string' }],
              value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testValue' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={false}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.queryByTestId('variable-type-badge');
      expect(badgeContainer).not.toBeInTheDocument();
    });

    it('displays type badge for agent parameters even when isMultiVariableEnabled is false', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testParameter' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'string' }],
              description: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'Test description' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isAgentParameter={true}
            isMultiVariableEnabled={false}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toBeInTheDocument();
      expect(badgeContainer).toHaveTextContent('String');
    });

    it('displays correct type badge for agent parameters when isMultiVariableEnabled is true', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testParameter' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'number' }],
              description: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'Test description' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={true}
            isAgentParameter={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toBeInTheDocument();
      expect(badgeContainer).toHaveTextContent('Float (Number)');
    });

    it('displays raw type value when no matching display name is found', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'unknownType' }],
              value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testValue' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toBeInTheDocument();
      expect(badgeContainer).toHaveTextContent('unknownType');
    });

    it('does not display type badge when type is empty', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
              type: [],
              value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testValue' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.queryByTestId('variable-type-badge');
      expect(badgeContainer).not.toBeInTheDocument();
    });

    it('has proper accessibility attributes for screen readers', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testVariable' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'string' }],
              value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testValue' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isMultiVariableEnabled={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toHaveAttribute('aria-label', 'Variable type: String');
      expect(badgeContainer).toHaveAttribute('role', 'status');
    });

    it('has proper accessibility attributes for agent parameters', () => {
      render(
        <IntlProvider locale="en">
          <VariableEditor
            initialValue={[]}
            onChange={vi.fn()}
            getTokenPicker={vi.fn()}
            index={0}
            variable={{
              name: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'testParameter' }],
              type: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'boolean' }],
              description: [{ type: ValueSegmentType.LITERAL, id: guid(), value: 'Test description' }],
            }}
            disableDelete={false}
            onDelete={vi.fn()}
            onVariableChange={vi.fn()}
            isAgentParameter={true}
          />
        </IntlProvider>
      );

      const badgeContainer = screen.getByTestId('variable-type-badge');
      expect(badgeContainer).toHaveAttribute('aria-label', 'Agent parameter type: Boolean');
      expect(badgeContainer).toHaveAttribute('role', 'status');
    });
  });
});
