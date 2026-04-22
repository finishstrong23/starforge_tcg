import openpyxl
import json
import os
import re
import sys

BASE = '/home/user/starforge_tcg/docs/roguelite/factions/'
OUT = '/home/user/starforge_tcg/src/roguelite/cards/'
os.makedirs(OUT, exist_ok=True)

FACTIONS = [
    ('pyroclast', 'Pyroclast', 'pyroclast.ts'),
    ('luminar', 'Luminar', 'luminar.ts'),
    ('cogsmiths', 'Cogsmiths', 'cogsmiths.ts'),
    ('warp-riders', 'WarpRiders', 'warp_riders.ts'),
]

# ─── Evolution trigger classification ──────────────────────────────────────
def classify_trigger(text):
    t = text.lower().strip()
    # Extract first integer
    m = re.search(r'\d+', t)
    threshold = int(m.group()) if m else 1
    # Heuristic order matters — more specific first
    if 'rifts' in t and 'opened' in t:
        return 'rift_open_count', threshold
    if 'attached' in t:
        return 'attach_count', threshold
    if 'released at' in t and 'lumens' in t:
        return 'release_with_condition', threshold
    if 'released' in t and 'times' in t:
        return 'release_count', threshold
    if 'survived' in t and 'combats' in t:
        return 'survived_combats', threshold
    if 'survived' in t and 'attacks' in t:
        return 'survived_attacks', threshold
    if 'revived' in t:
        return 'revived', 1
    if 'killed' in t:
        return 'kill_count', threshold
    if 'drew' in t and 'via this' in t:
        return 'draw_via_this', threshold
    if 'held' in t and 'then played' in t:
        return 'hold_then_play', threshold
    if 'held' in t and 'turn' in t:
        return 'hold_turns', threshold
    if 'played in all' in t and 'states' in t:
        return 'play_all_flux_states', 1
    if 'played in' in t and 'boss' in t:
        return 'play_in_boss', threshold
    if 'triggered with' in t:
        return 'trigger_with_condition', threshold
    if 'triggered' in t and 'outcome' in t:
        return 'trigger_with_condition', threshold
    if 'triggered' in t:
        return 'trigger_count', threshold
    if 'used ability' in t:
        return 'ability_use_count', threshold
    # Anything with "played" and a qualifier is play_with_condition
    played_qualifiers = [
        'at heat', 'with heat', 'at full hp', 'spending heat',
        'triggering ignite', 'with no self-damage', 'with 2 augments',
        'with 4+', 'double hits', 'with 3+'
    ]
    if 'played' in t and any(q in t for q in played_qualifiers):
        return 'play_with_condition', threshold
    if 'played' in t:
        return 'play_count', threshold
    # Fallback
    return 'play_count', threshold

# ─── Cogsmith Augment category detection ────────────────────────────────────
def augment_category(name):
    # name like "Augment: Edge", "Augment: Exotic Core"
    m = re.match(r'Augment:\s*(.+)', name)
    if not m: return None
    cat = m.group(1).strip().lower().replace(' ', '_')
    mapping = {
        'edge': 'edge',
        'plate': 'plate',
        'jolt': 'jolt',
        'core': 'core',
        'gyro': 'gyro',
        'bulwark': 'bulwark',
        'amp': 'amp',
        'exotic_core': 'exotic_core',
        'inverter': 'inverter',
    }
    return mapping.get(cat)

# ─── Warp Rider Flux state extraction ───────────────────────────────────────
# Effect pattern: "Flux. A: ... B: ... C: ..." (ending with period)
FLUX_RE = re.compile(
    r'Flux\.\s*A:\s*(.+?)\s*B:\s*(.+?)\s*C:\s*(.+?)\.?\s*$',
    re.DOTALL | re.IGNORECASE
)

def extract_flux_states(effect_text):
    if not effect_text or 'Flux' not in effect_text or not effect_text.strip().lower().startswith('flux'):
        return None
    m = FLUX_RE.search(effect_text.strip())
    if not m:
        return None
    def clean(s):
        s = s.strip().rstrip('.').strip()
        return s + '.'
    return {'A': clean(m.group(1)), 'B': clean(m.group(2)), 'C': clean(m.group(3))}

# ─── TypeScript emission ────────────────────────────────────────────────────
def ts_escape(s):
    if s is None: return "''"
    return "'" + str(s).replace('\\', '\\\\').replace("'", "\\'") + "'"

def emit_card_ts(card):
    """Emit one Card object literal."""
    lines = ['  {']
    lines.append(f"    id: {ts_escape(card['id'])},")
    lines.append(f"    name: {ts_escape(card['name'])},")
    lines.append(f"    rarity: {ts_escape(card['rarity'])},")
    lines.append(f"    type: {ts_escape(card['type'])},")
    lines.append(f"    cost: {card['cost']},")
    lines.append(f"    description: {ts_escape(card['description'])},")
    lines.append(f"    archetype: {ts_escape(card['archetype'])},")
    lines.append(f"    factionId: {ts_escape(card['factionId'])},")
    if card.get('basedOn'):
        lines.append(f"    basedOn: {ts_escape(card['basedOn'])},")
    if card.get('augmentCategory'):
        lines.append(f"    augmentCategory: {ts_escape(card['augmentCategory'])},")
    if card.get('fluxStates'):
        fs = card['fluxStates']
        lines.append("    fluxStates: {")
        lines.append(f"      A: {ts_escape(fs['A'])},")
        lines.append(f"      B: {ts_escape(fs['B'])},")
        lines.append(f"      C: {ts_escape(fs['C'])},")
        lines.append("    },")
    if card.get('evolutionRule'):
        er = card['evolutionRule']
        lines.append("    evolutionRule: {")
        lines.append(f"      triggerType: {ts_escape(er['triggerType'])},")
        lines.append(f"      threshold: {er['threshold']},")
        lines.append(f"      conditionText: {ts_escape(er['conditionText'])},")
        lines.append(f"      evolvesTo: {ts_escape(er['evolvesTo'])},")
        lines.append(f"      evolvedDescription: {ts_escape(er['evolvedDescription'])},")
        lines.append("    },")
    lines.append('  },')
    return '\n'.join(lines)

# ─── Main ───────────────────────────────────────────────────────────────────
summary = {}
for slug, fid, outname in FACTIONS:
    wb = openpyxl.load_workbook(os.path.join(BASE, f'{slug}-cards.xlsx'), data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]
    cards = []
    for r in rows[1:]:
        if r[0] is None: continue
        cards.append(dict(zip(header, r)))

    base_cards_ts = []
    evolved_cards_ts = []
    faction_summary = {'base': 0, 'evolved': 0, 'flux_cards': 0, 'augments': 0}

    for c in cards:
        cid = c['ID']
        name = c['Name']
        rarity = c['Rarity']
        ctype = c['Type']
        cost = int(c['Cost']) if c['Cost'] is not None else 0
        desc = c['Effect'] or ''
        archetype = c['Archetype'] or ''
        evtr = c['Evolution Trigger']
        evto = c['Evolves Into']
        eveff = c['Evolved Effect'] or ''

        base_card = {
            'id': cid,
            'name': name,
            'rarity': rarity,
            'type': ctype,
            'cost': cost,
            'description': desc,
            'archetype': archetype,
            'factionId': fid,
        }

        # Cogsmiths: augment category
        if fid == 'Cogsmiths' and ctype == 'Augment':
            ac = augment_category(name)
            if ac:
                base_card['augmentCategory'] = ac
                faction_summary['augments'] += 1

        # Warp Riders: Flux states
        if fid == 'WarpRiders':
            fs = extract_flux_states(desc)
            if fs:
                base_card['fluxStates'] = fs
                faction_summary['flux_cards'] += 1

        # Evolution rule on base card
        evolved_id = f"{cid}-EVOLVED"
        if evtr and evto:
            trigger_type, threshold = classify_trigger(evtr)
            base_card['evolutionRule'] = {
                'triggerType': trigger_type,
                'threshold': threshold,
                'conditionText': evtr,
                'evolvesTo': evolved_id,
                'evolvedDescription': eveff,
            }

        # Evolved card entry — same shape but with basedOn, evolved name/desc,
        # no further evolutionRule. Keep type/rarity/cost/archetype/faction from base.
        evolved_card = {
            'id': evolved_id,
            'name': evto if evto else f"{name} (Evolved)",
            'rarity': rarity,
            'type': ctype,
            'cost': cost,
            'description': eveff or desc,
            'archetype': archetype,
            'factionId': fid,
            'basedOn': cid,
        }
        if fid == 'Cogsmiths' and ctype == 'Augment':
            ac = augment_category(name)
            if ac:
                evolved_card['augmentCategory'] = ac
        if fid == 'WarpRiders':
            # Try to extract Flux states from evolved description too, if present
            efs = extract_flux_states(eveff)
            if efs:
                evolved_card['fluxStates'] = efs

        base_cards_ts.append(emit_card_ts(base_card))
        evolved_cards_ts.append(emit_card_ts(evolved_card))
        faction_summary['base'] += 1
        faction_summary['evolved'] += 1

    # Write TypeScript file
    out_path = os.path.join(OUT, outname)
    with open(out_path, 'w') as f:
        f.write(f"// Auto-generated from docs/roguelite/factions/{slug}-cards.xlsx.\n")
        f.write(f"// Do not hand-edit — re-run the generator (docs/roguelite/01-card-content-notes.md).\n\n")
        f.write("import type { Card } from '../types';\n\n")
        f.write(f"export const {fid.upper()}_BASE_CARDS: Card[] = [\n")
        f.write('\n'.join(base_cards_ts))
        f.write('\n];\n\n')
        f.write(f"export const {fid.upper()}_EVOLVED_CARDS: Card[] = [\n")
        f.write('\n'.join(evolved_cards_ts))
        f.write('\n];\n\n')
        f.write(f"export const {fid.upper()}_CARDS: Card[] = [\n")
        f.write(f"  ...{fid.upper()}_BASE_CARDS,\n")
        f.write(f"  ...{fid.upper()}_EVOLVED_CARDS,\n")
        f.write(f"];\n")

    summary[fid] = faction_summary
    print(f"Wrote {out_path}: {faction_summary}")

print("\n=== SUMMARY ===")
for fid, s in summary.items():
    print(f"  {fid}: base={s['base']} evolved={s['evolved']} flux={s.get('flux_cards', 0)} augments={s.get('augments', 0)}")
total_base = sum(s['base'] for s in summary.values())
total_evolved = sum(s['evolved'] for s in summary.values())
print(f"TOTAL: {total_base} base + {total_evolved} evolved = {total_base + total_evolved}")
