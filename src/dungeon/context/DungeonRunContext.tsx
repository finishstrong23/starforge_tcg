import React, { createContext, useContext } from 'react';
import type { CardInstance, CombatState, RelicDefinition, RunState } from '../types';

interface DungeonRunContextValue {
  runState: RunState | null;
  startNewRun: () => void;
  completeDraft: (deck: CardInstance[]) => void;
  travelToNode: (nodeId: string) => void;
  addRelic: (relic: RelicDefinition) => void;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => void;
  healPlayer: (amount: number) => void;
  damagePlayer: (amount: number) => void;
  addCardToDeck: (card: CardInstance) => void;
  removeCardFromDeck: (instanceId: string) => void;
  upgradeCard: (instanceId: string) => void;
  setCombatState: (state: CombatState | null) => void;
  advanceAct: () => void;
  endRun: (won: boolean) => void;
}

const DungeonRunContext = createContext<DungeonRunContextValue | null>(null);

export const DungeonRunProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Phase 5 will fill this in with real state management.
  const value: DungeonRunContextValue = {
    runState: null,
    startNewRun: () => undefined,
    completeDraft: () => undefined,
    travelToNode: () => undefined,
    addRelic: () => undefined,
    addGold: () => undefined,
    spendGold: () => undefined,
    healPlayer: () => undefined,
    damagePlayer: () => undefined,
    addCardToDeck: () => undefined,
    removeCardFromDeck: () => undefined,
    upgradeCard: () => undefined,
    setCombatState: () => undefined,
    advanceAct: () => undefined,
    endRun: () => undefined,
  };
  return <DungeonRunContext.Provider value={value}>{children}</DungeonRunContext.Provider>;
};

export const useDungeonRun = (): DungeonRunContextValue => {
  const ctx = useContext(DungeonRunContext);
  if (!ctx) throw new Error('useDungeonRun must be used inside DungeonRunProvider');
  return ctx;
};
