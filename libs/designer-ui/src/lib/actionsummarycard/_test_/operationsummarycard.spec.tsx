import type { OperationCardProps } from '../card';
import { OperationCard } from '../card';
import { MockSearchOperations } from '@microsoft-logic-apps/utils';
import ShallowRenderer from 'react-test-renderer/shallow';

describe('recommendation panel', () => {
  let renderer: ShallowRenderer.ShallowRenderer;
  const operation = MockSearchOperations[0];
  const { properties } = operation;

  beforeAll(() => {
    renderer = ShallowRenderer.createRenderer();
  });

  const props: OperationCardProps = {
    title: properties.summary,
    category: properties.category,
    iconUrl: properties.api.iconUri,
    id: operation.id,
    connectorName: properties.api.displayName,
    subtitle: properties.description,
  };

  it('renders operation card', () => {
    const component = renderer.render(<OperationCard {...props}></OperationCard>);
    expect(component).toMatchSnapshot();
  });
});
