import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { getIntl, resetIntl } from '../intl';
import { describe, test, expect, beforeEach } from 'vitest';
import React from 'react';
import { IntlProvider } from '../IntlProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('IntlGlobalProvider', () => {
  beforeEach(() => {
    resetIntl();
  });
  test('renders children correctly', () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: {
                refetchInterval: false,
                refetchIntervalInBackground: false,
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
                refetchOnMount: false,
                staleTime: 1000 * 60 * 60 * 24, // 24 hours
              },
            },
          })
        }
      >
        <IntlProvider locale="fr" defaultLocale="en" onError={() => {}}>
          <div>Test Child</div>
        </IntlProvider>
      </QueryClientProvider>
    );
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });
});

describe('getIntl', () => {
  beforeEach(() => {
    resetIntl();
  });
  test('returns default IntlShape when INTL is undefined', () => {
    const intl = getIntl();
    expect(intl.locale).toBe('en');
    expect(intl.messages).toEqual({});
    expect(intl.defaultLocale).toBe('en');
  });

  test('returns defined INTL when INTL is defined', async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: {
                refetchInterval: false,
                refetchIntervalInBackground: false,
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
                refetchOnMount: false,
                staleTime: 1000 * 60 * 60 * 24, // 24 hours
              },
            },
          })
        }
      >
        <IntlProvider locale="fr" defaultLocale="en" onError={() => {}} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const intl = getIntl();
      expect(intl.locale).toBe('fr');
      expect(intl.defaultLocale).toBe('en');
      expect(intl.messages).toEqual(
        expect.objectContaining({
          ms1c7f7bd22261: [
            {
              type: 0,
              value: 'Mois', // Month
            },
          ],
        })
      );
    });
  });
});
