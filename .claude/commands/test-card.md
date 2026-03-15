Analyze and test the card "$ARGUMENTS" end-to-end.

1. Find the card definition in src/data/SampleCards.ts or src/data/ExpansionCards.ts
2. Show the full card stats: name, cost, attack, health, type, race, rarity, keywords, effects, cardText
3. Trace each effect through src/engine/EffectResolver.ts to verify it would execute correctly
4. Check if the card has DEPLOY effects — verify they trigger ON_PLAY
5. Check if the card has LAST_WORDS effects — verify they trigger ON_DEATH
6. Check if the card has keywords — verify they exist in the Keywords.ts enums
7. If the card has STARFORGE transformation, verify the transform target card exists
8. Report: what works, what's broken, and suggest fixes
