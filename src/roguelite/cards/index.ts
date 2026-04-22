import type { Card } from '../types';

import { PYROCLAST_BASE_CARDS, PYROCLAST_EVOLVED_CARDS, PYROCLAST_CARDS } from './pyroclast';
import { LUMINAR_BASE_CARDS, LUMINAR_EVOLVED_CARDS, LUMINAR_CARDS } from './luminar';
import { COGSMITHS_BASE_CARDS, COGSMITHS_EVOLVED_CARDS, COGSMITHS_CARDS } from './cogsmiths';
import { WARPRIDERS_BASE_CARDS, WARPRIDERS_EVOLVED_CARDS, WARPRIDERS_CARDS } from './warp_riders';
import { SIGNATURE_CARDS } from './signature_cards';

export {
  PYROCLAST_BASE_CARDS,
  PYROCLAST_EVOLVED_CARDS,
  PYROCLAST_CARDS,
  LUMINAR_BASE_CARDS,
  LUMINAR_EVOLVED_CARDS,
  LUMINAR_CARDS,
  COGSMITHS_BASE_CARDS,
  COGSMITHS_EVOLVED_CARDS,
  COGSMITHS_CARDS,
  WARPRIDERS_BASE_CARDS,
  WARPRIDERS_EVOLVED_CARDS,
  WARPRIDERS_CARDS,
  SIGNATURE_CARDS,
};

export { STARTER_DECKS } from './starter_decks';

// Flat index of every roguelite card in the game. 324 entries:
//   160 base (40 per faction)
// + 160 evolved
// + 4 starter signature Powers
// = 324.
export const ALL_ROGUELITE_CARDS: Card[] = [
  ...PYROCLAST_CARDS,
  ...LUMINAR_CARDS,
  ...COGSMITHS_CARDS,
  ...WARPRIDERS_CARDS,
  ...SIGNATURE_CARDS,
];

export const CARD_BY_ID: Map<string, Card> = new Map(
  ALL_ROGUELITE_CARDS.map((c) => [c.id, c]),
);
