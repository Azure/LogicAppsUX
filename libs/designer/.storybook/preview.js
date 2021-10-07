import { initializeIcons } from '@fluentui/react';
import { DesignerProvider } from '../src/lib/core/DesignerProvider';
import '../src/lib/ui/logicapps.less';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
const messages = {
  en: { right: 'EN-US', title: 'English' },
  'en-XA': { right: 'EN-XA', title: 'PseudoLoc' },
  'cs-CZ': { right: 'CS-CZ', title: 'Czech' },
  'de-DE': { right: 'DE-DE', title: 'German' },
  'es-ES': { right: 'ES-ES', title: 'Spanish' },
  'fr-FR': { right: 'FR-FR', title: 'French' },
  'hu-HU': { right: 'HU-HU', title: 'Hungarian' },
  'id-ID': { right: 'ID-ID', title: 'Indonesion' },
  'it-IT': { right: 'IT-IT', title: 'Italian' },
  'ja-JP': { right: 'JP-JP', title: 'Japanese' },
  'ko-KR': { right: 'KO-KR', title: 'Korean' },
  'nl-NL': { right: 'NL-NL', title: 'Dutch' },
  'pl-PL': { right: 'PL-PL', title: 'Polish' },
  'pt-BR': { right: 'PT-NR', title: 'Portuguese - Brazil' },
  'pt-PT': { right: 'PT-PT', title: 'Portuguese - Portugal' },
  'ru-RU': { right: 'RU-RU', title: 'Russian' },
  'sv-SE': { right: 'SV-SE', title: 'Swedish' },
  'tr-TR': { right: 'TR-TR', title: 'Turkish' },
  'zh-Hans': { right: 'ZH-HANS', title: 'Chinese - Simplified' },
  'zh-Hant': { right: 'ZH-HANT', title: 'Chinese - Traditional' },
};

export const globalTypes = {
  locale: {
    name: 'Locale',
    description: 'Internationalization locale',
    defaultValue: 'en',
    toolbar: {
      icon: 'globe',
      items: [
        ...Object.entries(messages).map(([key, value]) => ({
          value: key,
          right: value.right,
          title: value.title,
        })),
      ],
    },
  },
};

initializeIcons();
export const decorators = [
  (Story, context) => (
    <DesignerProvider locale={context.globals.locale}>
      <Story />
    </DesignerProvider>
  ),
];
