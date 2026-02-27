/**
 * STARFORGE TCG - Data Module Index
 */

export {
  COGSMITHS_CARDS,
  LUMINAR_CARDS,
  PYROCLAST_CARDS,
  VOIDBORN_CARDS,
  BIOTITANS_CARDS,
  CRYSTALLINE_CARDS,
  PHANTOM_CORSAIRS_CARDS,
  HIVEMIND_CARDS,
  ASTROMANCERS_CARDS,
  CHRONOBOUND_CARDS,
  NEUTRAL_CARDS,
  TOKEN_CARDS,
  ALL_SAMPLE_CARDS,
  getSampleCardsByRace,
  getCollectibleSampleCards,
  getFactionDeck,
  getStarterDeck,
  STARTER_DECK_COGSMITHS,
  STARTER_DECK_LUMINAR,
  STARTER_DECK_PYROCLAST,
  STARTER_DECK_VOIDBORN,
  STARTER_DECK_BIOTITANS,
  STARTER_DECK_CRYSTALLINE,
  STARTER_DECK_PHANTOM_CORSAIRS,
  STARTER_DECK_HIVEMIND,
  STARTER_DECK_ASTROMANCERS,
  STARTER_DECK_CHRONOBOUND,
} from './SampleCards';

// Balanced starter decks (properly balanced replacements)
export {
  BALANCED_STARTER_COGSMITHS,
  BALANCED_STARTER_LUMINAR,
  BALANCED_STARTER_PYROCLAST,
  BALANCED_STARTER_VOIDBORN,
  BALANCED_STARTER_BIOTITANS,
  BALANCED_STARTER_CRYSTALLINE,
  BALANCED_STARTER_PHANTOM_CORSAIRS,
  BALANCED_STARTER_HIVEMIND,
  BALANCED_STARTER_ASTROMANCERS,
  BALANCED_STARTER_CHRONOBOUND,
  BALANCED_STARTER_DECKS,
  getBalancedStarterDeck,
} from './BalancedStarterDecks';

// Expansion cards for post-story deckbuilding
export {
  COGSMITHS_EXPANSION,
  LUMINAR_EXPANSION,
  PYROCLAST_EXPANSION,
  VOIDBORN_EXPANSION,
  BIOTITANS_EXPANSION,
  CRYSTALLINE_EXPANSION,
  PHANTOM_CORSAIRS_EXPANSION,
  HIVEMIND_EXPANSION,
  ASTROMANCERS_EXPANSION,
  CHRONOBOUND_EXPANSION,
  NEUTRAL_EXPANSION,
  ALL_EXPANSION_CARDS,
  getExpansionCardsByRace,
} from './ExpansionCards';

// Card collection and unlock system
export {
  type PlayerCollection,
  type DeckValidation,
  type CustomDeck,
  getBasicNeutralCards,
  getAvailableCards,
  getDeckbuildingPool,
  validateDeck,
  createNewCollection,
  unlockRace,
  completeCampaign,
  saveCollection,
  loadCollection,
  saveCustomDecks,
  loadCustomDecks,
  getCollectionSummary,
  // Deckbuilding → Gameplay bridge
  buildCardLookup,
  resolveCardIds,
  getStarterDeckCardIds,
  getDeckRecipes,
  getCollectionByCategory,
} from './CardCollection';
