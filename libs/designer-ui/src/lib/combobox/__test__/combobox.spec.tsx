import { Combobox } from '../index';
import { setIconOptions } from '@fluentui/react';
import { render, fireEvent, act } from '@testing-library/react';
import renderer from 'react-test-renderer';

describe('lib/combobox', () => {
  const defaultProps = {
    options: [
      { key: '1', value: 'one', displayName: 'One' },
      { key: '2', value: 'two', displayName: 'Two' },
      { key: '3', value: 'three', displayName: 'Three' },
      { key: '4', value: 'four', displayName: 'Four' },
    ],
    initialValue: [],
    onChange: jest.fn(),
  };

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  it('should render', () => {
    const tree = renderer.create(<Combobox {...defaultProps} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('updates selected value when option clicked', () => {
    const { getByText, getByRole } = render(<Combobox {...defaultProps} />);
    const combobox = getByRole('combobox');

    act(() => {
      fireEvent.click(combobox);
    });

    const option = getByText('One');
    act(() => {
      fireEvent.click(option);
    });

    expect(defaultProps.onChange).toHaveBeenCalledWith({
      value: [
        expect.objectContaining({
          value: 'one',
        }),
      ],
    });

    act(() => {
      fireEvent.click(combobox);
    });

    const option2 = getByText('Two');
    act(() => {
      fireEvent.click(option2);
    });

    expect(defaultProps.onChange).toHaveBeenCalledWith({
      value: [
        expect.objectContaining({
          value: 'two',
        }),
      ],
    });
  });
});
