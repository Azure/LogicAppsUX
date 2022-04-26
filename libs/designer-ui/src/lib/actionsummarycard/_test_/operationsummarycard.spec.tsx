import type { OperationCardProps } from '../card';
import { OperationCard } from '../card';
import { MockSearchOperations } from '@microsoft-logic-apps/utils';
import renderer from 'react-test-renderer';

describe('recommendation panel', () => {
  // Danielle, do we need shallow or regular renderer here?
  const operation = MockSearchOperations[0];
  const { properties } = operation;

  const props: OperationCardProps = {
    title: properties.summary,
    category: properties.category,
    iconUrl: properties.api.iconUri,
    id: operation.id,
    connectorName: properties.api.displayName,
    subtitle: properties.description,
  };

  it('renders operation card', () => {
    const component = renderer.create(<OperationCard {...props}></OperationCard>).toJSON();
    expect(component).toMatchSnapshot();
  });
});
