/**
 * STARFORGE TCG - Legal & Compliance
 *
 * Terms of Service, Privacy Policy, COPPA compliance, GDPR handling,
 * loot box probability disclosure, and content ratings.
 */

const COMPANY_NAME = 'StarForge Games';
const GAME_NAME = 'StarForge TCG';
const EFFECTIVE_DATE = '2026-03-01';
const CONTACT_EMAIL = 'legal@starforge-tcg.com';
const PRIVACY_EMAIL = 'privacy@starforge-tcg.com';

export const TERMS_OF_SERVICE = `
${GAME_NAME} — Terms of Service
Effective Date: ${EFFECTIVE_DATE}

1. ACCEPTANCE OF TERMS
By accessing or playing ${GAME_NAME}, you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.

2. ELIGIBILITY
You must be at least 13 years of age to create an account. If you are between 13 and 18, you must have parental or guardian consent. Users under 13 are not permitted to use the Service (see COPPA section).

3. ACCOUNTS
- You are responsible for maintaining the security of your account credentials.
- One account per person. Account sharing, selling, or trading is prohibited.
- We reserve the right to suspend or terminate accounts that violate these Terms.

4. VIRTUAL ITEMS AND CURRENCY
- ${GAME_NAME} offers virtual items, including cards, currency (Gold, Stardust, Nebula Gems), cosmetics, and other digital goods.
- Virtual items have no real-world monetary value and cannot be exchanged for real currency.
- Purchases of Nebula Gems are final and non-refundable except as required by applicable law.
- We reserve the right to modify virtual items for game balance purposes.

5. USER CONDUCT
You agree not to:
- Use cheats, exploits, automation, or unauthorized third-party software.
- Harass, threaten, or abuse other players.
- Engage in account sharing, boosting, or win-trading.
- Attempt to access other players' accounts.
- Reverse-engineer, decompile, or disassemble the game software.

6. INTELLECTUAL PROPERTY
All content in ${GAME_NAME}, including but not limited to artwork, music, card designs, game mechanics, and software, is owned by ${COMPANY_NAME} and protected by copyright, trademark, and other intellectual property laws.

7. IN-GAME PURCHASES
- Prices are displayed in your local currency at time of purchase.
- Random item packs (loot boxes) contain items with disclosed probabilities. See our Loot Box Disclosure for details.
- Pity timers guarantee minimum drop rates over extended play.

8. MODIFICATIONS AND TERMINATION
- We may modify, update, or discontinue any aspect of the Service at any time.
- We may terminate your account for violations of these Terms.
- Upon termination, your license to use the Service ends, including access to virtual items.

9. LIMITATION OF LIABILITY
${COMPANY_NAME} shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.

10. GOVERNING LAW
These Terms are governed by the laws of the State of Delaware, United States.

11. CONTACT
For questions about these Terms, contact: ${CONTACT_EMAIL}
`;

export const PRIVACY_POLICY = `
${GAME_NAME} — Privacy Policy
Effective Date: ${EFFECTIVE_DATE}

1. INFORMATION WE COLLECT

a) Account Information: username, email address, hashed password, display name.
b) Gameplay Data: match history, card collection, rank, achievements, win/loss statistics.
c) Payment Information: processed by third-party providers (Stripe, Apple, Google). We do not store credit card numbers.
d) Device Information: device type, operating system, IP address, for security and analytics.
e) Analytics Data: gameplay events, session length, screen views, error reports.

2. HOW WE USE YOUR INFORMATION
- To provide and improve the game experience.
- To process in-app purchases.
- To prevent cheating and enforce Terms of Service.
- To communicate service updates and promotional offers (opt-out available).
- To analyze game balance and player engagement patterns.
- To comply with legal obligations.

3. DATA SHARING
We do not sell your personal information. We may share data with:
- Payment processors (for purchase processing).
- Analytics providers (anonymized data only).
- Law enforcement (when legally required).

4. DATA RETENTION
- Account data is retained while your account is active.
- Gameplay data is retained for game balance analysis (anonymized after 2 years).
- You may request deletion of your account and associated data at any time.

5. YOUR RIGHTS (GDPR)
If you are in the European Economic Area, you have the right to:
- Access your personal data.
- Rectify inaccurate data.
- Request deletion of your data ("right to be forgotten").
- Restrict or object to data processing.
- Data portability (receive your data in machine-readable format).
- Withdraw consent at any time.

To exercise these rights, contact: ${PRIVACY_EMAIL}

6. YOUR RIGHTS (CCPA)
California residents have the right to:
- Know what personal information is collected.
- Request deletion of personal information.
- Opt out of the sale of personal information (we do not sell data).

7. CHILDREN'S PRIVACY (COPPA)
${GAME_NAME} is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we discover we have collected information from a child under 13, we will delete it promptly. Parents may contact us at ${PRIVACY_EMAIL}.

8. COOKIES AND TRACKING
We use essential cookies for authentication and session management. Analytics cookies are used to improve the game experience (opt-out available in Settings).

9. SECURITY
We implement industry-standard security measures including encryption, secure password hashing, and regular security audits to protect your data.

10. CHANGES TO THIS POLICY
We may update this Privacy Policy from time to time. We will notify you of material changes via in-game notification or email.

11. CONTACT
Data Protection Officer: ${PRIVACY_EMAIL}
General Inquiries: ${CONTACT_EMAIL}
`;

export const LOOT_BOX_DISCLOSURE = {
  title: 'Loot Box Probability Disclosure',
  effectiveDate: EFFECTIVE_DATE,
  description: `${GAME_NAME} contains randomized item packs ("loot boxes") that can be purchased with in-game currency or real money. The following probabilities apply:`,
  packs: [
    {
      name: 'Standard Pack (5 cards)',
      price: '100 Gold or 50 Nebula Gems',
      probabilities: {
        'Common': '70.0%',
        'Uncommon': '20.0%',
        'Rare': '7.5%',
        'Epic': '2.0%',
        'Legendary': '0.5%',
      },
      guarantees: [
        'Each pack guarantees at least 1 Rare or better card.',
        'Pity Timer: If you have not received a Legendary in 39 packs, your 40th pack is guaranteed to contain a Legendary.',
        'Duplicate Protection: You will not receive more than 2 copies of any Legendary card.',
      ],
    },
    {
      name: 'Faction Pack (5 cards, single faction)',
      price: '150 Gold or 75 Nebula Gems',
      probabilities: {
        'Common': '65.0%',
        'Uncommon': '22.0%',
        'Rare': '8.5%',
        'Epic': '3.0%',
        'Legendary': '1.5%',
      },
      guarantees: [
        'All cards belong to the selected faction.',
        'Pity Timer: Guaranteed Legendary within 30 faction packs.',
      ],
    },
  ],
  notes: [
    'Probabilities are per-card, applied independently to each of the 5 cards in a pack.',
    'Pity timers persist across sessions and are tracked server-side.',
    'You can craft any specific card using Stardust currency without relying on random packs.',
    'Cosmetic items (card backs, hero skins, board themes) have no gameplay effect.',
  ],
};

export const CONTENT_RATINGS = {
  esrb: { rating: 'E10+', descriptors: ['Mild Fantasy Violence', 'Users Interact', 'In-Game Purchases'] },
  pegi: { rating: '12', descriptors: ['In-Game Purchases', 'Online Gameplay'] },
  usk: { rating: '12', descriptors: ['In-Game Purchases'] },
  cero: { rating: 'B', descriptors: ['In-Game Purchases'] },
};

export const AGE_GATE = {
  minimumAge: 13,
  message: 'You must be at least 13 years old to play StarForge TCG.',
  parentalConsentAge: 18,
  parentalConsentMessage: 'Players between 13 and 17 need parental or guardian consent for in-app purchases.',
};

/**
 * Check if user meets age requirements.
 */
export function checkAge(birthYear: number): {
  allowed: boolean;
  requiresParentalConsent: boolean;
  message: string;
} {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  if (age < AGE_GATE.minimumAge) {
    return { allowed: false, requiresParentalConsent: false, message: AGE_GATE.message };
  }

  if (age < AGE_GATE.parentalConsentAge) {
    return { allowed: true, requiresParentalConsent: true, message: AGE_GATE.parentalConsentMessage };
  }

  return { allowed: true, requiresParentalConsent: false, message: '' };
}

/**
 * Get GDPR data export for a player.
 */
export function getGdprExportSchema(): string[] {
  return [
    'account_info (username, email, display_name, created_at)',
    'game_history (match results, opponents, win/loss, duration)',
    'card_collection (owned cards, crafting history)',
    'purchase_history (transactions, amounts, dates)',
    'rank_history (seasonal ranks, MMR history)',
    'achievement_progress (unlocked achievements, dates)',
    'social_data (friends list, guild membership)',
    'settings (game preferences, accessibility settings)',
  ];
}
