/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { useIntl } from 'react-intl';
import { useMemo } from 'react';
import type { MessageDescriptor } from 'react-intl';

/**
 * Custom hook to format messages from centralized message definitions
 * @param messages - Object containing message descriptors from defineMessages
 * @returns Object with the same keys but formatted strings as values
 *
 * @example
 * ```tsx
 * import { useIntlMessages } from '../intl/useIntlMessages';
 * import { commonMessages } from '../intl/messages';
 *
 * const MyComponent = () => {
 *   const intlText = useIntlMessages(commonMessages);
 *   return <div>{intlText.LOADING}</div>;
 * };
 * ```
 */
export function useIntlMessages<T extends Record<string, MessageDescriptor>>(messages: T): Record<keyof T, string> {
  const intl = useIntl();

  return useMemo(() => {
    const formatted = {} as Record<keyof T, string>;

    for (const key in messages) {
      if (Object.prototype.hasOwnProperty.call(messages, key)) {
        const message = messages[key];
        const defaultMessage = message.defaultMessage?.toString() || '';

        // Check if message contains placeholders (e.g., {name}, {current}, {total})
        const hasPlaceholders = /\{[^}]+\}/.test(defaultMessage);

        // Skip parameterized messages - they should be accessed via useIntlFormatters
        if (!hasPlaceholders) {
          formatted[key] = intl.formatMessage(message);
        }
      }
    }

    return formatted;
  }, [intl, messages]);
}

/**
 * Custom hook to create message formatters for parameterized messages
 * Returns functions that can be called with values to format messages
 *
 * @param messages - Object containing message descriptors from defineMessages
 * @returns Object with the same keys but formatter functions as values
 *
 * @example
 * ```tsx
 * import { useIntlFormatters } from '../intl/useIntlMessages';
 * import { workspaceMessages } from '../intl/messages';
 *
 * const MyComponent = () => {
 *   const format = useIntlFormatters(workspaceMessages);
 *   return <div>{format.STEP_INDICATOR({ current: 1, total: 3 })}</div>;
 * };
 * ```
 */
export function useIntlFormatters<T extends Record<string, MessageDescriptor>>(
  messages: T
): Record<keyof T, (values?: Record<string, any>) => string> {
  const intl = useIntl();

  return useMemo(() => {
    const formatters = {} as Record<keyof T, (values?: Record<string, any>) => string>;

    for (const key in messages) {
      if (Object.prototype.hasOwnProperty.call(messages, key)) {
        formatters[key] = (values?: Record<string, any>) => intl.formatMessage(messages[key], values);
      }
    }

    return formatters;
  }, [intl, messages]);
}
