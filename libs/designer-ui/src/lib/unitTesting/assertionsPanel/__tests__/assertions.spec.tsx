import { Assertions, type AssertionsProps } from '../assertions';
import { initializeIcons } from '@fluentui/react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/unitTesting/assertionsPanel/assertions', () => {
  let minimal: AssertionsProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      assertions: [],
      onAssertionAdd: jest.fn(),
      onDismiss: jest.fn(),
      onAssertionDelete: jest.fn(),
      onAssertionUpdate: jest.fn(),
      getTokenPicker: jest.fn(),
      tokenMapping: {},
      loadParameterValueFromString: jest.fn(),
      validationErrors: {},
    };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render without assertions items and add button.', () => {
    const assertions = renderer.render(<Assertions {...minimal} />);
    expect(assertions).toMatchSnapshot();
  });

  it('should render list of assertions and add button', () => {
    minimal.assertions = [
      {
        name: 'test-assertion',
        description: 'test-description',
        expression: {
          items: {
            type: 'group',
            items: [],
          },
        },
        id: 'test-id',
        isEditable: true,
      },
      {
        name: 'test-assertion-2',
        description: '',
        expression: {
          items: {
            type: 'group',
            items: [],
          },
        },
        id: 'test-id-2',
        isEditable: true,
      },
    ];
    const assertions = renderer.render(<Assertions {...minimal} />);
    expect(assertions).toMatchSnapshot();
  });
});
