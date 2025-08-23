// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { AdvancedSettingsMessage } from '../advancedSettingsMessage';
import { describe, expect, it } from 'vitest';

describe('AdvancedSettingsMessage Component', () => {
  it('should not render anything when shouldShowMessage is false', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <AdvancedSettingsMessage shouldShowMessage={false} />
      </IntlProvider>
    );
    // Expecting null because the component should not render anything
    expect(container.firstChild).toBeNull();
  });

  it('should render correctly and match snapshot when shouldShowMessage is true', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <AdvancedSettingsMessage shouldShowMessage={true} />
      </IntlProvider>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
