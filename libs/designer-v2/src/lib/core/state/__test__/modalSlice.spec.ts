/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import {
  ModalProvider,
  useIsCombineVariableModalOpen,
  useIsTriggerDescriptionModalOpen,
  useKindChangeDialogType,
  useCloseCombineVariable,
  useOpenTriggerDescription,
  useCloseTriggerDescription,
  useOpenKindChange,
  useCloseKindChange,
  getModalService,
} from '../modal/ModalContext';

const wrapper = ({ children }: { children: React.ReactNode }) => createElement(ModalProvider, null, children);

describe('ModalContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have all modals closed initially', () => {
      const { result } = renderHook(
        () => ({
          isCombineOpen: useIsCombineVariableModalOpen(),
          isTriggerOpen: useIsTriggerDescriptionModalOpen(),
          kindChangeType: useKindChangeDialogType(),
        }),
        { wrapper }
      );

      expect(result.current.isCombineOpen).toBe(false);
      expect(result.current.isTriggerOpen).toBe(false);
      expect(result.current.kindChangeType).toBeUndefined();
    });
  });

  describe('combine variable modal', () => {
    it('should open via getModalService and resolve with true on close', async () => {
      const { result } = renderHook(
        () => ({
          isOpen: useIsCombineVariableModalOpen(),
          close: useCloseCombineVariable(),
        }),
        { wrapper }
      );

      let resolvedValue: boolean | undefined;
      act(() => {
        getModalService()
          .openCombineVariable()
          .then((v) => {
            resolvedValue = v;
          });
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.close(true);
      });

      expect(result.current.isOpen).toBe(false);
      // Allow microtask to resolve
      await vi.waitFor(() => expect(resolvedValue).toBe(true));
    });

    it('should resolve with false when closed with false', async () => {
      const { result } = renderHook(
        () => ({
          isOpen: useIsCombineVariableModalOpen(),
          close: useCloseCombineVariable(),
        }),
        { wrapper }
      );

      let resolvedValue: boolean | undefined;
      act(() => {
        getModalService()
          .openCombineVariable()
          .then((v) => {
            resolvedValue = v;
          });
      });

      act(() => {
        result.current.close(false);
      });

      await vi.waitFor(() => expect(resolvedValue).toBe(false));
    });
  });

  describe('trigger description modal', () => {
    it('should open and close trigger description modal', () => {
      const { result } = renderHook(
        () => ({
          isOpen: useIsTriggerDescriptionModalOpen(),
          open: useOpenTriggerDescription(),
          close: useCloseTriggerDescription(),
        }),
        { wrapper }
      );

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('kind change dialog', () => {
    it('should open and close kind change dialog', () => {
      const { result } = renderHook(
        () => ({
          type: useKindChangeDialogType(),
          open: useOpenKindChange(),
          close: useCloseKindChange(),
        }),
        { wrapper }
      );

      expect(result.current.type).toBeUndefined();

      act(() => {
        result.current.open('toA2A');
      });
      expect(result.current.type).toBe('toA2A');

      act(() => {
        result.current.close();
      });
      expect(result.current.type).toBeUndefined();
    });

    it('should open via getModalService', () => {
      const { result } = renderHook(
        () => ({
          type: useKindChangeDialogType(),
          close: useCloseKindChange(),
        }),
        { wrapper }
      );

      act(() => {
        getModalService().openKindChange('fromStateless');
      });
      expect(result.current.type).toBe('fromStateless');

      act(() => {
        result.current.close();
      });
      expect(result.current.type).toBeUndefined();
    });
  });

  describe('modal interaction scenarios', () => {
    it('should handle opening and closing both modals in sequence', async () => {
      const { result } = renderHook(
        () => ({
          isCombineOpen: useIsCombineVariableModalOpen(),
          isTriggerOpen: useIsTriggerDescriptionModalOpen(),
          closeCombine: useCloseCombineVariable(),
          openTrigger: useOpenTriggerDescription(),
          closeTrigger: useCloseTriggerDescription(),
        }),
        { wrapper }
      );

      // Open combine variable modal
      let resolvedValue: boolean | undefined;
      act(() => {
        getModalService()
          .openCombineVariable()
          .then((v) => {
            resolvedValue = v;
          });
      });
      expect(result.current.isCombineOpen).toBe(true);
      expect(result.current.isTriggerOpen).toBe(false);

      // Open trigger description modal
      act(() => {
        result.current.openTrigger();
      });
      expect(result.current.isCombineOpen).toBe(true);
      expect(result.current.isTriggerOpen).toBe(true);

      // Close combine variable modal
      act(() => {
        result.current.closeCombine(true);
      });
      expect(result.current.isCombineOpen).toBe(false);
      expect(result.current.isTriggerOpen).toBe(true);
      await vi.waitFor(() => expect(resolvedValue).toBe(true));

      // Close trigger description modal
      act(() => {
        result.current.closeTrigger();
      });
      expect(result.current.isCombineOpen).toBe(false);
      expect(result.current.isTriggerOpen).toBe(false);
    });
  });
});
