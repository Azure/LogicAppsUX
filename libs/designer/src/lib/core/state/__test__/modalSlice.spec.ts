import { describe, expect, it, vi } from 'vitest';
import reducer, {
  openCombineVariableModal,
  closeCombineVariableModal,
  openTriggerDescriptionModal,
  closeTriggerDescriptionModal,
} from '../modal/modalSlice';
import type { ModalState } from '../modal/modalSlice';

const initialState: ModalState = {
  isCombineVariableOpen: false,
  isTriggerDescriptionOpen: false,
};

describe('modal slice reducers', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(initialState).toEqual({
        isCombineVariableOpen: false,
        isTriggerDescriptionOpen: false,
      });
    });
  });

  describe('openCombineVariableModal', () => {
    it('should open combine variable modal and set resolve function', () => {
      const mockResolve = vi.fn();
      const action = openCombineVariableModal({ resolve: mockResolve });

      const newState = reducer(initialState, action);

      expect(newState.isCombineVariableOpen).toBe(true);
      expect(newState.resolveCombineVariable).toBe(mockResolve);
      expect(newState.isTriggerDescriptionOpen).toBe(false);
    });

    it('should handle opening modal when another modal is already open', () => {
      const initialOpenState: ModalState = {
        isCombineVariableOpen: false,
        isTriggerDescriptionOpen: true,
      };

      const mockResolve = vi.fn();
      const action = openCombineVariableModal({ resolve: mockResolve });

      const newState = reducer(initialOpenState, action);

      expect(newState.isCombineVariableOpen).toBe(true);
      expect(newState.resolveCombineVariable).toBe(mockResolve);
      expect(newState.isTriggerDescriptionOpen).toBe(true);
    });

    it('should replace existing resolve function when opened multiple times', () => {
      const firstResolve = vi.fn();
      const secondResolve = vi.fn();

      let state = reducer(initialState, openCombineVariableModal({ resolve: firstResolve }));
      state = reducer(state, openCombineVariableModal({ resolve: secondResolve }));

      expect(state.isCombineVariableOpen).toBe(true);
      expect(state.resolveCombineVariable).toBe(secondResolve);
      expect(state.resolveCombineVariable).not.toBe(firstResolve);
    });
  });

  describe('closeCombineVariableModal', () => {
    it('should close combine variable modal and call resolve function with true', () => {
      const mockResolve = vi.fn();
      const openState: ModalState = {
        isCombineVariableOpen: true,
        resolveCombineVariable: mockResolve,
        isTriggerDescriptionOpen: false,
      };

      const action = closeCombineVariableModal(true);
      const newState = reducer(openState, action);

      expect(newState.isCombineVariableOpen).toBe(false);
      expect(newState.resolveCombineVariable).toBeUndefined();
      expect(newState.isTriggerDescriptionOpen).toBe(false);
      expect(mockResolve).toHaveBeenCalledWith(true);
      expect(mockResolve).toHaveBeenCalledTimes(1);
    });

    it('should close combine variable modal and call resolve function with false', () => {
      const mockResolve = vi.fn();
      const openState: ModalState = {
        isCombineVariableOpen: true,
        resolveCombineVariable: mockResolve,
        isTriggerDescriptionOpen: false,
      };

      const action = closeCombineVariableModal(false);
      const newState = reducer(openState, action);

      expect(newState.isCombineVariableOpen).toBe(false);
      expect(newState.resolveCombineVariable).toBeUndefined();
      expect(mockResolve).toHaveBeenCalledWith(false);
      expect(mockResolve).toHaveBeenCalledTimes(1);
    });

    it('should close modal without calling resolve when no resolve function exists', () => {
      const openState: ModalState = {
        isCombineVariableOpen: true,
        isTriggerDescriptionOpen: false,
      };

      const action = closeCombineVariableModal(true);
      const newState = reducer(openState, action);

      expect(newState.isCombineVariableOpen).toBe(false);
      expect(newState.resolveCombineVariable).toBeUndefined();
      // Should not throw error when no resolve function exists
    });

    it('should close modal when already closed', () => {
      const action = closeCombineVariableModal(true);
      const newState = reducer(initialState, action);

      expect(newState.isCombineVariableOpen).toBe(false);
      expect(newState.resolveCombineVariable).toBeUndefined();
      expect(newState.isTriggerDescriptionOpen).toBe(false);
    });
  });

  describe('openTriggerDescriptionModal', () => {
    it('should open trigger description modal', () => {
      const action = openTriggerDescriptionModal();
      const newState = reducer(initialState, action);

      expect(newState.isTriggerDescriptionOpen).toBe(true);
      expect(newState.isCombineVariableOpen).toBe(false);
    });

    it('should open trigger description modal when combine variable modal is open', () => {
      const mockResolve = vi.fn();
      const combinedOpenState: ModalState = {
        isCombineVariableOpen: true,
        resolveCombineVariable: mockResolve,
        isTriggerDescriptionOpen: false,
      };

      const action = openTriggerDescriptionModal();
      const newState = reducer(combinedOpenState, action);

      expect(newState.isTriggerDescriptionOpen).toBe(true);
      expect(newState.isCombineVariableOpen).toBe(true);
      expect(newState.resolveCombineVariable).toBe(mockResolve);
    });

    it('should handle multiple opens of trigger description modal', () => {
      let state = reducer(initialState, openTriggerDescriptionModal());
      state = reducer(state, openTriggerDescriptionModal());

      expect(state.isTriggerDescriptionOpen).toBe(true);
      expect(state.isCombineVariableOpen).toBe(false);
    });
  });

  describe('closeTriggerDescriptionModal', () => {
    it('should close trigger description modal', () => {
      const openState: ModalState = {
        isCombineVariableOpen: false,
        isTriggerDescriptionOpen: true,
      };

      const action = closeTriggerDescriptionModal();
      const newState = reducer(openState, action);

      expect(newState.isTriggerDescriptionOpen).toBe(false);
      expect(newState.isCombineVariableOpen).toBe(false);
    });

    it('should close trigger description modal while keeping combine variable modal open', () => {
      const mockResolve = vi.fn();
      const bothOpenState: ModalState = {
        isCombineVariableOpen: true,
        resolveCombineVariable: mockResolve,
        isTriggerDescriptionOpen: true,
      };

      const action = closeTriggerDescriptionModal();
      const newState = reducer(bothOpenState, action);

      expect(newState.isTriggerDescriptionOpen).toBe(false);
      expect(newState.isCombineVariableOpen).toBe(true);
      expect(newState.resolveCombineVariable).toBe(mockResolve);
    });

    it('should close modal when already closed', () => {
      const action = closeTriggerDescriptionModal();
      const newState = reducer(initialState, action);

      expect(newState.isTriggerDescriptionOpen).toBe(false);
      expect(newState.isCombineVariableOpen).toBe(false);
    });
  });

  describe('edge cases and state transitions', () => {
    it('should maintain state integrity with complex modal interactions', () => {
      const mockResolve1 = vi.fn();
      const mockResolve2 = vi.fn();

      // Open combine variable modal
      let state = reducer(initialState, openCombineVariableModal({ resolve: mockResolve1 }));
      expect(state.isCombineVariableOpen).toBe(true);
      expect(state.resolveCombineVariable).toBe(mockResolve1);

      // Open trigger description modal
      state = reducer(state, openTriggerDescriptionModal());
      expect(state.isCombineVariableOpen).toBe(true);
      expect(state.isTriggerDescriptionOpen).toBe(true);
      expect(state.resolveCombineVariable).toBe(mockResolve1);

      // Replace combine variable resolve function
      state = reducer(state, openCombineVariableModal({ resolve: mockResolve2 }));
      expect(state.isCombineVariableOpen).toBe(true);
      expect(state.isTriggerDescriptionOpen).toBe(true);
      expect(state.resolveCombineVariable).toBe(mockResolve2);

      // Close trigger description modal
      state = reducer(state, closeTriggerDescriptionModal());
      expect(state.isCombineVariableOpen).toBe(true);
      expect(state.isTriggerDescriptionOpen).toBe(false);
      expect(state.resolveCombineVariable).toBe(mockResolve2);

      // Close combine variable modal
      state = reducer(state, closeCombineVariableModal(true));
      expect(state.isCombineVariableOpen).toBe(false);
      expect(state.isTriggerDescriptionOpen).toBe(false);
      expect(state.resolveCombineVariable).toBeUndefined();
      expect(mockResolve2).toHaveBeenCalledWith(true);
      expect(mockResolve1).not.toHaveBeenCalled();
    });

    it('should handle undefined state properties gracefully', () => {
      const undefinedState = {} as ModalState;

      const newState = reducer(undefinedState, openTriggerDescriptionModal());

      expect(newState.isTriggerDescriptionOpen).toBe(true);
    });
  });
});
