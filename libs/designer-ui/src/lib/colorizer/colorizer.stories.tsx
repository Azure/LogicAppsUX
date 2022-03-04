// colorizer.stories.js|jsx|ts|tsx
import type { ColorizerProps } from '.';
import { Colorizer } from '.';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: Colorizer,
  title: 'Components/Colorizer',
} as ComponentMeta<typeof Colorizer>;

const Template: ComponentStory<typeof Colorizer> = (args: ColorizerProps) => <Colorizer {...args} />;

export const JSON = Template.bind({});
JSON.args = {
  ariaLabel: 'JSON',
  code: `{
  "glossary": {
    "title": "example glossary",
    "GlossDiv": {
      "title": "S",
      "GlossList": {
        "GlossEntry": {
          "ID": "SGML",
          "SortAs": "SGML",
          "GlossTerm": "Standard Generalized Markup Language",
          "Acronym": "SGML",
          "Abbrev": "ISO 8879:1986",
          "GlossDef": {
            "para": "A meta-markup language, used to create markup languages such as DocBook.",
            "GlossSeeAlso": ["GML", "XML"]
          },
          "GlossSee": "markup"
        }
      }
    }
  }
}`,
  language: 'json',
};

export const XML = Template.bind({});
XML.args = {
  ariaLabel: 'XML',
  code: `<note>
  <to>Tove</to>
  <from>Jani</from>
  <heading>Reminder</heading>
  <body>Don't forget me this weekend!</body>
</note>`,
};
