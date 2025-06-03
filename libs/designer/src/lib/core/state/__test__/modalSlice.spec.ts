import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import modalReducer, {
  openCombineVariableModal,
  closeCombineVariableModal,
  openTriggerDescriptionModal,
  closeTriggerDescriptionModal,
  type ModalState,
} from '../modal/modalSlice';

describe('modalSlice', () => {
  const initialState: ModalState = {
    isCombineVariableOpen: false,
    isTriggerDescriptionOpen: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      expect(modalReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('openCombineVariableModal', () => {
    it('should open combine variable modal and set resolve function', () => {
      const mockResolve = vi.fn();
      const action = openCombineVariableModal({ resolve: mockResolve });

      const result = modalReducer(initialState, action);

      expect(result.isCombineVariableOpen).toBe(true);
      expect(result.resolveCombineVariable).toBe(mockResolve);
      expect(result.isTriggerDescriptionOpen).toBe(false);
    });

    it('should open combine variable modal when trigger description modal is already open', () => {
      const stateWithTriggerOpen: ModalState = {
        ...initialState,
        isTriggerDescriptionOpen: true,
      };
      const mockResolve = vi.fn();
      const action = openCombineVariableModal({ resolve: mockResolve });

      const result = modalReducer(stateWithTriggerOpen, action);

      expect(result.isCombineVariableOpen).toBe(true);
      expect(result.resolveCombineVariable).toBe(mockResolve);
      expect(result.isTriggerDescriptionOpen).toBe(true);
    });

    it('should replace existing resolve function when modal is already open', () => {
      const oldResolve = vi.fn();
      const newResolve = vi.fn();
      const stateWithModalOpen: ModalState = {
        ...initialState,
        isCombineVariableOpen: true,
        resolveCombineVariable: oldResolve,
      };
      const action = openCombineVariableModal({ resolve: newResolve });

      const result = modalReducer(stateWithModalOpen, action);

      expect(result.isCombineVariableOpen).toBe(true);
      expect(result.resolveCombineVariable).toBe(newResolve);
      expect(result.resolveCombineVariable).not.toBe(oldResolve);
    });
  });

  describe('closeCombineVariableModal', () => {
    it('should close combine variable modal and call resolve function with true', () => {
      const mockResolve = vi.fn();
      const stateWithModalOpen: ModalState = {
        ...initialState,
        isCombineVariableOpen: true,
        resolveCombineVariable: mockResolve,
      };
      const action = closeCombineVariableModal(true);

      const result = modalReducer(stateWithModalOpen, action);

      expect(result.isCombineVariableOpen).toBe(false);
      expect(result.resolveCombineVariable).toBeUndefined();
      expect(mockResolve).toHaveBeenCalledWith(true);
      expect(mockResolve).toHaveBeenCalledTimes(1);
    });

    it('should close combine variable modal and call resolve function with false', () => {
      const mockResolve = vi.fn();
      const stateWithModalOpen: ModalState = {
        ...initialState,
        isCombineVariableOpen: true,
        resolveCombineVariable: mockResolve,
      };
      const action = closeCombineVariableModal(false);

      const result = modalReducer(stateWithModalOpen, action);

      expect(result.isCombineVariableOpen).toBe(false);
      expect(result.resolveCombineVariable).toBeUndefined();
      expect(mockResolve).toHaveBeenCalledWith(false);
      expect(mockResolve).toHaveBeenCalledTimes(1);
    });

    it('should close combine variable modal without calling resolve function when none exists', () => {
      const stateWithModalOpen: ModalState = {
        ...initialState,
        isCombineVariableOpen: true,
        resolveCombineVariable: undefined,
      };
      const action = closeCombineVariableModal(true);

      const result = modalReducer(stateWithModalOpen, action);

      expect(result.isCombineVariableOpen).toBe(false);
      expect(result.resolveCombineVariable).toBeUndefined();
      // No error should be thrown when resolve function doesn't exist
    });

    it('should close modal and preserve other modal states', () => {
      const mockResolve = vi.fn();
      const stateWithBothOpen: ModalState = {
        isCombineVariableOpen: true,
        resolveCombineVariable: mockResolve,
        isTriggerDescriptionOpen: true,
      };
      const action = closeCombineVariableModal(false);

      const result = modalReducer(stateWithBothOpen, action);

      expect(result.isCombineVariableOpen).toBe(false);
      expect(result.resolveCombineVariable).toBeUndefined();
      expect(result.isTriggerDescriptionOpen).toBe(true);
      expect(mockResolve).toHaveBeenCalledWith(false);
    });
  });

  describe('openTriggerDescriptionModal', () => {
    it('should open trigger description modal', () => {
      const action = openTriggerDescriptionModal();

      const result = modalReducer(initialState, action);

      expect(result.isTriggerDescriptionOpen).toBe(true);
      expect(result.isCombineVariableOpen).toBe(false);
      expect(result.resolveCombineVariable).toBeUndefined();
    });

    it('should open trigger description modal when combine variable modal is already open', () => {
      const mockResolve = vi.fn();
      const stateWithCombineOpen: ModalState = {
        isCombineVariableOpen: true,
        resolveCombineVariable: mockResolve,
        isTriggerDescriptionOpen: false,
      };
      const action = openTriggerDescriptionModal();

      const result = modalReducer(stateWithCombineOpen, action);

      expect(result.isTriggerDescriptionOpen).toBe(true);
      expect(result.isCombineVariableOpen).toBe(true);
      expect(result.resolveCombineVariable).toBe(mockResolve);
    });

    it('should remain open when already open', () => {
      const stateWithTriggerOpen: ModalState = {
        ...initialState,
        isTriggerDescriptionOpen: true,
      };
      const action = openTriggerDescriptionModal();

      const result = modalReducer(stateWithTriggerOpen, action);

      expect(result.isTriggerDescriptionOpen).toBe(true);
    });
  });

  describe('closeTriggerDescriptionModal', () => {
    it('should close trigger description modal', () => {
      const stateWithTriggerOpen: ModalState = {
        ...initialState,
        isTriggerDescriptionOpen: true,
      };
      const action = closeTriggerDescriptionModal();

      const result = modalReducer(stateWithTriggerOpen, action);

      expect(result.isTriggerDescriptionOpen).toBe(false);
      expect(result.isCombineVariableOpen).toBe(false);
      expect(result.resolveCombineVariable).toBeUndefined();
    });

    it('should close trigger description modal and preserve combine variable modal state', () => {
      const mockResolve = vi.fn();
      const stateWithBothOpen: ModalState = {
        isCombineVariableOpen: true,
        resolveCombineVariable: mockResolve,
        isTriggerDescriptionOpen: true,
      };
      const action = closeTriggerDescriptionModal();

      const result = modalReducer(stateWithBothOpen, action);

      expect(result.isTriggerDescriptionOpen).toBe(false);
      expect(result.isCombineVariableOpen).toBe(true);
      expect(result.resolveCombineVariable).toBe(mockResolve);
    });

    it('should work when modal is already closed', () => {
      const action = closeTriggerDescriptionModal();

      const result = modalReducer(initialState, action);

      expect(result.isTriggerDescriptionOpen).toBe(false);
      expect(result).toEqual(initialState);
    });
  });

  describe('modal interaction scenarios', () => {
    it('should handle opening and closing both modals in sequence', () => {
      let state = initialState;
      const mockResolve = vi.fn();

      // Open combine variable modal
      state = modalReducer(state, openCombineVariableModal({ resolve: mockResolve }));
      expect(state.isCombineVariableOpen).toBe(true);
      expect(state.isTriggerDescriptionOpen).toBe(false);

      // Open trigger description modal
      state = modalReducer(state, openTriggerDescriptionModal());
      expect(state.isCombineVariableOpen).toBe(true);
      expect(state.isTriggerDescriptionOpen).toBe(true);

      // Close combine variable modal
      state = modalReducer(state, closeCombineVariableModal(true));
      expect(state.isCombineVariableOpen).toBe(false);
      expect(state.isTriggerDescriptionOpen).toBe(true);
      expect(mockResolve).toHaveBeenCalledWith(true);

      // Close trigger description modal
      state = modalReducer(state, closeTriggerDescriptionModal());
      expect(state.isCombineVariableOpen).toBe(false);
      expect(state.isTriggerDescriptionOpen).toBe(false);
    });

    it('should handle multiple resolve function changes', () => {
      let state = initialState;
      const firstResolve = vi.fn();
      const secondResolve = vi.fn();
      const thirdResolve = vi.fn();

      // Open with first resolve function
      state = modalReducer(state, openCombineVariableModal({ resolve: firstResolve }));
      expect(state.resolveCombineVariable).toBe(firstResolve);

      // Replace with second resolve function
      state = modalReducer(state, openCombineVariableModal({ resolve: secondResolve }));
      expect(state.resolveCombineVariable).toBe(secondResolve);

      // Replace with third resolve function
      state = modalReducer(state, openCombineVariableModal({ resolve: thirdResolve }));
      expect(state.resolveCombineVariable).toBe(thirdResolve);

      // Close and verify only the last resolve function is called
      state = modalReducer(state, closeCombineVariableModal(false));
      expect(firstResolve).not.toHaveBeenCalled();
      expect(secondResolve).not.toHaveBeenCalled();
      expect(thirdResolve).toHaveBeenCalledWith(false);
    });
  });
});
