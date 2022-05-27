import { Peek } from '@microsoft/designer-ui';
import { IntlProvider } from 'react-intl';

export interface SampleDataDisplayerProps {
  data: string;
  onOKClick?(): void;
}

export const SampleDataDisplayer = ({ data, onOKClick }: SampleDataDisplayerProps, { locale = 'en' }) => {
  return (
    <IntlProvider
      locale={locale}
      defaultLocale={locale}
      onError={(err) => {
        if (err.code === 'MISSING_TRANSLATION') {
          return;
        }
        throw err;
      }}
    >
      <Peek input={data} />
    </IntlProvider>
  );
};
