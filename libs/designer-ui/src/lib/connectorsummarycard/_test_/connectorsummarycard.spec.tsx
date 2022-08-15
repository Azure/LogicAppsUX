import type { ConnectorSummaryCardProps } from '..';
import { ConnectorSummaryCard } from '..';
import { ConnectorsMock } from '@microsoft-logic-apps/utils';
import ShallowRenderer from 'react-test-renderer/shallow';

describe('recommendation panel', () => {
  let renderer: ShallowRenderer.ShallowRenderer;
  const connector = ConnectorsMock[0];
  const { properties } = connector;

  const props: ConnectorSummaryCardProps = {
    connectorName: properties.displayName,
    description: properties['description'] || '',
    id: connector.id,
    iconUrl: properties.iconUri,
    brandColor: properties.brandColor,
  };

  beforeAll(() => {
    renderer = ShallowRenderer.createRenderer();
  });

  it('renders connector card', () => {
    const component = renderer.render(<ConnectorSummaryCard {...props}></ConnectorSummaryCard>);
    expect(component).toMatchSnapshot();
  });
});
