/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Centralized internationalization (i18n) exports
 *
 * Usage:
 * 1. Import the hook and messages in your component:
 *    import { useIntlMessages, useIntlFormatters, workspaceMessages } from '../intl';
 *
 * 2. Use the hook to get formatted messages:
 *    const intlText = useIntlMessages(workspaceMessages);
 *
 * 3. Access the formatted strings:
 *    <div>{intlText.LOADING}</div>
 *
 * 4. For parameterized messages, use useIntlFormatters:
 *    const format = useIntlFormatters(workspaceMessages);
 *    <div>{format.STEP_INDICATOR({ current: 1, total: 3 })}</div>
 */

export { useIntlMessages, useIntlFormatters } from './useIntlMessages';
export {
  commonMessages,
  unitTestMessages,
  workspaceMessages,
  exportMessages,
  designerMessages,
  overviewMessages,
  chatMessages,
} from './messages';
