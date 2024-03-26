import { Assertion, type AssertionProps } from '../index';
import { initializeIcons } from '@fluentui/react';
import TestRenderer from 'react-test-renderer';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/unitTesting/assertionsPanel/assertion', () => {
  let minimal: AssertionProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      assertion: {
        id: 'test-id',
        name: 'test-name',
        description: 'test-description',
        expression: {
          items: {
            type: 'group',
            items: [],
          },
        },
        isEditable: true,
      },
      onAssertionDelete: jest.fn(),
      onAssertionUpdate: jest.fn(),
      getTokenPicker: jest.fn(),
      tokenMapping: {},
      loadParameterValueFromString: jest.fn(),
      validationErrors: {},
      isInverted: false,
    };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render the component as editable with light theme.', () => {
    const assertion = TestRenderer.create(<Assertion {...minimal} />);
    expect(assertion).toMatchSnapshot();
  });

  it('should render the component as no editable with dark theme.', () => {
    minimal.isInverted = true;
    minimal.assertion.isEditable = false;
    const assertion = TestRenderer.create(<Assertion {...minimal} />);
    expect(assertion).toMatchSnapshot();
  });

  it('should render the component with validation errors and error traffic light dot', () => {
    minimal.assertion.name = '';
    minimal.assertion.expression = {
      items: {
        type: 'group',
        items: [
          {
            type: 'row',
            checked: false,
            operand1: [],
            operator: 'equals',
            operand2: [
              {
                id: 'C0531439-5F53-4351-82E3-845772813C23',
                type: 'literal',
                value: '1',
              },
            ],
          },
        ],
      },
    };

    minimal.validationErrors = {
      name: 'Must provide the Assertion name.',
      expression: 'Enter a valid condition statement.',
    };
    const assertion = TestRenderer.create(<Assertion {...minimal} />);
    expect(assertion).toMatchSnapshot();
  });
});
