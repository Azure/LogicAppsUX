export const BladeClosedReason = {
  /**
   * The blade was closed in reaction to some user navigation.
   */
  UserNavigation: 1,
  /**
   * The child blade closed itself programmatically.
   */
  ChildClosedSelf: 2,
} as const;

export type BladeClosedReason = (typeof BladeClosedReason)[keyof typeof BladeClosedReason];

export type BladeReference = {
  readonly extensionName: string;

  /**
   * The name of the Blade.
   */
  readonly bladeName: string;

  /**
   * A map of parameters to be passed to the Blade.
   */
  readonly parameters?: Record<string, any>;

  /**
   * A callback that will be called when the Blade closes.
   */
  readonly onClosed?: (reason: BladeClosedReason, data?: Record<string, any>) => void;
};

export const HelpPaneState = {
  /**
   * The default state
   */
  Default: 0,
  /**
   * The help pane is closed
   */
  Closed: 1,
  /**
   * The help pane is minimized
   */
  Minimized: 2,
} as const;

export type HelpPaneState = (typeof HelpPaneState)[keyof typeof HelpPaneState];

export type OpenBladeOptions = {
  /**
   * Specifies that the opened Blade should be docked at (0, 0).
   * Useful only when opening fixed-width Blades that would otherwise be opened to the right of the parent Blade.
   */
  readonly asSubJourney?: boolean;

  /**
   * If true this optional setting specifies that a new journey will be created.
   * All currently opened blades will be closed.
   * It is the same behavior if a user navigates to a blade from a deepLink.
   */
  readonly asNewJourney?: boolean;

  /**
   * The desired help pane state when the new blade is opened
   */
  readonly helpPane?: HelpPaneState;
};
