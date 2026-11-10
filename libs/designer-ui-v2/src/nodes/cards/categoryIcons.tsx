import type { ReactNode } from 'react';
import { AgentsFilled, AgentsRegular, FlashFilled, FlashRegular, GlobeFilled, GlobeRegular } from '@fluentui/react-icons';
import { IfIconFilled, IfIconRegular } from '../primitives/IfIcon';
import type { NodeCategory } from '../types';

/** Canonical card defaults; kind-specific control icons still use the existing explicit slots. */
export const categoryNodeIcons = {
  action: { icon: <FlashRegular />, selectedIcon: <FlashFilled /> },
  trigger: { icon: <GlobeRegular />, selectedIcon: <GlobeFilled /> },
  control: { icon: <IfIconRegular />, selectedIcon: <IfIconFilled /> },
  agent: { icon: <AgentsRegular />, selectedIcon: <AgentsFilled /> },
} as const satisfies Record<NodeCategory, { icon: ReactNode; selectedIcon: ReactNode }>;
