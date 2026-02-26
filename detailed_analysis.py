import re

with open('src/data/SampleCards.ts', 'r') as f:
    content = f.read()

lines = content.split('\n')

decks = {
    'COGSMITHS': (12620, 13106),
    'LUMINAR': (13110, 13567),
    'PYROCLAST': (13571, 13983),
    'VOIDBORN': (13987, 14495),
    'BIOTITANS': (14495, 15006),
    'CRYSTALLINE': (15006, 15473),
    'PHANTOM_CORSAIRS': (15477, 15989),
    'HIVEMIND': (15989, 16521),
    'ASTROMANCERS': (16521, 17016),
    'CHRONOBOUND': (17016, 17520),
}

def analyze_detailed(name, start_idx, end_idx):
    deck_lines = lines[start_idx:end_idx]
    deck_text = '\n'.join(deck_lines)
    
    # Count cards by counting id entries
    cards = re.findall(r'id:\s*[\'"][\w_]+[\'"]', deck_text)
    total = len(cards)
    
    # Count types
    minions = len(re.findall(r'type:\s*CardType\.MINION', deck_text))
    spells = len(re.findall(r'type:\s*CardType\.SPELL', deck_text))
    structures = len(re.findall(r'type:\s*CardType\.STRUCTURE', deck_text))
    
    # Count starforge
    starforge = len(re.findall(r'starforge:\s*\{', deck_text))
    
    # Mana curve
    costs = re.findall(r'cost:\s*(\d+)', deck_text)
    curve = {str(i): 0 for i in range(1, 9)}
    curve['8+'] = 0
    
    for cost_str in costs:
        cost = int(cost_str)
        if cost >= 8:
            curve['8+'] += 1
        else:
            curve[str(cost)] += 1
    
    return {
        'total': total,
        'minions': minions,
        'spells': spells,
        'structures': structures,
        'starforge': starforge,
        'curve': curve
    }

# Get all decks
all_results = []
for name, (start, end) in [
    ('COGSMITHS', decks['COGSMITHS']),
    ('LUMINAR', decks['LUMINAR']),
    ('PYROCLAST', decks['PYROCLAST']),
    ('VOIDBORN', decks['VOIDBORN']),
    ('BIOTITANS', decks['BIOTITANS']),
    ('CRYSTALLINE', decks['CRYSTALLINE']),
    ('PHANTOM_CORSAIRS', decks['PHANTOM_CORSAIRS']),
    ('HIVEMIND', decks['HIVEMIND']),
    ('ASTROMANCERS', decks['ASTROMANCERS']),
    ('CHRONOBOUND', decks['CHRONOBOUND']),
]:
    result = analyze_detailed(name, start, end)
    all_results.append((name, result))

# Print summary table
print("\n" + "="*150)
print("STARFORGE TCG - STARTER DECK ANALYSIS SUMMARY")
print("="*150)
print()

# Table header
print(f"{'Deck':<20} {'Total':<8} {'Minion':<8} {'Spell':<8} {'Struct':<8} {'Starforge':<12} ", end="")
print("Mana Curve (1-8+)")
print("-"*150)

# Table data
for name, result in all_results:
    curve = result['curve']
    curve_str = " ".join([f"{curve[str(i)]}" for i in range(1, 9)] + [str(curve['8+'])])
    
    print(f"{name:<20} {result['total']:<8} {result['minions']:<8} {result['spells']:<8} "
          f"{result['structures']:<8} {result['starforge']:<12} {curve_str}")

print()
print("="*150)
print("\nDetailed Mana Curve Analysis:")
print("-"*150)
print(f"{'Deck':<20}", end="")
for i in range(1, 9):
    print(f"{i}C", end="   ")
print("8+C")
print("-"*150)

for name, result in all_results:
    curve = result['curve']
    print(f"{name:<20}", end="")
    for i in range(1, 9):
        print(f"{curve[str(i)]:<3}", end="   ")
    print(curve['8+'])

