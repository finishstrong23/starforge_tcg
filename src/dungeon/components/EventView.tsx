import React, { useMemo, useState } from 'react';
import { useDungeonRun } from '../context/DungeonRunContext';
import { CARD_POOL } from '../data/cards';
import { createCurseInstance } from '../data/curses';
import { getPotionDef } from '../data/potions';
import { RELIC_POOL } from '../data/relics';
import { getRunModifierDef } from '../data/runModifiers';
import { createCardInstance } from '../engine/draft';
import { choicesForFaction, pickEventForNode } from '../engine/eventSelection';
import { logEvent } from '../engine/telemetry';
import type { DungeonEventChoiceDefinition } from '../types';
import { getDungeonSceneArt } from '../assets/basicTokenArt';
import { MVP_FACTION } from '../config/mvp';

export const EventView: React.FC = () => {
  const {
    runState,
    draftFaction,
    addGold,
    spendGold,
    healPlayer,
    damagePlayer,
    increaseMaxHealth,
    addCardToDeck,
    removeCardFromDeck,
    upgradeCard,
    addRunModifier,
    addRelic,
    addPotion,
    returnToMap,
  } = useDungeonRun();
  const [picked, setPicked] = useState<string | null>(null);
  const currentAct = runState?.currentAct ?? 1;
  const currentMap = runState?.actMaps[currentAct - 1];
  const currentNodeId = currentMap?.currentNodeId ?? 'event';
  const event = useMemo(
    () => pickEventForNode(currentAct, runState?.seed ?? 'legacy-run', currentNodeId),
    [currentAct, currentNodeId, runState?.seed],
  );
  const choices = useMemo(
    () => choicesForFaction(event, draftFaction),
    [draftFaction, event],
  );

  if (!runState) return null;

  const applyChoice = (choice: DungeonEventChoiceDefinition) => {
    for (const effect of choice.effects) {
      if (effect.type === 'gold') {
        if (effect.amount >= 0) addGold(effect.amount);
        else spendGold(Math.abs(effect.amount));
      } else if (effect.type === 'heal') {
        healPlayer(effect.amount);
      } else if (effect.type === 'damage') {
        damagePlayer(effect.amount);
      } else if (effect.type === 'max_hp') {
        increaseMaxHealth(effect.amount, effect.heal);
      } else if (effect.type === 'add_card') {
        const cardDef = CARD_POOL.find((card) => card.id === effect.cardId);
        if (cardDef) addCardToDeck(createCardInstance(cardDef));
      } else if (effect.type === 'upgrade_card') {
        const target = runState.deck.find((card) => !card.upgraded);
        if (target) upgradeCard(target.instanceId);
      } else if (effect.type === 'remove_card') {
        const target = effect.mode === 'first_starter'
          ? runState.deck.find((card) => card.complexityTier === 1)
          : runState.deck[0];
        if (target) removeCardFromDeck(target.instanceId);
      } else if (effect.type === 'add_relic') {
        const relic = RELIC_POOL.find((candidate) => candidate.id === effect.relicId);
        if (relic) addRelic(relic);
      } else if (effect.type === 'add_potion') {
        const potion = getPotionDef(effect.potionId);
        if (potion) addPotion({ definitionId: potion.id });
      } else if (effect.type === 'add_curse') {
        const curse = createCurseInstance(effect.curseId, draftFaction ?? runState.deck[0]?.faction ?? MVP_FACTION);
        if (curse) addCardToDeck(curse);
      } else if (effect.type === 'map_modifier' || effect.type === 'class_resource') {
        const modifier = getRunModifierDef(effect.modifierId);
        if (modifier) addRunModifier(modifier);
      }
    }
  };

  const handlePick = (choice: DungeonEventChoiceDefinition) => {
    if (picked) return;
    applyChoice(choice);
    setPicked(choice.id);
    logEvent('event_choice', {
      faction: draftFaction,
      act: runState.currentAct,
      eventId: event.id,
      choiceId: choice.id,
    });
  };

  const s: Record<string, React.CSSProperties> = {
    root: {
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1rem',
      gap: 18,
      color: '#f0f4ff',
      backgroundColor: '#050510',
      backgroundImage: [
        'linear-gradient(180deg, rgba(7,7,18,0.62), rgba(7,7,18,0.90))',
        `url("${getDungeonSceneArt('event')}")`,
      ].join(', '),
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center, center',
      backgroundRepeat: 'no-repeat',
    },
    actBadge: {
      fontSize: 9,
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
      color: '#2dd4bf',
    },
    title: {
      margin: 0,
      fontSize: '1.65rem',
      letterSpacing: '0.08em',
      textAlign: 'center',
    },
    body: {
      maxWidth: 560,
      margin: 0,
      color: '#aebbd4',
      fontSize: '0.9rem',
      lineHeight: 1.55,
      textAlign: 'center',
    },
    row: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
      maxWidth: 780,
      marginTop: 8,
    },
    continueButton: {
      marginTop: 10,
      padding: '11px 24px',
      borderRadius: 6,
      border: '1px solid #2dd4bf',
      background: 'linear-gradient(180deg, #5eead4 0%, #2dd4bf 100%)',
      color: '#041114',
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      cursor: 'pointer',
    },
  };

  return (
      <div style={s.root}>
      <div style={s.actBadge}>Act {runState.currentAct} - Event</div>
      <h1 style={s.title}>{event.name}</h1>
      <p style={s.body}>
        {event.body}
      </p>

      <div style={s.row}>
        {choices.map((choice) => {
          const isPicked = picked === choice.id;
          const isDimmed = picked !== null && !isPicked;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => handlePick(choice)}
              disabled={picked !== null}
              style={{
                width: 230,
                minHeight: 116,
                padding: '16px 15px',
                borderRadius: 6,
                border: `1px solid ${isPicked ? '#eafffb' : '#2dd4bf77'}`,
                background: isPicked
                  ? 'rgba(45,212,191,0.24)'
                  : 'rgba(8,10,24,0.78)',
                color: '#eefcff',
                opacity: isDimmed ? 0.38 : 1,
                cursor: picked ? 'default' : 'pointer',
                textAlign: 'left',
                boxShadow: isPicked ? '0 0 28px rgba(45,212,191,0.42)' : 'none',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: '#8ff8ec' }}>{choice.label}</div>
              <div style={{ marginTop: 9, fontSize: 12, lineHeight: 1.35, color: '#c4d5e8' }}>
                {choice.effectText}
              </div>
            </button>
          );
        })}
      </div>

      {picked && (
        <button type="button" style={s.continueButton} onClick={returnToMap}>
          Return to Map
        </button>
      )}
    </div>
  );
};
