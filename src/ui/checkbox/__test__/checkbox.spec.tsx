import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Checkbox } from '..';

describe('ui/checkbox', () => {
    let renderer: ReactShallowRenderer.ShallowRenderer;

    beforeEach(() => {
        renderer = ReactShallowRenderer.createRenderer();
    });

    afterEach(() => {
        renderer.unmount();
    });

    it('should render', () => {
        renderer.render(<Checkbox />);

        const checkbox = renderer.getRenderOutput();
        expect(checkbox).toBeDefined();
    });

    it('should render a complete checkbox HTML control', () => {
        renderer.render(<Checkbox />);

        const checkbox = renderer.getRenderOutput();
        expect(checkbox.type).toBe('div');

        const [label]: any[] = React.Children.toArray(checkbox.props.children); // tslint:disable-line: no-any
        expect(label.props.className).toBe('msla-checkbox-label');
    });

    it('should render additional class', () => {
        renderer.render(<Checkbox className="additional-class" />);

        const checkbox = renderer.getRenderOutput();
        expect(checkbox.props.className).toBe('additional-class msla-checkbox');
    });

    it('should render an unchecked checkbox if initial checked state is not specified', () => {
        renderer.render(<Checkbox className="additional-class" />);

        const checkbox = renderer.getRenderOutput();
        const [input]: any[] = React.Children.toArray(checkbox.props.children); // tslint:disable-line: no-any
        expect(input.props.checked).toBeFalsy();
    });

    it('should return default value of false (truthy) if defaultState false', () => {
        renderer.render(<Checkbox className="additional-class" initChecked={false} />);

        const checkbox = renderer.getRenderOutput();
        const [input]: any[] = React.Children.toArray(checkbox.props.children); // tslint:disable-line: no-any
        expect(input.props.checked).toBeFalsy();
    });

    it('should return default value of true if defaultState is true', () => {
        renderer.render(<Checkbox className="additional-class" initChecked={true} />);

        const checkbox = renderer.getRenderOutput();
        const [input]: any[] = React.Children.toArray(checkbox.props.children); // tslint:disable-line: no-any
        expect(input.props.checked).toBeTruthy();
    });

    describe('onDisplayInformationText', () => {
        it('should render a description text control only when requested', () => {
            renderer.render(<Checkbox descriptionText="description" />);

            const checkbox = renderer.getRenderOutput();
            const [, button]: any[] = React.Children.toArray(checkbox.props.children); // tslint:disable-line: no-any

            // TODO(joechung): Figure out how to test the render output after click.
            const e = {
                preventDefault: jest.fn()
            };
            button.props.onClick(e);
            expect(e.preventDefault).toHaveBeenCalled();
        });
    });

    describe('onChange', () => {
        it('should call onChange handler when set', () => {
            const onChange = jest.fn();
            renderer.render(<Checkbox onChange={onChange} />);

            // TODO(joechung): Figure out how to test the render output after input change.
            const checkbox = renderer.getRenderOutput();
            const [input]: any[] = React.Children.toArray(checkbox.props.children); // tslint:disable-line: no-any
            input.props.onChange({});
            expect(onChange).toHaveBeenCalled();
        });

        it('should not throw error if onChange handler is not set', () => {
            renderer.render(<Checkbox />);

            const checkbox = renderer.getRenderOutput();
            const [input]: any[] = React.Children.toArray(checkbox.props.children); // tslint:disable-line: no-any
            expect(() => input.props.onChange({})).not.toThrow();
        });

        it('should render a checked checkbox when clicked', () => {
            const onChange = jest.fn();
            renderer.render(<Checkbox onChange={onChange} />);

            // TODO(joechung): Figure out how to test the render output after input change.
            const checkbox = renderer.getRenderOutput();
            const [input]: any[] = React.Children.toArray(checkbox.props.children); // tslint:disable-line: no-any
            input.props.onChange({});
        });

        it('should render an unchecked box when clicked twice', () => {
            const onChange = jest.fn();
            renderer.render(<Checkbox onChange={onChange} />);

            // TODO(joechung): Figure out how to test the render output after input change.
            const checkbox = renderer.getRenderOutput();
            const [input]: any[] = React.Children.toArray(checkbox.props.children); // tslint:disable-line: no-any
            input.props.onChange({});
            input.props.onChange({});
        });
    });
});
