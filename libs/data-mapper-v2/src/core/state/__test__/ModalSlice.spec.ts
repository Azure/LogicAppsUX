import { describe, it, expect } from 'vitest';
import modalReducer, { openDiscardWarningModal, closeModal, setModalOkClicked, WarningModalState, type ModalState } from '../ModalSlice';

describe('ModalSlice', () => {
  const initialState: ModalState = {
    isWarningModalOpen: false,
    isOkClicked: false,
  };

  describe('initial state', () => {
    it('should return the initial state when called with undefined state', () => {
      const result = modalReducer(undefined, { type: 'unknown' });

      expect(result).toEqual(initialState);
    });

    it('should have isWarningModalOpen as false by default', () => {
      const result = modalReducer(undefined, { type: 'unknown' });

      expect(result.isWarningModalOpen).toBe(false);
    });

    it('should have isOkClicked as false by default', () => {
      const result = modalReducer(undefined, { type: 'unknown' });

      expect(result.isOkClicked).toBe(false);
    });

    it('should have warningModalType as undefined by default', () => {
      const result = modalReducer(undefined, { type: 'unknown' });

      expect(result.warningModalType).toBeUndefined();
    });
  });

  describe('openDiscardWarningModal action', () => {
    it('should set isWarningModalOpen to true', () => {
      const result = modalReducer(initialState, openDiscardWarningModal());

      expect(result.isWarningModalOpen).toBe(true);
    });

    it('should set warningModalType to DiscardWarning', () => {
      const result = modalReducer(initialState, openDiscardWarningModal());

      expect(result.warningModalType).toBe(WarningModalState.DiscardWarning);
    });

    it('should not affect isOkClicked', () => {
      const result = modalReducer(initialState, openDiscardWarningModal());

      expect(result.isOkClicked).toBe(false);
    });

    it('should be idempotent when called multiple times', () => {
      let result = modalReducer(initialState, openDiscardWarningModal());
      result = modalReducer(result, openDiscardWarningModal());

      expect(result.isWarningModalOpen).toBe(true);
      expect(result.warningModalType).toBe(WarningModalState.DiscardWarning);
    });
  });

  describe('closeModal action', () => {
    it('should set isWarningModalOpen to false', () => {
      const openState: ModalState = {
        isWarningModalOpen: true,
        warningModalType: WarningModalState.DiscardWarning,
        isOkClicked: false,
      };

      const result = modalReducer(openState, closeModal());

      expect(result.isWarningModalOpen).toBe(false);
    });

    it('should set isOkClicked to false', () => {
      const openState: ModalState = {
        isWarningModalOpen: true,
        warningModalType: WarningModalState.DiscardWarning,
        isOkClicked: true,
      };

      const result = modalReducer(openState, closeModal());

      expect(result.isOkClicked).toBe(false);
    });

    it('should set warningModalType to undefined', () => {
      const openState: ModalState = {
        isWarningModalOpen: true,
        warningModalType: WarningModalState.DiscardWarning,
        isOkClicked: false,
      };

      const result = modalReducer(openState, closeModal());

      expect(result.warningModalType).toBeUndefined();
    });

    it('should reset all modal state', () => {
      const openState: ModalState = {
        isWarningModalOpen: true,
        warningModalType: WarningModalState.DiscardWarning,
        isOkClicked: true,
      };

      const result = modalReducer(openState, closeModal());

      expect(result).toEqual(initialState);
    });

    it('should be safe to call when modal is already closed', () => {
      const result = modalReducer(initialState, closeModal());

      expect(result.isWarningModalOpen).toBe(false);
      expect(result.isOkClicked).toBe(false);
      expect(result.warningModalType).toBeUndefined();
    });
  });

  describe('setModalOkClicked action', () => {
    it('should set isOkClicked to true', () => {
      const result = modalReducer(initialState, setModalOkClicked());

      expect(result.isOkClicked).toBe(true);
    });

    it('should not affect isWarningModalOpen', () => {
      const openState: ModalState = {
        isWarningModalOpen: true,
        warningModalType: WarningModalState.DiscardWarning,
        isOkClicked: false,
      };

      const result = modalReducer(openState, setModalOkClicked());

      expect(result.isWarningModalOpen).toBe(true);
    });

    it('should not affect warningModalType', () => {
      const openState: ModalState = {
        isWarningModalOpen: true,
        warningModalType: WarningModalState.DiscardWarning,
        isOkClicked: false,
      };

      const result = modalReducer(openState, setModalOkClicked());

      expect(result.warningModalType).toBe(WarningModalState.DiscardWarning);
    });
  });

  describe('workflow scenarios', () => {
    it('should handle complete discard warning workflow', () => {
      // 1. Initial state
      let state = modalReducer(undefined, { type: 'unknown' });
      expect(state.isWarningModalOpen).toBe(false);

      // 2. Open discard warning
      state = modalReducer(state, openDiscardWarningModal());
      expect(state.isWarningModalOpen).toBe(true);
      expect(state.warningModalType).toBe(WarningModalState.DiscardWarning);

      // 3. User clicks OK
      state = modalReducer(state, setModalOkClicked());
      expect(state.isOkClicked).toBe(true);

      // 4. Close modal
      state = modalReducer(state, closeModal());
      expect(state.isWarningModalOpen).toBe(false);
      expect(state.isOkClicked).toBe(false);
      expect(state.warningModalType).toBeUndefined();
    });

    it('should handle cancel workflow (close without OK)', () => {
      // 1. Open discard warning
      let state = modalReducer(initialState, openDiscardWarningModal());
      expect(state.isWarningModalOpen).toBe(true);

      // 2. User cancels (close without clicking OK)
      state = modalReducer(state, closeModal());
      expect(state.isOkClicked).toBe(false);
    });
  });
});
