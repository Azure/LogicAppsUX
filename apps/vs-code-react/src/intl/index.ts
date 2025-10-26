/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Centralized internationalization (i18n) exports
 *
 * Usage:
 * 1. Import the hook and messages in your component:
 *    import { useIntlMessages, commonMessages } from '../intl';
 *
 * 2. Use the hook to get formatted messages:
 *    const intlText = useIntlMessages(commonMessages);
 *
 * 3. Access the formatted strings:
 *    <div>{intlText.LOADING}</div>
 */

export { useIntlMessages } from './useIntlMessages';
export {
  commonMessages,
  unitTestMessages,
  workspaceMessages,
  exportMessages,
  designerMessages,
  overviewMessages,
} from './messages';
