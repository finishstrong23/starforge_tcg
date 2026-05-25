import type { CardInstance, CombatState, Faction } from '../types';

export type FactionResourceTone = 'neutral' | 'good' | 'warning' | 'danger';

export interface FactionResourceRow {
  label: string;
  value: string;
  detail?: string;
  tone?: FactionResourceTone;
}

export interface FactionResourceMeter {
  label: string;
  value: number;
  max: number;
  threshold?: number;
}

export interface FactionResourceSummary {
  faction: string;
  title: string;
  accent: string;
  rows: FactionResourceRow[];
  meter?: FactionResourceMeter;
}

const FACTION_ACCENT: Record<Faction, string> = {
  Cogsmiths: '#4aa8e0',
  Pyroclast: '#ff5a2e',
  Luminar: '#f5d67a',
  WarpRiders: '#c27dff',
};

function isFaction(value: string): value is Faction {
  return value === 'Cogsmiths' || value === 'Pyroclast' || value === 'Luminar' || value === 'WarpRiders';
}

function cardsInCombat(state: CombatState): CardInstance[] {
  return [
    ...state.hand,
    ...state.drawPile,
    ...state.discardPile,
    ...state.exhaustPile,
    ...state.playerBoard,
    ...state.playerPowers,
  ];
}

function isChannel(card: CardInstance): boolean {
  return card.keywords.includes('ILLUMINATE') && /\bchannel\b/i.test(card.cardText);
}

function isFlux(card: CardInstance): boolean {
  return /^\s*flux\./i.test(card.cardText);
}

function isConstruct(card: CardInstance): boolean {
  return card.summonAutoDamage !== undefined;
}

function heatTone(heat: number): FactionResourceTone {
  if (heat >= 10) return 'danger';
  if (heat >= 6) return 'warning';
  if (heat >= 3) return 'good';
  return 'neutral';
}

function heatState(heat: number): string {
  if (heat >= 10) return 'Critical';
  if (heat >= 6) return 'Primed';
  if (heat >= 3) return 'Warming';
  return 'Cold';
}

export function getFactionResourceSummary(state: CombatState): FactionResourceSummary {
  const faction = state.playerFaction;
  const accent = isFaction(faction) ? FACTION_ACCENT[faction] : '#aaaaaa';

  if (faction === 'Pyroclast') {
    const heat = state.playerHeat;
    const spenders = cardsInCombat(state).filter((card) => /\bheat\b/i.test(card.cardText)).length;
    return {
      faction,
      title: 'Heat Engine',
      accent,
      meter: { label: 'Heat', value: Math.min(heat, 12), max: 12, threshold: 6 },
      rows: [
        { label: 'Stored', value: String(heat), detail: heatState(heat), tone: heatTone(heat) },
        { label: 'Payoffs', value: String(spenders), detail: 'cards care about Heat' },
        { label: 'Burst line', value: heat >= 6 ? 'Online' : `${Math.max(0, 6 - heat)} Heat away`, tone: heat >= 6 ? 'good' : 'neutral' },
      ],
    };
  }

  if (faction === 'Luminar') {
    const channels = state.hand.filter(isChannel);
    const totalLumens = channels.reduce((sum, card) => sum + (card.lumens ?? 0), 0);
    const brightest = channels.reduce<CardInstance | undefined>(
      (best, card) => ((card.lumens ?? 0) > (best?.lumens ?? 0) ? card : best),
      undefined,
    );
    return {
      faction,
      title: 'Lumen Choir',
      accent,
      meter: { label: 'Stored Lumens', value: Math.min(totalLumens, 12), max: 12, threshold: 4 },
      rows: [
        { label: 'Stored', value: String(totalLumens), detail: 'in hand', tone: totalLumens >= 4 ? 'good' : 'neutral' },
        { label: 'Channels', value: String(channels.length), detail: 'release targets' },
        {
          label: 'Brightest',
          value: brightest ? `${brightest.name} ${brightest.lumens ?? 0}` : 'None',
          tone: brightest && (brightest.lumens ?? 0) > 0 ? 'good' : 'neutral',
        },
      ],
    };
  }

  if (faction === 'Cogsmiths') {
    const cards = cardsInCombat(state);
    const attached = cards.reduce((sum, card) => sum + (card.augments?.length ?? 0), 0);
    const augmentedCards = cards.filter((card) => (card.augments?.length ?? 0) > 0).length;
    const constructs = state.playerBoard.filter(isConstruct);
    const augmentsInHand = state.hand.filter((card) => card.type === 'Augment').length;
    return {
      faction,
      title: 'Forge Network',
      accent,
      meter: { label: 'Installed Augments', value: Math.min(attached, 8), max: 8, threshold: 3 },
      rows: [
        { label: 'Attached', value: String(attached), detail: `${augmentedCards} card${augmentedCards === 1 ? '' : 's'}`, tone: attached >= 3 ? 'good' : 'neutral' },
        { label: 'Constructs', value: String(constructs.length), detail: constructs.length > 0 ? 'auto-fire online' : 'none active' },
        { label: 'Augment hand', value: String(augmentsInHand), detail: 'installable cards' },
      ],
    };
  }

  if (faction === 'WarpRiders') {
    const fluxCards = state.hand.filter(isFlux);
    const fluxCounts = fluxCards.reduce<Record<'A' | 'B' | 'C', number>>(
      (counts, card) => {
        if (card.fluxState) counts[card.fluxState] += 1;
        return counts;
      },
      { A: 0, B: 0, C: 0 },
    );
    const riftDetail = state.playerRifts.length > 0
      ? state.playerRifts.map((rift) => `${rift.type}:${rift.turnsRemaining}`).join(', ')
      : 'none active';
    return {
      faction,
      title: 'Rift Drift',
      accent,
      meter: { label: 'Active Rifts', value: Math.min(state.playerRifts.length, 4), max: 4, threshold: 1 },
      rows: [
        { label: 'Rifts', value: String(state.playerRifts.length), detail: riftDetail, tone: state.playerRifts.length > 0 ? 'good' : 'neutral' },
        { label: 'Flux hand', value: `A${fluxCounts.A} B${fluxCounts.B} C${fluxCounts.C}`, detail: `${fluxCards.length} shifting cards` },
        { label: 'Next shift', value: 'A>B>C', detail: 'at turn end' },
      ],
    };
  }

  return {
    faction,
    title: 'Class System',
    accent,
    rows: [
      { label: 'Faction', value: faction || 'Unknown' },
      { label: 'Resources', value: 'None' },
    ],
  };
}
