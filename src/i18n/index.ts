/**
 * STARFORGE TCG - Internationalization (i18n)
 *
 * All UI strings externalized for localization.
 * English is the launch language; additional languages loaded dynamically.
 */

export type Locale = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'ja' | 'ko' | 'zh';

export interface TranslationMap {
  // Navigation
  'nav.play': string;
  'nav.campaign': string;
  'nav.collection': string;
  'nav.shop': string;
  'nav.social': string;
  'nav.settings': string;

  // Main Menu
  'menu.title': string;
  'menu.quickPlay': string;
  'menu.ranked': string;
  'menu.casual': string;
  'menu.campaign': string;
  'menu.arena': string;
  'menu.tavernBrawl': string;
  'menu.friendlyChallenge': string;
  'menu.deckbuilder': string;
  'menu.collection': string;
  'menu.crafting': string;
  'menu.packs': string;
  'menu.shop': string;
  'menu.battlePass': string;
  'menu.achievements': string;
  'menu.dailyQuests': string;
  'menu.tournament': string;
  'menu.leaderboard': string;
  'menu.replays': string;
  'menu.spectate': string;
  'menu.settings': string;
  'menu.tutorial': string;

  // Gameplay
  'game.yourTurn': string;
  'game.opponentTurn': string;
  'game.endTurn': string;
  'game.playCard': string;
  'game.attack': string;
  'game.heroPower': string;
  'game.mulligan': string;
  'game.concede': string;
  'game.victory': string;
  'game.defeat': string;
  'game.draw': string;
  'game.mana': string;
  'game.health': string;
  'game.attackStat': string;

  // Keywords
  'keyword.guardian': string;
  'keyword.barrier': string;
  'keyword.swift': string;
  'keyword.blitz': string;
  'keyword.cloak': string;
  'keyword.doubleStrike': string;
  'keyword.drain': string;
  'keyword.lethal': string;
  'keyword.deploy': string;
  'keyword.lastWords': string;
  'keyword.salvage': string;
  'keyword.upgrade': string;
  'keyword.illuminate': string;
  'keyword.immolate': string;
  'keyword.banish': string;
  'keyword.adapt': string;
  'keyword.resonate': string;
  'keyword.phase': string;
  'keyword.swarm': string;
  'keyword.scry': string;
  'keyword.echo': string;

  // Economy
  'economy.gold': string;
  'economy.stardust': string;
  'economy.nebulaGems': string;
  'economy.buy': string;
  'economy.craft': string;
  'economy.disenchant': string;
  'economy.insufficient': string;

  // Ranks
  'rank.bronze': string;
  'rank.silver': string;
  'rank.gold': string;
  'rank.diamond': string;
  'rank.master': string;
  'rank.legend': string;

  // Settings
  'settings.title': string;
  'settings.audio': string;
  'settings.gameplay': string;
  'settings.display': string;
  'settings.accessibility': string;
  'settings.language': string;
  'settings.sfxVolume': string;
  'settings.musicVolume': string;
  'settings.muted': string;
  'settings.animationSpeed': string;
  'settings.colorblindMode': string;
  'settings.reducedMotion': string;
  'settings.textSize': string;
  'settings.highContrast': string;
  'settings.keyboardNav': string;
  'settings.screenReader': string;
  'settings.resetDefaults': string;
  'settings.back': string;

  // Common
  'common.back': string;
  'common.confirm': string;
  'common.cancel': string;
  'common.save': string;
  'common.loading': string;
  'common.error': string;
  'common.retry': string;
  'common.close': string;
  'common.search': string;
  'common.filter': string;
  'common.sort': string;
  'common.all': string;
  'common.none': string;
  'common.yes': string;
  'common.no': string;

  // Social
  'social.friends': string;
  'social.addFriend': string;
  'social.guild': string;
  'social.chat': string;
  'social.spectate': string;
  'social.shareDeck': string;

  // Legal
  'legal.tos': string;
  'legal.privacy': string;
  'legal.ageGate': string;
  'legal.ageGateMessage': string;

  [key: string]: string;
}

// English translations (launch language)
const EN: TranslationMap = {
  // Navigation
  'nav.play': 'Play',
  'nav.campaign': 'Campaign',
  'nav.collection': 'Collection',
  'nav.shop': 'Shop',
  'nav.social': 'Social',
  'nav.settings': 'Settings',

  // Main Menu
  'menu.title': 'STARFORGE',
  'menu.quickPlay': 'Quick Play',
  'menu.ranked': 'Ranked',
  'menu.casual': 'Casual',
  'menu.campaign': 'Campaign',
  'menu.arena': 'Arena',
  'menu.tavernBrawl': 'Tavern Brawl',
  'menu.friendlyChallenge': 'Friendly Challenge',
  'menu.deckbuilder': 'Deck Builder',
  'menu.collection': 'Collection',
  'menu.crafting': 'Crafting',
  'menu.packs': 'Open Packs',
  'menu.shop': 'Shop',
  'menu.battlePass': 'Battle Pass',
  'menu.achievements': 'Achievements',
  'menu.dailyQuests': 'Daily Quests',
  'menu.tournament': 'Tournament',
  'menu.leaderboard': 'Leaderboard',
  'menu.replays': 'Replays',
  'menu.spectate': 'Spectate',
  'menu.settings': 'Settings',
  'menu.tutorial': 'Tutorial',

  // Gameplay
  'game.yourTurn': 'Your Turn',
  'game.opponentTurn': "Opponent's Turn",
  'game.endTurn': 'End Turn',
  'game.playCard': 'Play Card',
  'game.attack': 'Attack',
  'game.heroPower': 'Hero Power',
  'game.mulligan': 'Mulligan',
  'game.concede': 'Concede',
  'game.victory': 'Victory!',
  'game.defeat': 'Defeat',
  'game.draw': 'Draw',
  'game.mana': 'Mana',
  'game.health': 'Health',
  'game.attackStat': 'Attack',

  // Keywords
  'keyword.guardian': 'Enemies must attack this minion first.',
  'keyword.barrier': 'Blocks the next instance of damage.',
  'keyword.swift': 'Can attack minions immediately when played.',
  'keyword.blitz': 'Can attack anything immediately when played.',
  'keyword.cloak': "Can't be targeted until it attacks.",
  'keyword.doubleStrike': 'Can attack twice per turn.',
  'keyword.drain': 'Damage dealt heals your hero.',
  'keyword.lethal': 'Any damage dealt to a minion destroys it.',
  'keyword.deploy': 'Effect triggers when played from hand.',
  'keyword.lastWords': 'Effect triggers when this minion dies.',
  'keyword.salvage': 'Last Words: Draw a card.',
  'keyword.upgrade': 'Pay extra crystals for a bonus effect.',
  'keyword.illuminate': 'Triggers whenever any healing occurs.',
  'keyword.immolate': 'Deals damage to all enemies when this dies.',
  'keyword.banish': 'Removes a card from the game permanently.',
  'keyword.adapt': 'Choose 1 of 3 random bonuses.',
  'keyword.resonate': 'Triggers whenever a spell is cast.',
  'keyword.phase': "Can't be targeted by spells.",
  'keyword.swarm': '+1/+1 for each other friendly minion.',
  'keyword.scry': 'Look at the top cards of your deck.',
  'keyword.echo': 'Can be played twice in one turn.',

  // Economy
  'economy.gold': 'Gold',
  'economy.stardust': 'Stardust',
  'economy.nebulaGems': 'Nebula Gems',
  'economy.buy': 'Buy',
  'economy.craft': 'Craft',
  'economy.disenchant': 'Disenchant',
  'economy.insufficient': 'Insufficient funds',

  // Ranks
  'rank.bronze': 'Bronze',
  'rank.silver': 'Silver',
  'rank.gold': 'Gold',
  'rank.diamond': 'Diamond',
  'rank.master': 'Master',
  'rank.legend': 'Legend',

  // Settings
  'settings.title': 'Settings',
  'settings.audio': 'Audio',
  'settings.gameplay': 'Gameplay',
  'settings.display': 'Display',
  'settings.accessibility': 'Accessibility',
  'settings.language': 'Language',
  'settings.sfxVolume': 'SFX Volume',
  'settings.musicVolume': 'Music Volume',
  'settings.muted': 'Muted',
  'settings.animationSpeed': 'Animation Speed',
  'settings.colorblindMode': 'Colorblind Mode',
  'settings.reducedMotion': 'Reduced Motion',
  'settings.textSize': 'Text Size',
  'settings.highContrast': 'High Contrast',
  'settings.keyboardNav': 'Keyboard Navigation',
  'settings.screenReader': 'Screen Reader Hints',
  'settings.resetDefaults': 'Reset to Defaults',
  'settings.back': 'Back to Menu',

  // Common
  'common.back': 'Back',
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.sort': 'Sort',
  'common.all': 'All',
  'common.none': 'None',
  'common.yes': 'Yes',
  'common.no': 'No',

  // Social
  'social.friends': 'Friends',
  'social.addFriend': 'Add Friend',
  'social.guild': 'Guild',
  'social.chat': 'Chat',
  'social.spectate': 'Spectate',
  'social.shareDeck': 'Share Deck',

  // Legal
  'legal.tos': 'Terms of Service',
  'legal.privacy': 'Privacy Policy',
  'legal.ageGate': 'Age Verification',
  'legal.ageGateMessage': 'You must be 13 or older to play StarForge TCG.',
};

// Stub translations for priority post-launch languages
const ES: Partial<TranslationMap> = {
  'menu.title': 'STARFORGE',
  'menu.quickPlay': 'Partida Rápida',
  'menu.ranked': 'Clasificatoria',
  'menu.campaign': 'Campaña',
  'game.yourTurn': 'Tu Turno',
  'game.endTurn': 'Terminar Turno',
  'game.victory': '¡Victoria!',
  'game.defeat': 'Derrota',
  'common.back': 'Volver',
  'common.confirm': 'Confirmar',
  'common.cancel': 'Cancelar',
  'settings.title': 'Ajustes',
};

const FR: Partial<TranslationMap> = {
  'menu.title': 'STARFORGE',
  'menu.quickPlay': 'Partie Rapide',
  'menu.ranked': 'Classée',
  'menu.campaign': 'Campagne',
  'game.yourTurn': 'Votre Tour',
  'game.endTurn': 'Fin de Tour',
  'game.victory': 'Victoire !',
  'game.defeat': 'Défaite',
  'common.back': 'Retour',
  'common.confirm': 'Confirmer',
  'common.cancel': 'Annuler',
  'settings.title': 'Paramètres',
};

const DE: Partial<TranslationMap> = {
  'menu.title': 'STARFORGE',
  'menu.quickPlay': 'Schnelles Spiel',
  'menu.ranked': 'Rangliste',
  'menu.campaign': 'Kampagne',
  'game.yourTurn': 'Dein Zug',
  'game.endTurn': 'Zug Beenden',
  'game.victory': 'Sieg!',
  'game.defeat': 'Niederlage',
  'common.back': 'Zurück',
  'common.confirm': 'Bestätigen',
  'common.cancel': 'Abbrechen',
  'settings.title': 'Einstellungen',
};

const JA: Partial<TranslationMap> = {
  'menu.title': 'STARFORGE',
  'menu.quickPlay': 'クイックプレイ',
  'menu.ranked': 'ランク戦',
  'menu.campaign': 'キャンペーン',
  'game.yourTurn': 'あなたのターン',
  'game.endTurn': 'ターン終了',
  'game.victory': '勝利！',
  'game.defeat': '敗北',
  'common.back': '戻る',
  'common.confirm': '確認',
  'common.cancel': 'キャンセル',
  'settings.title': '設定',
};

const KO: Partial<TranslationMap> = {
  'menu.title': 'STARFORGE',
  'menu.quickPlay': '빠른 대전',
  'menu.ranked': '랭크전',
  'menu.campaign': '캠페인',
  'game.yourTurn': '내 턴',
  'game.endTurn': '턴 종료',
  'game.victory': '승리!',
  'game.defeat': '패배',
  'common.back': '뒤로',
  'common.confirm': '확인',
  'common.cancel': '취소',
  'settings.title': '설정',
};

const ZH: Partial<TranslationMap> = {
  'menu.title': 'STARFORGE',
  'menu.quickPlay': '快速对战',
  'menu.ranked': '排位赛',
  'menu.campaign': '战役',
  'game.yourTurn': '你的回合',
  'game.endTurn': '结束回合',
  'game.victory': '胜利！',
  'game.defeat': '失败',
  'common.back': '返回',
  'common.confirm': '确认',
  'common.cancel': '取消',
  'settings.title': '设置',
};

const PT: Partial<TranslationMap> = {
  'menu.title': 'STARFORGE',
  'menu.quickPlay': 'Jogo Rápido',
  'menu.ranked': 'Ranqueada',
  'menu.campaign': 'Campanha',
  'game.yourTurn': 'Seu Turno',
  'game.endTurn': 'Finalizar Turno',
  'game.victory': 'Vitória!',
  'game.defeat': 'Derrota',
  'common.back': 'Voltar',
  'common.confirm': 'Confirmar',
  'common.cancel': 'Cancelar',
  'settings.title': 'Configurações',
};

const TRANSLATIONS: Record<Locale, TranslationMap | Partial<TranslationMap>> = {
  en: EN, es: ES, pt: PT, fr: FR, de: DE, ja: JA, ko: KO, zh: ZH,
};

const LOCALE_KEY = 'starforge_locale';
let currentLocale: Locale = 'en';

/**
 * Set the active locale.
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try { localStorage.setItem(LOCALE_KEY, locale); } catch {}
}

/**
 * Get the active locale.
 */
export function getLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (stored && TRANSLATIONS[stored]) {
      currentLocale = stored;
    }
  } catch {}
  return currentLocale;
}

/**
 * Translate a key. Falls back to English if translation is missing.
 */
export function t(key: string): string {
  const locale = getLocale();
  const translations = TRANSLATIONS[locale];
  return (translations as Record<string, string>)[key] || EN[key as keyof TranslationMap] || key;
}

/**
 * Get available locales with display names.
 */
export function getAvailableLocales(): { code: Locale; name: string; nativeName: string }[] {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文' },
  ];
}
