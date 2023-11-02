import { Combobox } from '../index';
import { setIconOptions } from '@fluentui/react';
import { render, fireEvent, act } from '@testing-library/react';
import renderer from 'react-test-renderer';

describe('lib/combobox', () => {
  const defaultProps = {
    options: [
      { key: '1', value: 'one', displayName: 'B' },
      { key: '2', value: 'two', displayName: 'A' },
      { key: '3', value: 'three', displayName: 'C' },
      { key: '4', value: 'four', displayName: 'D' },
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

    const option = getByText('B');
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

    const option2 = getByText('A');
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

  it('ensures options are sorted alphabetically and special option is at the end', () => {
    const { getByRole, getAllByRole } = render(<Combobox {...defaultProps} />);
    const combobox = getByRole('combobox');

    act(() => {
      fireEvent.click(combobox);
    });

    const options = getAllByRole('option');
    const optionTexts = options.map((option) => option.textContent);

    // Ensure the special option is at the end
    expect(optionTexts[optionTexts.length - 1]).toEqual('Enter custom value');

    // Check the rest are sorted
    const sortedTexts = [...optionTexts.slice(0, -1)].sort((a, b) => a.localeCompare(b));

    expect(optionTexts.slice(0, -1)).toEqual(sortedTexts);
  });
});
