import { LOCAL_STORAGE_KEYS } from '@microsoft/logic-apps-shared';

export async function retrieveClipboardData() {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      const clipboardData = await navigator.clipboard.readText();
      if (clipboardData) {
        const parsedData = JSON.parse(clipboardData);
        if (parsedData.mslaNode) {
          return parsedData;
        }
      }
      return null;
    }
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD) ?? '');
  } catch (_error) {
    return null;
  }
}
