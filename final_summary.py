import re

with open('src/data/SampleCards.ts', 'r') as f:
    content = f.read()

lines = content.split('\n')

decks_info = [
    ('COGSMITHS', 12620, 13106),
    ('LUMINAR', 13110, 13567),
    ('PYROCLAST', 13571, 13983),
    ('VOIDBORN', 13987, 14495),
    ('BIOTITANS', 14495, 15006),
    ('CRYSTALLINE', 15006, 15473),
    ('PHANTOM_CORSAIRS', 15477, 15989),
    ('HIVEMIND', 15989, 16521),
    ('ASTROMANCERS', 16521, 17016),
    ('CHRONOBOUND', 17016, 17520),
]

def analyze_deck(start_idx, end_idx):
    deck_lines = lines[start_idx:end_idx]
    deck_text = '\n'.join(deck_lines)
    
    # Count total cards
    cards = re.findall(r'id:\s*[\'"][\w_]+[\'"]', deck_text)
    total = len(cards)
    
    # Count card types
    minions = len(re.findall(r'type:\s*CardType\.MINION', deck_text))
    spells = len(re.findall(r'type:\s*CardType\.SPELL', deck_text))
    structures = len(re.findall(r'type:\s*CardType\.STRUCTURE', deck_text))
    
    # Count starforge blocks
    starforge = len(re.findall(r'starforge:\s*\{', deck_text))
    
    # Build mana curve
    costs = re.findall(r'cost:\s*(\d+)', deck_text)
    curve = {i: 0 for i in range(1, 10)}
    
    for cost_str in costs:
        cost = int(cost_str)
        if cost >= 8:
            curve[9] += 1
        else:
            curve[cost] += 1
    
    return {
        'total': total,
        'minions': minions,
        'spells': spells,
        'structures': structures,
        'starforge': starforge,
        'curve': [curve[i] for i in range(1, 10)]  # 1-cost through 8+cost
    }

# Analyze all decks
results = {}
for name, start, end in decks_info:
    results[name] = analyze_deck(start, end)

# Create comprehensive table
print("\n" + "█" * 200)
print("█" + " " * 198 + "█")
print("█" + " " * 60 + "STARFORGE TCG - STARTER DECK ANALYSIS" + " " * 102 + "█")
print("█" + " " * 198 + "█")
print("█" * 200)
print()

# Main summary table
print(f"{'DECK':<20} {'TOTAL':<8} {'MINIONS':<9} {'SPELLS':<9} {'STRUCTS':<9} {'STARFORGE':<10} ", 
      f"{'1-COST':<7} {'2-COST':<7} {'3-COST':<7} {'4-COST':<7} {'5-COST':<7} {'6-COST':<7} {'7-COST':<7} {'8-COST':<7} {'8+-COST':<7}")
print("-" * 200)

for deck_name, _, _ in decks_info:
    data = results[deck_name]
    curve_str = " ".join([f"{count:<7}" for count in data['curve']])
    print(f"{deck_name:<20} {data['total']:<8} {data['minions']:<9} {data['spells']:<9} "
          f"{data['structures']:<9} {data['starforge']:<10} {curve_str}")

print("-" * 200)

# Summary statistics
total_all = sum(r['total'] for r in results.values())
total_minions = sum(r['minions'] for r in results.values())
total_spells = sum(r['spells'] for r in results.values())
total_structures = sum(r['structures'] for r in results.values())
total_starforge = sum(r['starforge'] for r in results.values())

all_curves = [sum(results[d]['curve'][i] for d, _, _ in decks_info) for i in range(9)]
curve_str = " ".join([f"{count:<7}" for count in all_curves])

print(f"{'TOTALS':<20} {total_all:<8} {total_minions:<9} {total_spells:<9} "
      f"{total_structures:<9} {total_starforge:<10} {curve_str}")

print()
print("█" * 200)
print()

# Summary statistics
avg_total = total_all / 10
avg_minions = total_minions / 10
avg_spells = total_spells / 10
avg_structures = total_structures / 10
avg_starforge = total_starforge / 10

print("KEY STATISTICS:")
print("-" * 100)
print(f"Average Deck Size:           {avg_total:.1f} cards")
print(f"Average Minions per Deck:    {avg_minions:.1f}")
print(f"Average Spells per Deck:     {avg_spells:.1f}")
print(f"Average Structures per Deck: {avg_structures:.1f}")
print(f"Average Starforge Cards:     {avg_starforge:.1f}")
print()

print("MANA DISTRIBUTION:")
print("-" * 100)
for i in range(9):
    cost_label = f"{i+1}-Cost" if i < 8 else "8+ Cost"
    count = all_curves[i]
    pct = (count / total_all) * 100
    print(f"{cost_label:<12} {count:<4} cards ({pct:5.1f}%)")

print()
print("DECK SIZE VARIANCE:")
print("-" * 100)
min_deck = min((name, data['total']) for name, data in results.items())
max_deck = max((name, data['total']) for name, data in results.items())
print(f"Smallest Deck: {min_deck[0]:<20} ({min_deck[1]} cards)")
print(f"Largest Deck:  {max_deck[0]:<20} ({max_deck[1]} cards)")
print(f"Difference:    {max_deck[1] - min_deck[1]} cards")

print()
print("CARD TYPE PERCENTAGES (Overall):")
print("-" * 100)
print(f"Minions:    {(total_minions/total_all)*100:5.1f}% ({total_minions} cards)")
print(f"Spells:     {(total_spells/total_all)*100:5.1f}% ({total_spells} cards)")
print(f"Structures: {(total_structures/total_all)*100:5.1f}% ({total_structures} cards)")

print()
print("STARFORGE CARDS:")
print("-" * 100)
decks_with_starforge = [(name, results[name]['starforge']) for name, _, _ in decks_info if results[name]['starforge'] > 0]
decks_without = [(name, results[name]['starforge']) for name, _, _ in decks_info if results[name]['starforge'] == 0]

print(f"Decks WITH Starforge cards ({len(decks_with_starforge)}):")
for name, count in sorted(decks_with_starforge):
    print(f"  - {name:<20} {count} Starforge card(s)")

print()
print(f"Decks WITHOUT Starforge cards ({len(decks_without)}):")
for name, count in sorted(decks_without):
    print(f"  - {name:<20} (0 Starforge cards)")

