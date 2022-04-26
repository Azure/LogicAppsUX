import type { ConnectorSummaryCardProps } from '../connectorsummarycard';
import { ConnectorSummaryCard } from '../connectorsummarycard';
import { ConnectorsMock } from '@microsoft-logic-apps/utils';
import renderer from 'react-test-renderer';

describe('recommendation panel', () => {
  // Danielle, do we need shallow or regular renderer here?
  const connector = ConnectorsMock[0];
  const { properties } = connector;

  const props: ConnectorSummaryCardProps = {
    connectorName: properties.displayName,
    description: properties['description'] || '',
    id: connector.id,
    iconUrl: properties.iconUri,
    brandColor: properties.brandColor,
  };

  it('renders connector card', () => {
    const component = renderer.create(<ConnectorSummaryCard {...props}></ConnectorSummaryCard>).toJSON();
    expect(component).toMatchSnapshot();
  });
});
