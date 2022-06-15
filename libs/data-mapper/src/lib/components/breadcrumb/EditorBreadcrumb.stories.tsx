import { EditorBreadcrumb } from './EditorBreadcrumb';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: EditorBreadcrumb,
  title: 'Data Mapper/Breadcrumb',
} as ComponentMeta<typeof EditorBreadcrumb>;
export const Standard: ComponentStory<typeof EditorBreadcrumb> = () => <EditorBreadcrumb />;
