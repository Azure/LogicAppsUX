// values.stories.js|jsx|ts|tsx
import { Value } from './index';
import type { ValueProps } from './types';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: Value,
  title: 'Components/Monitoring/Values',
} as ComponentMeta<typeof Value>;

const Template: ComponentStory<typeof Value> = (args: ValueProps) => (
  <div className="msla-monitoring-parameters-card-body">
    <section className="msla-trace-inputs-outputs">
      <div className="msla-trace-values">
        <Value {...args} />
      </div>
    </section>
  </div>
);

export const ArrayRawValue = Template.bind({});
ArrayRawValue.args = {
  displayName: 'Array',
  value: [1, 2, 3],
};

export const BodyLink = Template.bind({});
BodyLink.args = {
  displayName: 'Body Link',
  value: {
    contentHash: {
      algorithm: 'md5',
      value: 'dwaaampltx5AtrE49q/IzA==',
    },
    contentSize: 215,
    contentVersion: 'dwaaampltx5AtrE49q/IzA==',
    uri: '[REDACTED]',
  },
};

export const BooleanRawValue = Template.bind({});
BooleanRawValue.args = {
  displayName: 'Boolean',
  value: true,
};

export const DateTimeValue = Template.bind({});
DateTimeValue.args = {
  displayName: 'Date/Time',
  format: 'date-time',
  value: new Date().toISOString(),
};

export const DecimalValue = Template.bind({});
DecimalValue.args = {
  displayName: 'Decimal',
  format: 'decimal',
  value: '-123.45',
};

export const HtmlValue = Template.bind({});
HtmlValue.args = {
  displayName: 'HTML Table',
  format: 'html',
  value: '<table><thead><th>Value</th><th>Doubled</th></thead><tbody><tr><td>1</td><td>2</td></tbody></table>',
};

export const KeyValuePairs = Template.bind({});
KeyValuePairs.args = {
  displayName: 'HTTP Headers',
  format: 'key-value-pairs',
  value: {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Referrer-Policy': 'no-referred-when-downgrade',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    Connection: 'keep-alive',
    Server: 'nginx',
    'WWW-Authenticate': 'Basic realm="Fake Realm"',
    'Content-Length': '0',
  },
};

export const NullRawValue = Template.bind({});
NullRawValue.args = {
  displayName: 'Null',
  value: null,
};

export const NumberValue = Template.bind({});
NumberValue.args = {
  displayName: 'Number',
  value: -123.45,
};

export const ObjectRawValue = Template.bind({});
ObjectRawValue.args = {
  displayName: 'Object',
  value: {
    hello: 'world!',
  },
};

export const StringRawValue = Template.bind({});
StringRawValue.args = {
  displayName: 'String',
  value: 'Hello world!',
};

export const XmlValue = Template.bind({});
XmlValue.args = {
  displayName: 'XML',
  format: 'xml',
  value: {
    '$content-type': 'application/xml',
    $content: 'PHhtbD48L3htbD4=',
  },
};
