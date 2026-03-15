Regenerate card definitions from the v2 Excel files.

1. Check that the Excel files exist in new-cards/ directory
2. Check that scripts/convert-v2-cards.py exists
3. Run: `python3 scripts/convert-v2-cards.py`
4. Review the generated src/data/SampleCards.ts for any issues
5. Run TypeScript type check to verify the output compiles
6. Show a summary of cards generated per faction
