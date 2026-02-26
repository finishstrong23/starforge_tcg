import re
import json

# Read the file
with open('src/data/SampleCards.ts', 'r') as f:
    content = f.read()

# Define deck ranges and names
decks = {
    'COGSMITHS': (12621, 13111),
    'LUMINAR': (13111, 13572),
    'PYROCLAST': (13572, 13988),
    'VOIDBORN': (13988, 14496),
    'BIOTITANS': (14496, 15007),
    'CRYSTALLINE': (15007, 15478),
    'PHANTOM_CORSAIRS': (15478, 15990),
    'HIVEMIND': (15990, 16522),
    'ASTROMANCERS': (16522, 17017),
    'CHRONOBOUND': (17017, 17500),  # Approximate end
}

lines = content.split('\n')

def analyze_deck(name, start_line, end_line):
    """Analyze a deck from start_line to end_line"""
    deck_lines = lines[start_line-1:end_line]
    deck_text = '\n'.join(deck_lines)
    
    # Count cards
    cards = re.findall(r'\{\s*id:\s*[\'"][\w_]+[\'"]', deck_text)
    total_cards = len(cards)
    
    # Count card types
    minions = len(re.findall(r'type:\s*CardType\.MINION', deck_text))
    spells = len(re.findall(r'type:\s*CardType\.SPELL', deck_text))
    structures = len(re.findall(r'type:\s*CardType\.STRUCTURE', deck_text))
    
    # Count starforge blocks
    starforge_count = len(re.findall(r'starforge:\s*\{', deck_text))
    
    # Extract mana costs
    costs = re.findall(r'cost:\s*(\d+)', deck_text)
    mana_curve = {}
    for cost in costs:
        cost_int = int(cost)
        if cost_int >= 8:
            key = '8+'
        else:
            key = str(cost_int)
        mana_curve[key] = mana_curve.get(key, 0) + 1
    
    return {
        'total_cards': total_cards,
        'minions': minions,
        'spells': spells,
        'structures': structures,
        'starforge': starforge_count,
        'mana_curve': mana_curve
    }

# Analyze all decks
results = {}
for deck_name, (start, end) in decks.items():
    results[deck_name] = analyze_deck(deck_name, start, end)

# Print results
print("STARTER DECK ANALYSIS")
print("=" * 120)
print(f"{'Deck':<18} {'Total':<8} {'Minions':<10} {'Spells':<10} {'Structures':<12} {'Starforge':<12} {'Mana Curve':<40}")
print("-" * 120)

for deck_name in ['COGSMITHS', 'LUMINAR', 'PYROCLAST', 'VOIDBORN', 'BIOTITANS', 
                   'CRYSTALLINE', 'PHANTOM_CORSAIRS', 'HIVEMIND', 'ASTROMANCERS', 'CHRONOBOUND']:
    data = results[deck_name]
    
    # Build mana curve string
    curve_parts = []
    for i in range(1, 9):
        count = data['mana_curve'].get(str(i), 0)
        curve_parts.append(f"{i}:{count}")
    curve_parts.append(f"8+:{data['mana_curve'].get('8+', 0)}")
    mana_str = " ".join(curve_parts)
    
    print(f"{deck_name:<18} {data['total_cards']:<8} {data['minions']:<10} {data['spells']:<10} "
          f"{data['structures']:<12} {data['starforge']:<12} {mana_str:<40}")

