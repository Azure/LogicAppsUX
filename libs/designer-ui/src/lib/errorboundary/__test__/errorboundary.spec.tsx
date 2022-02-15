import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import { getTestIntl } from '../../__test__/intl-test-helper';
import { ErrorBoundaryInternal as ErrorBoundary } from '../index';

describe('lib/errorboundary', () => {
  const Throws = () => {
    throw new Error("I'm an error");
  };

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {
      // Silence automatically generated error messages when rendering React error boundaries.
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children if there is no error', () => {
    const component = (
      <ErrorBoundary intl={getTestIntl()}>
        <div>Nothing happened.</div>
      </ErrorBoundary>
    );
    const tree = renderer.create(component).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a default experience if an error occurs and no fallback is set', () => {
    const component = (
      <ErrorBoundary intl={getTestIntl()}>
        <Throws />
      </ErrorBoundary>
    );
    const tree = renderer.create(component).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render the fallback if an error occurs and fallback is set', () => {
    const component = (
      <ErrorBoundary fallback={<div>Fallback rendered when error occurs</div>} intl={getTestIntl()}>
        <Throws />
      </ErrorBoundary>
    );
    const tree = renderer.create(component).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
