import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

interface ModalContextType {
  isCombineVariableOpen: boolean;
  isTriggerDescriptionOpen: boolean;
  kindChangeDialogType: string | undefined;
  closeCombineVariable: (useCombined: boolean) => void;
  openTriggerDescription: () => void;
  closeTriggerDescription: () => void;
  openKindChange: (type: string) => void;
  closeKindChange: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

// Module-level service holder for thunks that can't use React hooks
export interface ModalService {
  openCombineVariable: () => Promise<boolean>;
  openKindChange: (type: string) => void;
}

let _modalService: ModalService | null = null;
export const getModalService = (): ModalService => {
  if (!_modalService) {
    throw new Error('ModalService not initialized. Ensure ModalProvider is mounted.');
  }
  return _modalService;
};

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isCombineVariableOpen, setIsCombineVariableOpen] = useState(false);
  const [isTriggerDescriptionOpen, setIsTriggerDescriptionOpen] = useState(false);
  const [kindChangeDialogType, setKindChangeDialogType] = useState<string | undefined>(undefined);

  // Module-level ref for the combine variable resolve callback
  const combineVariableResolveRef = useRef<((useCombined: boolean) => void) | null>(null);

  const openCombineVariable = useCallback((): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      combineVariableResolveRef.current = resolve;
      setIsCombineVariableOpen(true);
    });
  }, []);

  const closeCombineVariable = useCallback((useCombined: boolean) => {
    setIsCombineVariableOpen(false);
    combineVariableResolveRef.current?.(useCombined);
    combineVariableResolveRef.current = null;
  }, []);

  const openTriggerDescription = useCallback(() => {
    setIsTriggerDescriptionOpen(true);
  }, []);

  const closeTriggerDescription = useCallback(() => {
    setIsTriggerDescriptionOpen(false);
  }, []);

  const openKindChange = useCallback((type: string) => {
    setKindChangeDialogType(type);
  }, []);

  const closeKindChange = useCallback(() => {
    setKindChangeDialogType(undefined);
  }, []);

  // Set up the module-level service for thunks
  useEffect(() => {
    _modalService = { openCombineVariable, openKindChange };
    return () => {
      _modalService = null;
    };
  }, [openCombineVariable, openKindChange]);

  const value = useMemo(
    () => ({
      isCombineVariableOpen,
      isTriggerDescriptionOpen,
      kindChangeDialogType,
      closeCombineVariable,
      openTriggerDescription,
      closeTriggerDescription,
      openKindChange,
      closeKindChange,
    }),
    [
      isCombineVariableOpen,
      isTriggerDescriptionOpen,
      kindChangeDialogType,
      closeCombineVariable,
      openTriggerDescription,
      closeTriggerDescription,
      openKindChange,
      closeKindChange,
    ]
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return context;
};

// Read hooks
export const useIsCombineVariableModalOpen = () => useModalContext().isCombineVariableOpen;
export const useIsTriggerDescriptionModalOpen = () => useModalContext().isTriggerDescriptionOpen;
export const useKindChangeDialogType = () => useModalContext().kindChangeDialogType;

// Action hooks
export const useCloseCombineVariable = () => useModalContext().closeCombineVariable;
export const useOpenTriggerDescription = () => useModalContext().openTriggerDescription;
export const useCloseTriggerDescription = () => useModalContext().closeTriggerDescription;
export const useOpenKindChange = () => useModalContext().openKindChange;
export const useCloseKindChange = () => useModalContext().closeKindChange;
