"""
STARFORGE TCG — Full Game Engine + AI Simulator
Simulates real games with all keywords, faction mechanics, and smart AI.
"""
import json
import os
import random
import copy
import math
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Tuple
from enum import Enum


# ============================================================
# CARD & GAME DATA STRUCTURES
# ============================================================

class CardType(Enum):
    MINION = "Minion"
    SPELL = "Spell"
    STRUCTURE = "Structure"


@dataclass
class Card:
    id: str
    name: str
    faction: str
    card_type: str
    subtype: Optional[str]
    rarity: str
    cost: int
    base_attack: int
    base_health: int
    keywords: List[str]
    card_text: str
    flavor_text: str
    starforge: Optional[str]

    def copy(self):
        c = Card(
            self.id, self.name, self.faction, self.card_type, self.subtype,
            self.rarity, self.cost, self.base_attack, self.base_health,
            list(self.keywords), self.card_text, self.flavor_text, self.starforge
        )
        return c


@dataclass
class Minion:
    card: Card
    attack: int
    health: int
    max_health: int
    keywords: List[str]
    can_attack: bool = False
    attacks_this_turn: int = 0
    has_attacked: bool = False
    cloak_active: bool = False
    barrier_active: bool = False
    frozen: bool = False
    damage_taken: int = 0
    buffs_atk: int = 0
    buffs_hp: int = 0
    swarm_bonus: int = 0  # For Hivemind SWARM
    adapt_count: int = 0  # For Biotitans ADAPT
    immolate_triggered: bool = False
    resonate_count: int = 0

    @property
    def is_alive(self):
        return self.health > 0

    @property
    def effective_attack(self):
        atk = self.attack + self.swarm_bonus
        return max(0, atk)

    def has_keyword(self, kw: str) -> bool:
        return kw.upper() in [k.upper() for k in self.keywords]

    def add_keyword(self, kw: str):
        if not self.has_keyword(kw):
            self.keywords.append(kw.upper())

    def take_damage(self, amount: int) -> int:
        if amount <= 0:
            return 0
        if self.barrier_active:
            self.barrier_active = False
            return 0
        actual = min(amount, self.health)
        self.health -= amount
        self.damage_taken += amount
        return actual

    def heal(self, amount: int) -> int:
        healed = min(amount, self.max_health - self.health)
        self.health += healed
        return healed

    def buff(self, atk: int, hp: int):
        self.attack += atk
        self.health += hp
        self.max_health += hp
        self.buffs_atk += atk
        self.buffs_hp += hp


def create_minion(card: Card) -> Minion:
    kws = [k.upper() for k in card.keywords]
    m = Minion(
        card=card,
        attack=card.base_attack,
        health=card.base_health,
        max_health=card.base_health,
        keywords=kws,
        can_attack=False,
    )
    if m.has_keyword("SWIFT") or m.has_keyword("BLITZ"):
        m.can_attack = True
    if m.has_keyword("CLOAK"):
        m.cloak_active = True
    if m.has_keyword("BARRIER"):
        m.barrier_active = True
    return m


# ============================================================
# PLAYER STATE
# ============================================================

@dataclass
class Player:
    name: str
    faction: str
    deck: List[Card]
    hand: List[Card] = field(default_factory=list)
    board: List[Minion] = field(default_factory=list)
    structures: List[dict] = field(default_factory=list)
    hero_hp: int = 30
    hero_max_hp: int = 30
    crystals: int = 0
    max_crystals: int = 0
    fatigue_damage: int = 0
    cards_drawn: int = 0
    spells_cast: int = 0
    mechs_played: int = 0
    beasts_played: int = 0
    pirates_played: int = 0
    drones_summoned: int = 0
    cards_stolen: int = 0
    healing_done: int = 0
    echo_cards_played: int = 0
    adapt_count: int = 0
    scry_count: int = 0
    immolate_damage: int = 0
    banish_count: int = 0
    last_words_triggered: int = 0
    resonate_triggers: int = 0
    starforge_transformed: bool = False
    dead_minions: List[Card] = field(default_factory=list)

    @property
    def is_alive(self):
        return self.hero_hp > 0

    def draw_card(self, count: int = 1) -> List[Card]:
        drawn = []
        for _ in range(count):
            if self.deck:
                c = self.deck.pop(0)
                if len(self.hand) < 10:
                    self.hand.append(c)
                drawn.append(c)
                self.cards_drawn += 1
            else:
                self.fatigue_damage += 1
                self.hero_hp -= self.fatigue_damage
        return drawn

    def playable_cards(self) -> List[Tuple[int, Card]]:
        """Return (index, card) for cards we can afford."""
        plays = []
        for i, c in enumerate(self.hand):
            if c.cost <= self.crystals:
                if c.card_type == "Minion" and len(self.board) >= 7:
                    continue
                plays.append((i, c))
        return plays


# ============================================================
# GAME ENGINE
# ============================================================

class Game:
    MAX_TURNS = 40
    MAX_BOARD = 7

    def __init__(self, p1: Player, p2: Player, verbose: bool = False):
        self.p1 = p1
        self.p2 = p2
        self.players = [p1, p2]
        self.turn = 0
        self.current_player_idx = 0
        self.verbose = verbose
        self.game_over = False
        self.winner: Optional[Player] = None

    @property
    def current_player(self) -> Player:
        return self.players[self.current_player_idx]

    @property
    def opponent(self) -> Player:
        return self.players[1 - self.current_player_idx]

    def log(self, msg):
        if self.verbose:
            print(msg)

    def setup(self):
        random.shuffle(self.p1.deck)
        random.shuffle(self.p2.deck)
        self.p1.draw_card(3)
        self.p2.draw_card(4)

    def check_deaths(self, player: Player, opponent: Player):
        """Remove dead minions and trigger Last Words."""
        dead = [m for m in player.board if not m.is_alive]
        for m in dead:
            player.board.remove(m)
            player.dead_minions.append(m.card)
            self.trigger_last_words(player, opponent, m)

        dead_opp = [m for m in opponent.board if not m.is_alive]
        for m in dead_opp:
            opponent.board.remove(m)
            opponent.dead_minions.append(m.card)
            self.trigger_last_words(opponent, player, m)

    def trigger_last_words(self, owner: Player, enemy: Player, minion: Minion):
        if not minion.has_keyword("LAST WORDS"):
            return
        owner.last_words_triggered += 1
        text = minion.card.card_text.upper()

        if "DEAL" in text and "DAMAGE" in text:
            dmg = self._extract_number(text, after="DEAL", default=2)
            if "ALL ENEMIES" in text or "ALL ENEMY" in text:
                enemy.hero_hp -= dmg
                for m in list(enemy.board):
                    m.take_damage(dmg)
            elif "RANDOM ENEMY" in text:
                targets = [enemy] + enemy.board
                if targets:
                    t = random.choice(targets)
                    if isinstance(t, Player):
                        t.hero_hp -= dmg
                    else:
                        t.take_damage(dmg)
            else:
                enemy.hero_hp -= dmg

        if "SUMMON" in text:
            count = self._extract_number(text, after="SUMMON", default=1)
            if "DRONE" in text:
                for _ in range(min(count, self.MAX_BOARD - len(owner.board))):
                    self._summon_token(owner, "Drone", 1, 1, ["SWARM"] if owner.faction == "Hivemind" else [])
                    owner.drones_summoned += 1
            else:
                for _ in range(min(count, self.MAX_BOARD - len(owner.board))):
                    self._summon_token(owner, "Token", 1, 1, [])

        if "DRAW" in text:
            count = self._extract_number(text, after="DRAW", default=1)
            owner.draw_card(count)

    def trigger_deploy(self, player: Player, opponent: Player, minion: Minion):
        if not minion.has_keyword("DEPLOY"):
            return
        text = minion.card.card_text.upper()

        if "DEAL" in text and "DAMAGE" in text:
            dmg = self._extract_number(text, after="DEAL", default=1)
            if "ALL ENEMIES" in text or "ALL ENEMY" in text:
                opponent.hero_hp -= dmg
                for m in list(opponent.board):
                    m.take_damage(dmg)
            elif "ENEMY HERO" in text:
                opponent.hero_hp -= dmg
            elif "RANDOM ENEMY" in text:
                targets = list(opponent.board) + [opponent]
                if targets:
                    t = random.choice(targets)
                    if isinstance(t, Player):
                        t.hero_hp -= dmg
                    else:
                        t.take_damage(dmg)
            else:
                targets = list(opponent.board) + [opponent]
                if targets:
                    t = random.choice(targets)
                    if isinstance(t, Player):
                        t.hero_hp -= dmg
                    else:
                        t.take_damage(dmg)

        if "DRAW" in text:
            count = self._extract_number(text, after="DRAW", default=1)
            player.draw_card(count)

        if "SUMMON" in text:
            count = self._extract_number(text, after="SUMMON", default=1)
            if "DRONE" in text:
                for _ in range(min(count, self.MAX_BOARD - len(player.board))):
                    self._summon_token(player, "Drone", 1, 1, ["SWARM"] if player.faction == "Hivemind" else [])
                    player.drones_summoned += 1
            elif "COG" in text or "MECH" in text:
                stats = self._extract_number(text, after="SUMMON", default=1)
                for _ in range(min(count, self.MAX_BOARD - len(player.board))):
                    self._summon_token(player, "Cog-Bot", stats, stats, [])
            else:
                for _ in range(min(count, self.MAX_BOARD - len(player.board))):
                    self._summon_token(player, "Token", 1, 1, [])

        if "GAIN" in text and ("+" in text or "ATTACK" in text):
            nums = self._extract_buff(text)
            if nums:
                minion.buff(nums[0], nums[1])

        if "GIVE" in text and "FRIENDLY" in text:
            nums = self._extract_buff(text)
            if nums:
                for m in player.board:
                    if m is not minion:
                        m.buff(nums[0], nums[1])

        if "HEAL" in text:
            heal_amt = self._extract_number(text, after="HEAL", default=3)
            if "HERO" in text or "YOUR HERO" in text:
                healed = min(heal_amt, player.hero_max_hp - player.hero_hp)
                player.hero_hp += healed
                player.healing_done += healed
            elif "ALL" in text:
                for m in player.board:
                    m.heal(heal_amt)
                healed = min(heal_amt, player.hero_max_hp - player.hero_hp)
                player.hero_hp += healed
                player.healing_done += healed

        if "RETURN" in text and "HAND" in text:
            if player.board and len(player.hand) < 10:
                # Return a friendly minion (not the one just played)
                candidates = [m for m in player.board if m is not minion]
                if candidates:
                    target = random.choice(candidates)
                    player.board.remove(target)
                    returned_card = target.card.copy()
                    returned_card.cost = max(0, returned_card.cost - 1)
                    player.hand.append(returned_card)

        if "COPY" in text and "OPPONENT" in text:
            if opponent.dead_minions or opponent.hand:
                player.cards_stolen += 1

        if "BANISH" in text:
            player.banish_count += 1
            if opponent.deck:
                opponent.deck.pop(0)

        if "DISCARD" in text and "OPPONENT" in text:
            if opponent.hand:
                opponent.hand.pop(random.randint(0, len(opponent.hand) - 1))

        if "STEAL" in text:
            if opponent.hand:
                stolen = opponent.hand.pop(random.randint(0, len(opponent.hand) - 1))
                if len(player.hand) < 10:
                    player.hand.append(stolen)
                player.cards_stolen += 1

    def resolve_spell(self, player: Player, opponent: Player, card: Card):
        text = card.card_text.upper()
        player.spells_cast += 1

        # Trigger RESONATE on all friendly minions
        for m in list(player.board):
            if m.has_keyword("RESONATE"):
                self._trigger_resonate(player, opponent, m)

        if "DEAL" in text and "DAMAGE" in text:
            dmg = self._extract_number(text, after="DEAL", default=2)
            if "ALL ENEMIES" in text or "ALL ENEMY" in text:
                opponent.hero_hp -= dmg
                for m in list(opponent.board):
                    m.take_damage(dmg)
            elif "ALL MINIONS" in text:
                for m in list(player.board):
                    m.take_damage(dmg)
                for m in list(opponent.board):
                    m.take_damage(dmg)
            elif "ENEMY HERO" in text:
                opponent.hero_hp -= dmg
            elif "RANDOM ENEMY" in text:
                targets = list(opponent.board) + [opponent]
                t = random.choice(targets)
                if isinstance(t, Player):
                    t.hero_hp -= dmg
                else:
                    t.take_damage(dmg)
            else:
                # Default: damage to a target (AI will pick best)
                if opponent.board:
                    # Smart target: kill something if possible
                    target = None
                    for m in opponent.board:
                        if m.health <= dmg:
                            target = m
                            break
                    if not target:
                        target = min(opponent.board, key=lambda m: m.health)
                    target.take_damage(dmg)
                else:
                    opponent.hero_hp -= dmg

        if "DRAW" in text:
            count = self._extract_number(text, after="DRAW", default=1)
            player.draw_card(count)

        if "GIVE" in text:
            nums = self._extract_buff(text)
            if nums and player.board:
                if "ALL" in text and "FRIENDLY" in text:
                    for m in player.board:
                        m.buff(nums[0], nums[1])
                        if "BARRIER" in text:
                            m.barrier_active = True
                        if "GUARDIAN" in text:
                            m.add_keyword("GUARDIAN")
                        if "SWIFT" in text:
                            m.can_attack = True
                            m.add_keyword("SWIFT")
                elif "MECH" in text:
                    mechs = [m for m in player.board if m.card.subtype and "MECH" in m.card.subtype.upper()]
                    for m in mechs:
                        m.buff(nums[0], nums[1])
                else:
                    # Buff strongest minion
                    target = max(player.board, key=lambda m: m.attack + m.health)
                    target.buff(nums[0], nums[1])
                    if "BARRIER" in text:
                        target.barrier_active = True

        if "SUMMON" in text:
            count = self._extract_number(text, after="SUMMON", default=1)
            if "DRONE" in text:
                for _ in range(min(count, self.MAX_BOARD - len(player.board))):
                    self._summon_token(player, "Drone", 1, 1, ["SWARM"] if player.faction == "Hivemind" else [])
                    player.drones_summoned += 1
            else:
                stats = 1
                if "3/3" in card.card_text:
                    stats = 3
                elif "2/2" in card.card_text:
                    stats = 2
                for _ in range(min(count, self.MAX_BOARD - len(player.board))):
                    self._summon_token(player, "Token", stats, stats, [])

        if "HEAL" in text:
            heal_amt = self._extract_number(text, after="HEAL", default=3)
            if "ALL" in text:
                for m in player.board:
                    m.heal(heal_amt)
                healed = min(heal_amt, player.hero_max_hp - player.hero_hp)
                player.hero_hp += healed
                player.healing_done += healed
            elif "HERO" in text:
                healed = min(heal_amt, player.hero_max_hp - player.hero_hp)
                player.hero_hp += healed
                player.healing_done += healed
            elif player.board:
                target = min(player.board, key=lambda m: m.health / m.max_health)
                healed = target.heal(heal_amt)
                player.healing_done += healed

        if "DESTROY" in text and "MINION" in text:
            if opponent.board:
                if "HIGHEST" in text:
                    target = max(opponent.board, key=lambda m: m.attack)
                else:
                    target = max(opponent.board, key=lambda m: m.health)
                target.health = 0

        if "BANISH" in text:
            player.banish_count += 1
            if opponent.deck:
                count = self._extract_number(text, after="BANISH", default=1)
                for _ in range(min(count, len(opponent.deck))):
                    opponent.deck.pop(0)

        if "GAIN" in text and "CRYSTAL" in text:
            player.max_crystals = min(10, player.max_crystals + 1)

        if "FREEZE" in text:
            if opponent.board:
                if "ALL" in text:
                    for m in opponent.board:
                        m.frozen = True
                else:
                    target = max(opponent.board, key=lambda m: m.attack)
                    target.frozen = True

        # ECHO: can play again for same cost
        if "ECHO" in [k.upper() for k in card.keywords]:
            player.echo_cards_played += 1
            echo_copy = card.copy()
            if len(player.hand) < 10:
                player.hand.append(echo_copy)

        # SCRY
        if "SCRY" in text:
            scry_count = self._extract_number(text, after="SCRY", default=2)
            player.scry_count += scry_count
            # AI reorders top cards (put higher cost later, lower cost sooner)
            top = player.deck[:scry_count]
            top.sort(key=lambda c: c.cost)
            player.deck[:scry_count] = top

        self.check_deaths(player, opponent)

    def _trigger_resonate(self, player: Player, opponent: Player, minion: Minion):
        """Trigger RESONATE effect on a minion when owner casts a spell."""
        player.resonate_triggers += 1
        minion.resonate_count += 1
        text = minion.card.card_text.upper()
        if "GAIN" in text and "+" in text:
            nums = self._extract_buff(text)
            if nums:
                minion.buff(nums[0], nums[1])
        if "SUMMON" in text:
            if len(player.board) < self.MAX_BOARD:
                self._summon_token(player, "Crystal Shard", 1, 1, [])
        if "DRAW" in text:
            player.draw_card(1)
        if "DEAL" in text and "DAMAGE" in text:
            dmg = self._extract_number(text, after="DEAL", default=1)
            if opponent.board:
                t = random.choice(opponent.board)
                t.take_damage(dmg)
            else:
                opponent.hero_hp -= dmg

    def _trigger_illuminate(self, player: Player, opponent: Player):
        """Trigger ILLUMINATE on all friendly minions when healing occurs."""
        for m in list(player.board):
            if m.has_keyword("ILLUMINATE"):
                text = m.card.card_text.upper()
                if "GAIN" in text and "+" in text:
                    nums = self._extract_buff(text)
                    if nums:
                        m.buff(nums[0], nums[1])
                if "DRAW" in text:
                    player.draw_card(1)
                if "DEAL" in text:
                    dmg = self._extract_number(text, after="DEAL", default=1)
                    if opponent.board:
                        t = random.choice(opponent.board)
                        t.take_damage(dmg)
                    else:
                        opponent.hero_hp -= dmg

    def _trigger_immolate(self, player: Player, opponent: Player, minion: Minion):
        """Trigger IMMOLATE when minion takes damage."""
        if not minion.has_keyword("IMMOLATE") or not minion.is_alive:
            return
        text = minion.card.card_text.upper()
        dmg = self._extract_number(text, after="DEAL", default=1)
        player.immolate_damage += dmg
        if "ALL ENEMIES" in text:
            opponent.hero_hp -= dmg
            for m in list(opponent.board):
                m.take_damage(dmg)
        else:
            if opponent.board:
                t = random.choice(opponent.board)
                t.take_damage(dmg)
            else:
                opponent.hero_hp -= dmg

    def play_card(self, player: Player, opponent: Player, card_idx: int):
        card = player.hand.pop(card_idx)
        player.crystals -= card.cost

        if card.card_type == "Minion":
            minion = create_minion(card)

            # ADAPT (Biotitans)
            if minion.has_keyword("ADAPT"):
                self._do_adapt(player, minion)

            player.board.append(minion)

            # Track subtypes
            if card.subtype:
                if "MECH" in card.subtype.upper():
                    player.mechs_played += 1
                if "BEAST" in card.subtype.upper():
                    player.beasts_played += 1
                if "PIRATE" in card.subtype.upper():
                    player.pirates_played += 1
                if "INSECT" in card.subtype.upper():
                    player.drones_summoned += 1

            # DEPLOY
            self.trigger_deploy(player, opponent, minion)

            # Update SWARM bonuses
            self._update_swarm(player)

        elif card.card_type == "Spell":
            self.resolve_spell(player, opponent, card)

        elif card.card_type == "Structure":
            # Structures: simplified as ongoing effects
            player.structures.append({
                "card": card,
                "text": card.card_text.upper()
            })
            # Deploy effect for structures
            if "DEPLOY" in [k.upper() for k in card.keywords]:
                text = card.card_text.upper()
                if "DRAW" in text:
                    player.draw_card(1)
                if "DEAL" in text:
                    dmg = self._extract_number(text, after="DEAL", default=2)
                    if opponent.board:
                        t = random.choice(opponent.board)
                        t.take_damage(dmg)
                    else:
                        opponent.hero_hp -= dmg

        self.check_deaths(player, opponent)

    def do_combat(self, attacker_player: Player, defender_player: Player, attacker: Minion, target):
        """Resolve combat between attacker and target (Minion or Player)."""
        if attacker.cloak_active:
            attacker.cloak_active = False

        if isinstance(target, Player):
            target.hero_hp -= attacker.effective_attack
            # DRAIN
            if attacker.has_keyword("DRAIN"):
                healed = min(attacker.effective_attack, attacker_player.hero_max_hp - attacker_player.hero_hp)
                attacker_player.hero_hp += healed
                attacker_player.healing_done += healed
                if healed > 0:
                    self._trigger_illuminate(attacker_player, defender_player)
        else:
            # Minion vs Minion
            atk_dmg = attacker.effective_attack
            def_dmg = target.effective_attack

            dealt = target.take_damage(atk_dmg)
            attacker.take_damage(def_dmg)

            # LETHAL
            if attacker.has_keyword("LETHAL") and dealt > 0:
                target.health = 0
            if target.has_keyword("LETHAL") and def_dmg > 0 and not attacker.barrier_active:
                attacker.health = 0

            # DRAIN
            if attacker.has_keyword("DRAIN") and dealt > 0:
                healed = min(dealt, attacker_player.hero_max_hp - attacker_player.hero_hp)
                attacker_player.hero_hp += healed
                attacker_player.healing_done += healed
                if healed > 0:
                    self._trigger_illuminate(attacker_player, defender_player)

            # IMMOLATE triggers on taking damage
            if target.has_keyword("IMMOLATE"):
                self._trigger_immolate(defender_player, attacker_player, target)
            if attacker.has_keyword("IMMOLATE"):
                self._trigger_immolate(attacker_player, defender_player, attacker)

        attacker.has_attacked = True
        attacker.attacks_this_turn += 1

        # DOUBLE STRIKE
        if attacker.has_keyword("DOUBLE STRIKE") and attacker.attacks_this_turn == 1 and attacker.is_alive:
            attacker.has_attacked = False  # Can attack again

        self.check_deaths(attacker_player, defender_player)

    def _do_adapt(self, player: Player, minion: Minion):
        """AI chooses best ADAPT option."""
        player.adapt_count += 1
        minion.adapt_count += 1
        options = [
            ("atk", 2, 0), ("hp", 0, 2), ("both", 1, 1),
            ("lethal", 0, 0), ("swift", 0, 0), ("barrier", 0, 0)
        ]
        # Smart choice based on context
        if minion.attack >= 4:
            # Already high attack, get lethal or barrier
            choice = random.choice([("lethal", 0, 0), ("barrier", 0, 0), ("hp", 0, 2)])
        elif minion.health <= 2:
            choice = ("hp", 0, 2)
        else:
            choice = random.choice(options[:3] + [("swift", 0, 0)])

        if choice[0] == "atk":
            minion.buff(2, 0)
        elif choice[0] == "hp":
            minion.buff(0, 2)
        elif choice[0] == "both":
            minion.buff(1, 1)
        elif choice[0] == "lethal":
            minion.add_keyword("LETHAL")
        elif choice[0] == "swift":
            minion.add_keyword("SWIFT")
            minion.can_attack = True
        elif choice[0] == "barrier":
            minion.barrier_active = True
            minion.add_keyword("BARRIER")

    def _update_swarm(self, player: Player):
        """Update SWARM bonuses for Hivemind minions."""
        friendly_count = len(player.board)
        for m in player.board:
            if m.has_keyword("SWARM"):
                m.swarm_bonus = max(0, friendly_count - 1)

    def _summon_token(self, player: Player, name: str, atk: int, hp: int, keywords: List[str]):
        if len(player.board) >= self.MAX_BOARD:
            return
        token_card = Card(
            id=f"token_{name.lower()}", name=name, faction=player.faction,
            card_type="Minion", subtype=None, rarity="Token", cost=0,
            base_attack=atk, base_health=hp, keywords=keywords,
            card_text="", flavor_text="", starforge=None
        )
        m = create_minion(token_card)
        player.board.append(m)
        self._update_swarm(player)

    def process_structures(self, player: Player, opponent: Player):
        """Trigger structure effects at start of turn."""
        for s in player.structures:
            text = s["text"]
            if "DEAL" in text and "DAMAGE" in text:
                dmg = self._extract_number(text, after="DEAL", default=2)
                if opponent.board:
                    t = random.choice(opponent.board)
                    t.take_damage(dmg)
                else:
                    opponent.hero_hp -= dmg
            if "DRAW" in text and "DEPLOY" not in text:
                player.draw_card(1)
            if "SUMMON" in text and "DEPLOY" not in text:
                if "DRONE" in text:
                    if len(player.board) < self.MAX_BOARD:
                        self._summon_token(player, "Drone", 1, 1, ["SWARM"] if player.faction == "Hivemind" else [])
                        player.drones_summoned += 1
            if "HEAL" in text and "DEPLOY" not in text:
                heal = self._extract_number(text, after="HEAL", default=2)
                healed = min(heal, player.hero_max_hp - player.hero_hp)
                player.hero_hp += healed
                player.healing_done += healed
                if healed > 0:
                    self._trigger_illuminate(player, opponent)
        self.check_deaths(player, opponent)

    def check_starforge(self, player: Player, opponent: Player):
        """Check if any STARFORGE conditions are met and transform."""
        if player.starforge_transformed:
            return
        for m in list(player.board):
            sf = m.card.starforge
            if not sf:
                continue
            text = sf.upper()
            triggered = False

            if "ADAPT" in text and "TIMES" in text:
                needed = self._extract_number(text, after="AFTER", default=10)
                if player.adapt_count >= needed:
                    triggered = True
            elif "ECHO" in text:
                needed = self._extract_number(text, after="AFTER", default=30)
                if player.echo_cards_played >= needed:
                    triggered = True
            elif "LAST WORDS" in text:
                needed = self._extract_number(text, after="AFTER", default=6)
                if player.last_words_triggered >= needed:
                    triggered = True
            elif "HEALING" in text or "HEAL" in text:
                needed = self._extract_number(text, after="AFTER", default=30)
                if player.healing_done >= needed:
                    triggered = True
            elif "SCRY" in text:
                needed = self._extract_number(text, after="AFTER", default=40)
                if player.scry_count >= needed:
                    triggered = True
            elif "SPELL" in text:
                needed = self._extract_number(text, after="AFTER", default=25)
                if player.spells_cast >= needed:
                    triggered = True
            elif "BEAST" in text:
                needed = self._extract_number(text, after="AFTER", default=20)
                if player.beasts_played >= needed:
                    triggered = True
            elif "DRONE" in text:
                needed = self._extract_number(text, after="AFTER", default=30)
                if player.drones_summoned >= needed:
                    triggered = True
            elif "STOLEN" in text or "STEAL" in text:
                needed = self._extract_number(text, after="AFTER", default=10)
                if player.cards_stolen >= needed:
                    triggered = True
            elif "IMMOLATE" in text:
                needed = self._extract_number(text, after="AFTER", default=30)
                if player.immolate_damage >= needed:
                    triggered = True
            elif "BANISH" in text:
                needed = self._extract_number(text, after="AFTER", default=10)
                if player.banish_count >= needed:
                    triggered = True
            elif "DRAW" in text:
                needed = self._extract_number(text, after="AFTER", default=30)
                if player.cards_drawn >= needed:
                    triggered = True

            if triggered:
                self.log(f"  *** STARFORGE TRANSFORM: {m.card.name} ***")
                m.buff(5, 5)
                m.barrier_active = True
                m.add_keyword("BARRIER")
                m.can_attack = True
                player.starforge_transformed = True
                # Massive board buff
                for ally in player.board:
                    if ally is not m:
                        ally.buff(2, 2)
                break

    def play_turn(self, ai_func):
        """Execute one full turn."""
        player = self.current_player
        opp = self.opponent

        # Start of turn
        self.turn += 1
        player.max_crystals = min(10, player.max_crystals + 1)
        player.crystals = player.max_crystals
        player.draw_card(1)

        # Unfreeze and refresh minions
        for m in player.board:
            m.frozen = False
            m.can_attack = True
            m.has_attacked = False
            m.attacks_this_turn = 0
            if m.has_keyword("CLOAK") and m.cloak_active:
                pass  # Keep cloak
            # SWIFT/BLITZ minions from previous turn can attack
            # New minions placed this turn can't unless they have SWIFT

        # Structure effects
        self.process_structures(player, opp)

        if not opp.is_alive:
            self.game_over = True
            self.winner = player
            return

        # AI plays cards and attacks
        ai_func(self, player, opp)

        # STARFORGE check
        self.check_starforge(player, opp)

        # Update swarm
        self._update_swarm(player)
        self._update_swarm(opp)

        # End of turn check
        if not opp.is_alive:
            self.game_over = True
            self.winner = player
        elif not player.is_alive:
            self.game_over = True
            self.winner = opp

        self.current_player_idx = 1 - self.current_player_idx

    def run(self, ai_func) -> Optional[Player]:
        """Run a full game and return the winner."""
        self.setup()
        while not self.game_over and self.turn < self.MAX_TURNS * 2:
            self.play_turn(ai_func)
            if not self.p1.is_alive:
                self.winner = self.p2
                break
            if not self.p2.is_alive:
                self.winner = self.p1
                break
        return self.winner

    @staticmethod
    def _extract_number(text: str, after: str = "", default: int = 1) -> int:
        import re
        if after:
            idx = text.find(after)
            if idx >= 0:
                sub = text[idx:]
            else:
                sub = text
        else:
            sub = text
        nums = re.findall(r'\d+', sub)
        return int(nums[0]) if nums else default

    @staticmethod
    def _extract_buff(text: str) -> Optional[Tuple[int, int]]:
        import re
        m = re.search(r'\+(\d+)/\+(\d+)', text)
        if m:
            return (int(m.group(1)), int(m.group(2)))
        m = re.search(r'\+(\d+)\s*ATTACK', text)
        if m:
            return (int(m.group(1)), 0)
        m = re.search(r'\+(\d+)\s*HEALTH', text)
        if m:
            return (0, int(m.group(1)))
        return None


# ============================================================
# SMART AI — Faction-Aware Decision Making
# ============================================================

def evaluate_board(player: Player, opponent: Player) -> float:
    """Score the current board state from player's perspective."""
    score = 0.0

    # Hero HP differential
    score += (player.hero_hp - opponent.hero_hp) * 1.5

    # Board presence
    for m in player.board:
        val = m.effective_attack * 1.2 + m.health * 0.8
        if m.has_keyword("GUARDIAN"):
            val *= 1.3
        if m.has_keyword("LETHAL"):
            val *= 1.5
        if m.has_keyword("DRAIN"):
            val *= 1.2
        if m.barrier_active:
            val *= 1.2
        if m.has_keyword("DOUBLE STRIKE"):
            val *= 1.4
        score += val

    for m in opponent.board:
        val = m.effective_attack * 1.2 + m.health * 0.8
        if m.has_keyword("GUARDIAN"):
            val *= 1.3
        if m.has_keyword("LETHAL"):
            val *= 1.5
        if m.has_keyword("DRAIN"):
            val *= 1.2
        if m.barrier_active:
            val *= 1.2
        score -= val

    # Hand size advantage
    score += len(player.hand) * 0.5
    score -= len(opponent.hand) * 0.3

    # Structure advantage
    score += len(player.structures) * 2.0

    return score


def smart_ai(game: Game, player: Player, opponent: Player):
    """
    Advanced AI that understands faction strategy, tempo, value, and win conditions.
    Makes intelligent plays and combat decisions.
    """
    faction = player.faction.upper()

    # ---- PHASE 1: Play cards (smart ordering) ----
    max_plays = 8  # Safety limit
    plays_made = 0

    while plays_made < max_plays:
        playable = player.playable_cards()
        if not playable:
            break

        # Score each playable card
        best_score = -999
        best_idx = -1

        for hand_idx, card in playable:
            score = _score_play(player, opponent, card, game.turn)

            # Faction-specific bonuses
            if "HIVEMIND" in faction:
                if "SUMMON" in card.card_text.upper() and "DRONE" in card.card_text.upper():
                    score += 15
                if "SWARM" in [k.upper() for k in card.keywords]:
                    score += len(player.board) * 3

            elif "BIOTITAN" in faction:
                if "ADAPT" in [k.upper() for k in card.keywords]:
                    score += 8
                if card.subtype and "BEAST" in card.subtype.upper():
                    score += 3

            elif "COGSMITH" in faction:
                if card.subtype and "MECH" in card.subtype.upper():
                    score += 3
                if "LAST WORDS" in [k.upper() for k in card.keywords]:
                    score += 5

            elif "PYROCLAST" in faction:
                if "IMMOLATE" in [k.upper() for k in card.keywords]:
                    score += 6
                if "DAMAGE" in card.card_text.upper() and card.card_type == "Spell":
                    score += 4

            elif "LUMINAR" in faction:
                if "HEAL" in card.card_text.upper():
                    score += 5 if player.hero_hp < 20 else 2
                if "ILLUMINATE" in [k.upper() for k in card.keywords]:
                    score += 4

            elif "CRYSTALLINE" in faction:
                if card.card_type == "Spell":
                    resonate_count = sum(1 for m in player.board if m.has_keyword("RESONATE"))
                    score += resonate_count * 4
                if "RESONATE" in [k.upper() for k in card.keywords]:
                    score += 6

            elif "CHRONOBOUND" in faction:
                if "ECHO" in [k.upper() for k in card.keywords]:
                    score += 5
                if "RETURN" in card.card_text.upper():
                    score += 3

            elif "PHANTOM" in faction or "CORSAIR" in faction:
                if "CLOAK" in [k.upper() for k in card.keywords]:
                    score += 5
                if "PHASE" in [k.upper() for k in card.keywords]:
                    score += 5
                if "STEAL" in card.card_text.upper() or "COPY" in card.card_text.upper():
                    score += 8

            elif "ASTROMANCER" in faction:
                if "SCRY" in card.card_text.upper():
                    score += 4
                if "DRAW" in card.card_text.upper():
                    score += 5

            elif "VOIDBORN" in faction:
                if "BANISH" in card.card_text.upper():
                    score += 7
                if "DISCARD" in card.card_text.upper():
                    score += 5

            if score > best_score:
                best_score = score
                best_idx = hand_idx

        if best_idx < 0 or best_score < -10:
            break

        game.play_card(player, opponent, best_idx)
        plays_made += 1

        if not opponent.is_alive:
            return

    # ---- PHASE 2: Combat (smart attacks) ----
    _do_smart_attacks(game, player, opponent)


def _score_play(player: Player, opponent: Player, card: Card, turn: int) -> float:
    """Score how good it is to play this card right now."""
    score = 0.0

    # Mana efficiency — prefer spending all mana
    if card.cost > 0:
        score += card.cost * 2  # Higher cost = more impact

    if card.card_type == "Minion":
        score += (card.base_attack + card.base_health) * 1.5
        # Board is empty? Prioritize minions
        if len(player.board) == 0:
            score += 10
        # Board is full? Lower priority for minions
        if len(player.board) >= 6:
            score -= 20

        # High value keywords
        for kw in card.keywords:
            kw = kw.upper()
            if kw == "GUARDIAN" and opponent.board:
                score += 5
            elif kw == "LETHAL":
                score += 6
            elif kw == "DRAIN":
                score += 4
            elif kw == "BARRIER":
                score += 3
            elif kw == "SWIFT" or kw == "BLITZ":
                score += 4
            elif kw == "DOUBLE STRIKE":
                score += 5

    elif card.card_type == "Spell":
        text = card.card_text.upper()
        if "DEAL" in text and "DAMAGE" in text:
            if opponent.board:
                score += 8
            else:
                score += 4  # Face damage
        if "DRAW" in text:
            score += 6
        if "GIVE" in text and "ALL" in text:
            score += len(player.board) * 3
        if "DESTROY" in text:
            score += 12 if opponent.board else -10
        if "SUMMON" in text:
            score += 6

        # Don't waste AoE on empty board
        if "ALL" in text and "DAMAGE" in text and not opponent.board:
            score -= 10

    elif card.card_type == "Structure":
        score += 7  # Ongoing value

    # STARFORGE cards are high priority
    if card.starforge:
        score += 15

    # Early game: prefer low-cost cards
    if turn <= 6 and card.cost <= 3:
        score += 3

    # Legendary bonus
    if card.rarity == "Legendary":
        score += 5
    elif card.rarity == "Epic":
        score += 3

    return score


def _do_smart_attacks(game: Game, player: Player, opponent: Player):
    """Execute attacks with intelligent targeting."""
    max_attacks = 20
    attacks = 0

    while attacks < max_attacks:
        attackers = [m for m in player.board
                     if m.can_attack and not m.has_attacked and m.effective_attack > 0
                     and not m.frozen and m.is_alive]
        if not attackers:
            break

        # Check for lethal
        total_dmg = sum(m.effective_attack for m in attackers)
        guardians = [m for m in opponent.board if m.has_keyword("GUARDIAN") and not m.cloak_active]

        if not guardians and total_dmg >= opponent.hero_hp:
            # GO FACE — LETHAL!
            for m in attackers:
                if not opponent.is_alive:
                    break
                game.do_combat(player, opponent, m, opponent)
                attacks += 1
            return

        # Must attack guardians first
        if guardians:
            attacker = attackers[0]
            # Pick the guardian we can most efficiently kill
            target = _pick_best_trade(attacker, guardians)
            game.do_combat(player, opponent, attacker, target)
            attacks += 1
            continue

        # Smart trading / going face
        attacker = attackers[0]
        enemy_minions = [m for m in opponent.board if m.is_alive and not m.cloak_active]

        if enemy_minions:
            # Check if we should trade or go face
            should_trade = _should_trade(player, opponent, attacker, enemy_minions)
            if should_trade:
                target = _pick_best_trade(attacker, enemy_minions)
                game.do_combat(player, opponent, attacker, target)
            else:
                game.do_combat(player, opponent, attacker, opponent)
        else:
            game.do_combat(player, opponent, attacker, opponent)

        attacks += 1


def _should_trade(player: Player, opponent: Player, attacker: Minion, enemies: List[Minion]) -> bool:
    """Decide if we should trade or go face."""
    faction = player.faction.upper()

    # Aggressive factions go face more
    if "PYROCLAST" in faction:
        # Pyroclast goes face unless there's a huge threat
        big_threats = [m for m in enemies if m.effective_attack >= 5 or m.has_keyword("DRAIN")]
        return len(big_threats) > 0

    if "PHANTOM" in faction or "CORSAIR" in faction:
        # Corsairs are aggressive too
        return any(m.effective_attack >= 4 for m in enemies)

    # Can we make a favorable trade?
    for enemy in enemies:
        if attacker.effective_attack >= enemy.health and enemy.effective_attack < attacker.health:
            return True  # Free kill
        if enemy.has_keyword("LETHAL"):
            return True  # Must remove lethal minions
        if enemy.has_keyword("DRAIN") and enemy.effective_attack >= 3:
            return True

    # Control factions trade more
    if "LUMINAR" in faction or "CRYSTALLINE" in faction or "VOIDBORN" in faction:
        return len(enemies) > 0

    # Default: trade if enemy board is threatening
    enemy_damage = sum(m.effective_attack for m in enemies)
    return enemy_damage >= 8


def _pick_best_trade(attacker: Minion, targets: List[Minion]) -> Minion:
    """Pick the best target to attack."""
    # Priority: kill something we can kill cleanly
    killable = [t for t in targets if t.health <= attacker.effective_attack and not t.barrier_active]
    if killable:
        # Kill the most valuable target
        return max(killable, key=lambda t: t.effective_attack * 1.5 + t.health + (10 if t.has_keyword("LETHAL") else 0))

    # Otherwise hit the lowest HP target to soften it up
    return min(targets, key=lambda t: t.health)


# ============================================================
# DECK LOADING
# ============================================================

def load_faction_deck(xlsx_path: str) -> List[Card]:
    """Load cards from an Excel file and return a deck list."""
    import openpyxl
    wb = openpyxl.load_workbook(xlsx_path, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    headers = rows[0]
    cards = []

    for r in rows[1:]:
        data = dict(zip(headers, r))
        kw_str = data.get("Keywords") or ""
        keywords = [k.strip() for k in str(kw_str).split(",") if k.strip()] if kw_str else []
        # Clean keyword params like "SCRY (2)" -> "SCRY"
        clean_kw = []
        for k in keywords:
            base = k.split("(")[0].strip()
            if base:
                clean_kw.append(base)

        sf = data.get("STARFORGE")
        if sf and str(sf).strip():
            sf = str(sf).strip()
        else:
            sf = None

        card = Card(
            id=f"{data.get('#', 0)}_{str(data.get('Card Name','')).replace(' ','_').lower()}",
            name=str(data.get("Card Name", "Unknown")),
            faction=xlsx_path.split("STARFORGE_")[1].split("_v")[0] if "STARFORGE_" in xlsx_path else "Unknown",
            card_type=str(data.get("Type", "Minion")),
            subtype=str(data["Subtype"]) if data.get("Subtype") else None,
            rarity=str(data.get("Rarity", "Common")),
            cost=int(data.get("Cost", 0)),
            base_attack=int(data["Atk"]) if data.get("Atk") is not None else 0,
            base_health=int(data["HP"]) if data.get("HP") is not None else 0,
            keywords=clean_kw,
            card_text=str(data.get("Card Text", "")),
            flavor_text=str(data.get("Flavor Text", "")),
            starforge=sf,
        )
        cards.append(card)

    wb.close()
    return cards


def build_deck(cards: List[Card], deck_size: int = 30) -> List[Card]:
    """
    Build an optimized deck from a faction's card pool.
    Smart deck building: good mana curve, key synergies, win conditions.
    """
    # Always include legendaries and epics
    legendaries = [c for c in cards if c.rarity == "Legendary"]
    epics = [c for c in cards if c.rarity == "Epic"]
    rares = [c for c in cards if c.rarity == "Rare"]
    commons = [c for c in cards if c.rarity == "Common"]

    deck = []

    # Include all legendaries (they're win conditions)
    for c in legendaries:
        deck.append(c.copy())

    # Include all epics
    for c in epics:
        deck.append(c.copy())

    # Fill with rares and commons for good curve
    remaining = deck_size - len(deck)
    pool = rares + commons

    # Target curve: 15% 1-2 cost, 35% 3-4 cost, 30% 5-6 cost, 20% 7+ cost
    curve_targets = {
        (1, 2): int(remaining * 0.20),
        (3, 4): int(remaining * 0.35),
        (5, 6): int(remaining * 0.25),
        (7, 99): remaining  # Fill rest
    }

    for (lo, hi), count in curve_targets.items():
        band = [c for c in pool if lo <= c.cost <= hi and c not in deck]
        # Prefer cards with keywords and synergy
        band.sort(key=lambda c: len(c.keywords) + (2 if c.card_type == "Minion" else 1), reverse=True)
        added = 0
        for c in band:
            if len(deck) >= deck_size:
                break
            if added >= count:
                break
            deck.append(c.copy())
            added += 1

    # Fill any remaining slots
    while len(deck) < deck_size:
        remaining_pool = [c for c in pool if sum(1 for d in deck if d.name == c.name) < 2]
        if remaining_pool:
            c = random.choice(remaining_pool)
            deck.append(c.copy())
        else:
            break

    return deck[:deck_size]


# ============================================================
# TOURNAMENT SIMULATOR
# ============================================================

def simulate_game(deck1: List[Card], faction1: str, deck2: List[Card], faction2: str) -> Optional[str]:
    """Simulate a single game and return the winning faction name."""
    p1 = Player(name=faction1, faction=faction1, deck=[c.copy() for c in deck1])
    p2 = Player(name=faction2, faction=faction2, deck=[c.copy() for c in deck2])
    game = Game(p1, p2, verbose=False)
    winner = game.run(smart_ai)
    if winner:
        return winner.faction
    return None  # Draw


def run_tournament(faction_decks: Dict[str, List[Card]], games_per_matchup: int = 1000):
    """Run a full round-robin tournament."""
    factions = sorted(faction_decks.keys())
    results = defaultdict(lambda: defaultdict(int))
    total_wins = Counter()
    total_games = Counter()
    matchup_details = {}

    total_matchups = len(factions) * (len(factions) - 1) // 2
    matchup_num = 0

    for i, f1 in enumerate(factions):
        for j, f2 in enumerate(factions):
            if j <= i:
                continue
            matchup_num += 1
            print(f"  [{matchup_num}/{total_matchups}] {f1} vs {f2}...", end=" ", flush=True)

            wins = {f1: 0, f2: 0, "draw": 0}
            for g in range(games_per_matchup):
                # Alternate who goes first
                if g % 2 == 0:
                    winner = simulate_game(faction_decks[f1], f1, faction_decks[f2], f2)
                else:
                    winner = simulate_game(faction_decks[f2], f2, faction_decks[f1], f1)

                if winner == f1:
                    wins[f1] += 1
                elif winner == f2:
                    wins[f2] += 1
                else:
                    wins["draw"] += 1

            results[f1][f2] = wins[f1]
            results[f2][f1] = wins[f2]
            total_wins[f1] += wins[f1]
            total_wins[f2] += wins[f2]
            total_games[f1] += games_per_matchup
            total_games[f2] += games_per_matchup

            wr1 = wins[f1] / games_per_matchup * 100
            wr2 = wins[f2] / games_per_matchup * 100
            print(f"{f1} {wr1:.1f}% — {f2} {wr2:.1f}% (draws: {wins['draw']})")
            matchup_details[(f1, f2)] = wins

    return results, total_wins, total_games, matchup_details


# ============================================================
# MAIN
# ============================================================

def main():
    import time

    CARDS_DIR = "/home/user/starforge_tcg/new-cards"
    files = sorted([f for f in os.listdir(CARDS_DIR) if f.endswith(".xlsx")])

    print("=" * 70)
    print("STARFORGE TCG — AI BATTLE SIMULATOR")
    print("Smart AI with faction-aware strategy")
    print("=" * 70)

    # Load all factions
    faction_decks = {}
    for fname in files:
        path = os.path.join(CARDS_DIR, fname)
        cards = load_faction_deck(path)
        faction_name = fname.replace("STARFORGE_", "").replace("_v2.xlsx", "").replace("_v3.xlsx", "")
        deck = build_deck(cards, deck_size=30)
        faction_decks[faction_name] = deck
        print(f"  Loaded {faction_name}: {len(cards)} cards -> {len(deck)}-card deck")

    print(f"\nLoaded {len(faction_decks)} factions. Starting tournament...\n")

    GAMES_PER_MATCHUP = 1000
    start = time.time()

    results, total_wins, total_games, matchup_details = run_tournament(
        faction_decks, GAMES_PER_MATCHUP
    )

    elapsed = time.time() - start
    total_simulated = sum(total_games.values()) // 2

    print(f"\n{'=' * 70}")
    print(f"TOURNAMENT COMPLETE — {total_simulated:,} games in {elapsed:.1f}s")
    print(f"{'=' * 70}")

    # Overall rankings
    print(f"\n{'=' * 70}")
    print("OVERALL POWER RANKINGS")
    print(f"{'=' * 70}")
    rankings = []
    factions = sorted(faction_decks.keys())
    for f in factions:
        wr = total_wins[f] / total_games[f] * 100 if total_games[f] > 0 else 0
        rankings.append((f, wr, total_wins[f], total_games[f]))

    rankings.sort(key=lambda x: x[1], reverse=True)
    print(f"\n{'Rank':<6} {'Faction':<20} {'Win Rate':>8} {'Wins':>6} {'Games':>6} {'Tier'}")
    print("-" * 65)
    for i, (f, wr, w, g) in enumerate(rankings):
        if wr >= 58:
            tier = "S (OVERPOWERED)"
        elif wr >= 54:
            tier = "A (Strong)"
        elif wr >= 50:
            tier = "B (Balanced)"
        elif wr >= 46:
            tier = "C (Weak)"
        else:
            tier = "D (UNDERPOWERED)"
        print(f"  #{i+1:<4} {f:<20} {wr:>7.1f}% {w:>6} {g:>6}   {tier}")

    # Full matchup matrix
    print(f"\n{'=' * 70}")
    print("MATCHUP MATRIX (Win % for row faction)")
    print(f"{'=' * 70}")

    # Short names for display
    short = {}
    for f in factions:
        if len(f) > 8:
            short[f] = f[:8]
        else:
            short[f] = f

    header = f"{'':>14}"
    for f in factions:
        header += f" {short[f]:>8}"
    print(header)
    print("-" * (14 + 9 * len(factions)))

    for f1 in factions:
        row = f"{short[f1]:>14}"
        for f2 in factions:
            if f1 == f2:
                row += f" {'---':>8}"
            else:
                w = results[f1].get(f2, 0)
                wr = w / GAMES_PER_MATCHUP * 100
                row += f" {wr:>7.1f}%"
        print(row)

    # Worst matchups
    print(f"\n{'=' * 70}")
    print("WORST MATCHUPS (most lopsided)")
    print(f"{'=' * 70}")
    matchups = []
    for (f1, f2), wins in matchup_details.items():
        wr1 = wins[f1] / GAMES_PER_MATCHUP * 100
        wr2 = wins[f2] / GAMES_PER_MATCHUP * 100
        spread = abs(wr1 - wr2)
        winner = f1 if wr1 > wr2 else f2
        loser = f2 if wr1 > wr2 else f1
        win_pct = max(wr1, wr2)
        matchups.append((winner, loser, win_pct, spread))

    matchups.sort(key=lambda x: x[3], reverse=True)
    for winner, loser, wp, spread in matchups[:10]:
        print(f"  {winner} beats {loser}: {wp:.1f}% (spread: {spread:.1f}%)")

    # Best matchups (closest to 50/50)
    print(f"\n{'=' * 70}")
    print("MOST BALANCED MATCHUPS (closest to 50/50)")
    print(f"{'=' * 70}")
    matchups.sort(key=lambda x: x[3])
    for winner, loser, wp, spread in matchups[:10]:
        print(f"  {winner} vs {loser}: {wp:.1f}% (spread: {spread:.1f}%)")

    # BALANCE RECOMMENDATIONS
    print(f"\n{'=' * 70}")
    print("AI BALANCE RECOMMENDATIONS")
    print(f"{'=' * 70}")

    for i, (f, wr, w, g) in enumerate(rankings):
        if wr >= 56:
            print(f"\n  NERF {f} (Win Rate: {wr:.1f}%)")
            # Find what they're best against
            best_vs = max(factions, key=lambda f2: results[f].get(f2, 0) if f2 != f else 0)
            worst_vs = min(factions, key=lambda f2: results[f].get(f2, 999) if f2 != f else 999)
            print(f"    Dominates: {best_vs} ({results[f].get(best_vs,0)/GAMES_PER_MATCHUP*100:.1f}%)")
            print(f"    Weakest vs: {worst_vs} ({results[f].get(worst_vs,0)/GAMES_PER_MATCHUP*100:.1f}%)")
            print(f"    Suggested: Reduce stat efficiency or keyword count")

        elif wr <= 44:
            print(f"\n  BUFF {f} (Win Rate: {wr:.1f}%)")
            worst_vs = max(factions, key=lambda f2: results[f2].get(f, 0) if f2 != f else 0)
            best_vs = min(factions, key=lambda f2: results[f2].get(f, 999) if f2 != f else 999)
            print(f"    Loses hardest to: {worst_vs}")
            print(f"    Best matchup: {best_vs}")
            print(f"    Suggested: Increase key minion stats or add more synergy payoffs")

    print(f"\n{'=' * 70}")
    print("SIMULATION COMPLETE")
    print(f"{'=' * 70}")

    # Save results to JSON
    output = {
        "games_per_matchup": GAMES_PER_MATCHUP,
        "total_games": total_simulated,
        "rankings": [{"rank": i+1, "faction": f, "win_rate": round(wr, 2), "wins": w, "games": g}
                     for i, (f, wr, w, g) in enumerate(rankings)],
        "matchups": {f"{f1}_vs_{f2}": {f1: wins[f1], f2: wins[f2], "draws": wins.get("draw", 0)}
                     for (f1, f2), wins in matchup_details.items()},
    }

    out_path = "/home/user/starforge_tcg/sim/tournament_results.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to {out_path}")


if __name__ == "__main__":
    main()
