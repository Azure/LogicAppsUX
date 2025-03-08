import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import { OverviewCommandBar, type OverviewCommandBarProps } from '../overviewcommandbar';
import { describe, vi, beforeEach, beforeAll, it, expect } from 'vitest';
import React from 'react';

describe('lib/overview/overviewcommandbar', () => {
  let minimal: OverviewCommandBarProps;

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    minimal = {
      onRefresh: vi.fn(),
      onRunTrigger: vi.fn(),
    };
  });

  it('renders', () => {
    const tree = renderer.create(<OverviewCommandBar {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with Run trigger button', () => {
    const tree = renderer.create(<OverviewCommandBar {...minimal} triggerName={'Request'} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
