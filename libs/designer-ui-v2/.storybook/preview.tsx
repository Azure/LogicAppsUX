import type { Preview } from '@storybook/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { DesignerUiScope } from '@microsoft/designer-ui-v2';
import '../stories/story.css';

const preview: Preview = {
  tags: ['autodocs'],
  initialGlobals: { theme: 'light', direction: 'ltr' },
  globalTypes: {
    theme: {
      description: 'Fluent theme and scoped node palette',
      toolbar: { title: 'Theme', icon: 'paintbrush', items: ['light', 'dark'], dynamicTitle: true },
    },
    direction: {
      description: 'Fluent provider context and DOM direction',
      toolbar: { title: 'Direction', icon: 'paragraph', items: ['ltr', 'rtl'], dynamicTitle: true },
    },
  },
  decorators: [
    (Story, context) => {
      const mode = context.globals.theme === 'dark' ? 'dark' : 'light';
      const direction = context.globals.direction === 'rtl' ? 'rtl' : 'ltr';
      return (
        <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme} dir={direction} className="sb-preview">
          {context.parameters.designerScope === false ? (
            <Story />
          ) : (
            <DesignerUiScope mode={mode} dir={direction}>
              <Story />
            </DesignerUiScope>
          )}
        </FluentProvider>
      );
    },
  ],
  parameters: {
    layout: 'padded',
    controls: { expanded: true, sort: 'requiredFirst' },
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: [
          'Start here',
          ['Introduction', 'API and boundaries'],
          'Foundations',
          'Node Cards',
          'Agents',
          'Information',
          'Connections',
          'Presentation',
          'Actions',
          'Icons',
        ],
      },
    },
    docs: {
      toc: true,
      source: { type: 'dynamic', excludeDecorators: true },
    },
    a11y: { element: '#storybook-root' },
  },
};

export default preview;
