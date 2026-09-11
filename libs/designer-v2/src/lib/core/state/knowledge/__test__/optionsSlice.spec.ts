import { describe, expect, it } from 'vitest';
import { initializeData, type KnowledgeServiceOptions } from '../../../actions/bjsworkflow/knowledge';
import optionsReducer, { clearNotification, setDarkMode, setNotification } from '../optionsSlice';

describe('knowledge options slice', () => {
  it('returns the initial state', () => {
    expect(optionsReducer(undefined, { type: 'unknown' })).toEqual({
      servicesInitialized: false,
      isDarkMode: false,
      notification: undefined,
    });
  });

  it('sets dark mode', () => {
    expect(optionsReducer(undefined, setDarkMode(true)).isDarkMode).toBe(true);
    expect(optionsReducer(undefined, setDarkMode(false)).isDarkMode).toBe(false);
  });

  it('sets and clears notifications', () => {
    const notification = { title: 'Saved', content: 'The knowledge source was saved.' };
    const notifiedState = optionsReducer(undefined, setNotification(notification));

    expect(notifiedState.notification).toEqual(notification);
    expect(optionsReducer(notifiedState, clearNotification()).notification).toBeUndefined();
  });

  it('marks services initialized when initialization succeeds', () => {
    const action = initializeData.fulfilled(true, 'request-id', {} as KnowledgeServiceOptions);

    expect(optionsReducer(undefined, action).servicesInitialized).toBe(true);
  });
});
