declare const __BUILD_VERSION__: string;
declare const __BUILD_TAG__: string;
declare const __BUILD_SHA__: string;
declare const __BUILD_BRANCH__: string;
declare const __BUILD_TIME__: string;

declare global {
  interface Window {
    LOGGED_IN_USER_NAME?: string;
  }
}

export {};
