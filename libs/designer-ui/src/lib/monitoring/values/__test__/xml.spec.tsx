import renderer from 'react-test-renderer';
import type { ValueProps } from '../types';
import { XmlValue } from '../xml';

describe('ui/monitoring/values/xml', () => {
  let props: ValueProps;

  beforeEach(() => {
    props = {
      displayName: 'XML',
      value: {
        '$content-type': 'application/xml',
        $content: 'PHhtbD48L3htbD4=',
      },
    };
  });

  it('should render XML', () => {
    const tree = renderer.create(<XmlValue {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render XML without the UTF-8 byte order mark (BOM)', () => {
    props.value = {
      '$content-type': 'application/xml',
      $content: '77u/PHhtbD48L3htbD4=', // <xml></xml> with a prepended UTF-8 BOM
    };
    const tree = renderer.create(<XmlValue {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a zero-width space if value is empty', () => {
    props.value = {
      '$content-type': 'application/xml',
      $content: '',
    };
    const tree = renderer.create(<XmlValue {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render XML with encoded UTF-8 Chinese correctly', () => {
    props.value = {
      '$content-type': 'application/xml',
      $content:
        '77u/PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48cm9vdD48bmFtZSB1c2VybmFtZT0iSlMx55So5oi35ZCNIj7kvaDlpb0gSm9objwvbmFtZT48bmFtZSB1c2VybmFtZT0iTUkx55So5oi35ZCNIj7kuK3mlofmtYvor5U8L25hbWU+PC9yb290Pg==',
    };
    const tree = renderer.create(<XmlValue {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should not render when not visible', () => {
    const tree = renderer.create(<XmlValue {...props} visible={false} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
