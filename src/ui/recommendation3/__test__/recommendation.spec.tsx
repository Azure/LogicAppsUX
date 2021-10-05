import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Card } from '../card';
import Constants from '../../constants';
import { Recommendation, RecommendationProps } from '../recommendation';

describe('ui/recommendation3/_recommendation', () => {
  let minimal: RecommendationProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      selected: false,
      selectedConnector: undefined,
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  describe('Recommendation as action card', () => {
    it('should render as an action card', () => {
      const onCancelClick = jest.fn();
      const props = { ...minimal, onCancelClick };
      renderer.render(<Recommendation {...props} />);

      const recommendation = renderer.getRenderOutput();
      expect(recommendation.props.brandColor).toBe(Constants.DEFAULT_BRAND_COLOR);
      expect(recommendation.props.icon).toBe('choose-an-action.svg');
      expect(recommendation.props.title).toBe('Choose an operation');
      expect(recommendation.props.onCancelClick).toEqual(props.onCancelClick);
      expect(recommendation.type).toEqual(Card);
    });
  });
});
