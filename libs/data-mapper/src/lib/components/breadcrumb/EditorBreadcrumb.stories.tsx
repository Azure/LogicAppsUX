import type { UpdateBreadcrumbAction } from '../../core/state/BreadcrumbSlice';
import { updateBreadcrumbForSchema } from '../../core/state/BreadcrumbSlice';
import { store } from '../../core/state/Store';
import type { Schema } from '../../models/Schema';
import { convertSchemaToSchemaExtended } from '../../models/Schema';
import { simpleMockSchema } from '../../models/__mocks__';
import { EditorBreadcrumb } from './EditorBreadcrumb';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import { Provider } from 'react-redux';

const MockStore = ({ mockState, children }) => {
  store.dispatch(updateBreadcrumbForSchema(mockState));

  return <Provider store={store}>{children}</Provider>;
};

export default {
  component: EditorBreadcrumb,
  title: 'Data Mapper/Breadcrumb',
} as ComponentMeta<typeof EditorBreadcrumb>;

const Template: ComponentStory<typeof EditorBreadcrumb> = () => {
  console.log(store.getState().breadcrumb.breadcrumbItems);

  return <EditorBreadcrumb />;
};

export const Standard = Template.bind({});
Standard.decorators = [
  (story) => {
    const schema: Schema = JSON.parse(JSON.stringify(simpleMockSchema));
    const extendedSchema = convertSchemaToSchemaExtended(schema);

    const stateUpdate: UpdateBreadcrumbAction = {
      schema: extendedSchema,
      currentNode: extendedSchema.schemaTreeRoot.children[0],
    };

    return <MockStore mockState={stateUpdate}>{story()}</MockStore>;
  },
];
