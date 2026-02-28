/**
 * STARFORGE TCG - Main App Component
 *
 * Routes between: Main Menu, Quick Play, Campaign (Story Mode),
 * PvP Lobby, PvP Game, Balance Tester.
 */

import React, { useState, useCallback } from 'react';
import { GameBoard } from './components/GameBoard';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { BalanceTester } from './components/BalanceTester';
import { PlanetSelect } from './components/PlanetSelect';
import { CampaignMap } from './components/CampaignMap';
import { PreBattle } from './components/PreBattle';
import { PostBattle } from './components/PostBattle';
import { CampaignGame } from './components/CampaignGame';
import { DeckBuilder } from './components/DeckBuilder';
import type { CampaignBattleResult } from './components/CampaignGame';
import { GameProvider } from './context/GameContext';
import { PvPGameProvider } from './context/PvPGameContext';
import { Race } from '../types/Race';
import { AIDifficulty } from '../ai/AIPlayer';
import { PLANET_ENCOUNTERS } from '../campaign/CampaignData';
import type { CampaignSave } from '../campaign/CampaignState';
import {
  loadCampaign,
  saveCampaign,
  deleteCampaign,
  createNewCampaign,
  recordBattleResult,
} from '../campaign/CampaignState';
import type { MultiplayerManager } from './network/MultiplayerManager';

type GameScreen =
  | 'menu'
  | 'game'
  | 'deckbuilder'
  | 'pvp-lobby'
  | 'pvp-game'
  | 'balance'
  | 'campaign-select'
  | 'campaign-map'
  | 'campaign-prebattle'
  | 'campaign-deckbuilder'
  | 'campaign-battle'
  | 'campaign-results';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('menu');

  // Quick Play config
  const [gameConfig, setGameConfig] = useState<{
    playerRace: Race;
    aiDifficulty: AIDifficulty;
  } | null>(null);

  // PvP config
  const [pvpConfig, setPvpConfig] = useState<{
    role: 'host' | 'guest';
    manager: MultiplayerManager;
    myRace: Race;
    opponentRace: Race;
  } | null>(null);

  // Custom deck state
  const [customDeckCardIds, setCustomDeckCardIds] = useState<string[] | null>(null);

  // Campaign state
  const [campaignSave, setCampaignSave] = useState<CampaignSave | null>(null);
  const [campaignOpponent, setCampaignOpponent] = useState<Race | null>(null);
  const [battleResult, setBattleResult] = useState<CampaignBattleResult | null>(null);
  const [wasFirstEncounter, setWasFirstEncounter] = useState(false);
  const [wasNewUnlock, setWasNewUnlock] = useState(false);

  // ---- Quick Play ----
  const handleStartGame = useCallback((playerRace: Race, aiDifficulty: AIDifficulty) => {
    setGameConfig({ playerRace, aiDifficulty });
    setScreen('game');
  }, []);

  // ---- Quick Play with Deckbuilder ----
  const handleStartDeckbuilder = useCallback((playerRace: Race, aiDifficulty: AIDifficulty) => {
    setGameConfig({ playerRace, aiDifficulty });
    setCustomDeckCardIds(null);
    setScreen('deckbuilder');
  }, []);

  const handleDeckConfirmed = useCallback((cardIds: string[]) => {
    setCustomDeckCardIds(cardIds);
    setScreen('game');
  }, []);

  const handleDeckbuilderBack = useCallback(() => {
    setCustomDeckCardIds(null);
    setScreen('menu');
  }, []);

  // ---- Campaign Deckbuilder ----
  const handleCampaignDeckbuilder = useCallback(() => {
    setCustomDeckCardIds(null);
    setScreen('campaign-deckbuilder');
  }, []);

  const handleCampaignDeckConfirmed = useCallback((cardIds: string[]) => {
    setCustomDeckCardIds(cardIds);
    setScreen('campaign-battle');
  }, []);

  const handleCampaignDeckbuilderBack = useCallback(() => {
    setCustomDeckCardIds(null);
    setScreen('campaign-prebattle');
  }, []);

  const handleBackToMenu = useCallback(() => {
    if (pvpConfig) {
      pvpConfig.manager.disconnect();
      setPvpConfig(null);
    }
    setScreen('menu');
    setGameConfig(null);
  }, [pvpConfig]);

  // ---- PvP ----
  const handlePvPReady = useCallback((config: {
    role: 'host' | 'guest';
    manager: MultiplayerManager;
    myRace: Race;
    opponentRace: Race;
  }) => {
    setPvpConfig(config);
    setScreen('pvp-game');
  }, []);

  const handlePvPDisconnect = useCallback(() => {
    if (pvpConfig) {
      pvpConfig.manager.disconnect();
      setPvpConfig(null);
    }
    setScreen('menu');
  }, [pvpConfig]);

  // ---- Campaign ----
  const handleStartCampaign = useCallback(() => {
    const existing = loadCampaign();
    if (existing) {
      setCampaignSave(existing);
      setScreen('campaign-map');
    } else {
      setScreen('campaign-select');
    }
  }, []);

  const handlePlanetSelected = useCallback((race: Race) => {
    const newSave = createNewCampaign(race);
    saveCampaign(newSave);
    setCampaignSave(newSave);
    setScreen('campaign-map');
  }, []);

  const handleSelectCampaignPlanet = useCallback((race: Race) => {
    setCampaignOpponent(race);
    setScreen('campaign-prebattle');
  }, []);

  const handleCampaignFight = useCallback(() => {
    setScreen('campaign-battle');
  }, []);

  const handleCampaignBattleEnd = useCallback((result: CampaignBattleResult) => {
    if (!campaignSave || !campaignOpponent) return;

    const opponentStats = campaignSave.planetStats[campaignOpponent];
    const firstEncounter = !opponentStats || opponentStats.attempts === 0;
    const previouslyUnlocked = campaignSave.unlockedRaces.includes(campaignOpponent);

    const updatedSave = recordBattleResult(
      campaignSave,
      campaignOpponent,
      result.won,
      result.playerHealthRemaining,
      result.turnCount,
    );

    const newUnlock = result.won && !previouslyUnlocked;

    setCampaignSave(updatedSave);
    setBattleResult(result);
    setWasFirstEncounter(firstEncounter);
    setWasNewUnlock(newUnlock);
    setScreen('campaign-results');
  }, [campaignSave, campaignOpponent]);

  const handleCampaignContinue = useCallback(() => {
    setBattleResult(null);
    setCampaignOpponent(null);
    setScreen('campaign-map');
  }, []);

  const handleCampaignRetry = useCallback(() => {
    setBattleResult(null);
    setScreen('campaign-prebattle');
  }, []);

  const handleDeleteCampaign = useCallback(() => {
    deleteCampaign();
    setCampaignSave(null);
    setCampaignOpponent(null);
    setBattleResult(null);
    setScreen('campaign-select');
  }, []);

  const handleCampaignBackToMenu = useCallback(() => {
    setCampaignOpponent(null);
    setBattleResult(null);
    setScreen('menu');
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)',
    }}>
      {/* Main Menu */}
      {screen === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          onPlayFriend={() => setScreen('pvp-lobby')}
          onBalanceTest={() => setScreen('balance')}
          onCampaign={handleStartCampaign}
          onDeckbuilder={handleStartDeckbuilder}
        />
      )}

      {/* Balance Tester */}
      {screen === 'balance' && (
        <BalanceTester onBack={handleBackToMenu} />
      )}

      {/* Deckbuilder (Quick Play) */}
      {screen === 'deckbuilder' && gameConfig && (
        <DeckBuilder
          playerRace={gameConfig.playerRace}
          onConfirm={handleDeckConfirmed}
          onBack={handleDeckbuilderBack}
          isUnlocked={true}
        />
      )}

      {/* Quick Play */}
      {screen === 'game' && gameConfig && (
        <GameProvider
          playerRace={gameConfig.playerRace}
          aiDifficulty={gameConfig.aiDifficulty}
          customDeckCardIds={customDeckCardIds || undefined}
        >
          <GameBoard onBackToMenu={handleBackToMenu} />
        </GameProvider>
      )}

      {/* PvP Lobby */}
      {screen === 'pvp-lobby' && (
        <Lobby
          onGameReady={handlePvPReady}
          onBack={handleBackToMenu}
        />
      )}

      {/* PvP Game */}
      {screen === 'pvp-game' && pvpConfig && (
        <PvPGameProvider
          role={pvpConfig.role}
          manager={pvpConfig.manager}
          myRace={pvpConfig.myRace}
          opponentRace={pvpConfig.opponentRace}
          onDisconnect={handlePvPDisconnect}
        >
          <GameBoard onBackToMenu={handlePvPDisconnect} />
        </PvPGameProvider>
      )}

      {/* Campaign: Planet Selection (first time) */}
      {screen === 'campaign-select' && (
        <PlanetSelect onSelect={handlePlanetSelected} />
      )}

      {/* Campaign: Galaxy Map */}
      {screen === 'campaign-map' && campaignSave && (
        <CampaignMap
          save={campaignSave}
          onSelectPlanet={handleSelectCampaignPlanet}
          onBackToMenu={handleCampaignBackToMenu}
          onDeleteCampaign={handleDeleteCampaign}
        />
      )}

      {/* Campaign: Pre-Battle */}
      {screen === 'campaign-prebattle' && campaignSave && campaignOpponent && (
        <PreBattle
          opponentRace={campaignOpponent}
          playerRace={campaignSave.homeRace}
          stats={campaignSave.planetStats[campaignOpponent]}
          onFight={handleCampaignFight}
          onBack={handleCampaignContinue}
          onCustomizeDeck={handleCampaignDeckbuilder}
        />
      )}

      {/* Campaign: Deckbuilder */}
      {screen === 'campaign-deckbuilder' && campaignSave && (
        <DeckBuilder
          playerRace={campaignSave.homeRace}
          onConfirm={handleCampaignDeckConfirmed}
          onBack={handleCampaignDeckbuilderBack}
          isUnlocked={true}
        />
      )}

      {/* Campaign: Battle */}
      {screen === 'campaign-battle' && campaignSave && campaignOpponent && (
        <CampaignGame
          playerRace={campaignSave.homeRace}
          opponentRace={campaignOpponent}
          difficulty={PLANET_ENCOUNTERS[campaignOpponent].difficulty}
          onBattleEnd={handleCampaignBattleEnd}
          customDeckCardIds={customDeckCardIds || undefined}
        />
      )}

      {/* Campaign: Post-Battle Results */}
      {screen === 'campaign-results' && campaignSave && campaignOpponent && battleResult && (
        <PostBattle
          opponentRace={campaignOpponent}
          playerRace={campaignSave.homeRace}
          won={battleResult.won}
          playerHealthRemaining={battleResult.playerHealthRemaining}
          turnCount={battleResult.turnCount}
          firstEncounter={wasFirstEncounter}
          newUnlock={wasNewUnlock}
          stats={campaignSave.planetStats[campaignOpponent]!}
          onContinue={handleCampaignContinue}
          onRetry={handleCampaignRetry}
        />
      )}
    </div>
  );
};
