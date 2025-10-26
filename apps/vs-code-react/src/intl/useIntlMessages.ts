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
        formatted[key] = intl.formatMessage(messages[key]);
      }
    }

    return formatted;
  }, [intl, messages]);
}
