-- StarForge TCG Database Schema
-- Migration 001: Initial Schema

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY,
  username VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  avatar_id VARCHAR(50) DEFAULT 'default',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  gold INTEGER DEFAULT 0,
  stardust INTEGER DEFAULT 0,
  nebula_gems INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_players_email ON players(email);

-- Player stats
CREATE TABLE IF NOT EXISTS player_stats (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,
  total_damage_dealt BIGINT DEFAULT 0,
  total_cards_played BIGINT DEFAULT 0,
  total_minions_killed BIGINT DEFAULT 0,
  favorite_race VARCHAR(50),
  arena_wins INTEGER DEFAULT 0,
  arena_best_run INTEGER DEFAULT 0
);

-- Player ranks (per season)
CREATE TABLE IF NOT EXISTS player_ranks (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL DEFAULT 'bronze',
  division INTEGER NOT NULL DEFAULT 10,
  stars INTEGER NOT NULL DEFAULT 0,
  mmr INTEGER NOT NULL DEFAULT 1000,
  peak_mmr INTEGER NOT NULL DEFAULT 1000,
  season_id VARCHAR(50) NOT NULL DEFAULT 'season_1',
  PRIMARY KEY (player_id, season_id)
);

CREATE INDEX idx_player_ranks_mmr ON player_ranks(mmr);
CREATE INDEX idx_player_ranks_tier ON player_ranks(tier, division);

-- Login streaks
CREATE TABLE IF NOT EXISTS login_streaks (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  last_claimed_at TIMESTAMP WITH TIME ZONE,
  longest_streak INTEGER DEFAULT 0
);

-- Card definitions (server-side card database)
CREATE TABLE IF NOT EXISTS cards (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  race VARCHAR(50) NOT NULL,
  mana_cost INTEGER NOT NULL,
  attack INTEGER,
  health INTEGER,
  card_type VARCHAR(20) NOT NULL,  -- 'minion', 'spell', 'weapon'
  rarity VARCHAR(20) NOT NULL,     -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
  keywords TEXT[],
  effect_text TEXT,
  flavor_text TEXT,
  is_collectible BOOLEAN DEFAULT TRUE,
  expansion VARCHAR(50) DEFAULT 'core'
);

CREATE INDEX idx_cards_race ON cards(race);
CREATE INDEX idx_cards_rarity ON cards(rarity);

-- Player card collections
CREATE TABLE IF NOT EXISTS player_collections (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  card_id VARCHAR(100) REFERENCES cards(id),
  count INTEGER DEFAULT 1,
  is_golden BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (player_id, card_id, is_golden)
);

-- Player decks
CREATE TABLE IF NOT EXISTS player_decks (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  race VARCHAR(50) NOT NULL,
  card_ids JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_player_decks_player ON player_decks(player_id);

-- Game records
CREATE TABLE IF NOT EXISTS game_records (
  id UUID PRIMARY KEY,
  player1_id UUID REFERENCES players(id),
  player2_id UUID REFERENCES players(id),
  winner_id UUID REFERENCES players(id),
  mode VARCHAR(20) NOT NULL,
  turn_count INTEGER,
  duration_ms INTEGER,
  player1_race VARCHAR(50),
  player2_race VARCHAR(50),
  player1_deck_id UUID,
  player2_deck_id UUID,
  mmr_change_1 INTEGER DEFAULT 0,
  mmr_change_2 INTEGER DEFAULT 0,
  replay_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_game_records_player1 ON game_records(player1_id);
CREATE INDEX idx_game_records_player2 ON game_records(player2_id);
CREATE INDEX idx_game_records_mode ON game_records(mode);
CREATE INDEX idx_game_records_completed ON game_records(completed_at DESC);

-- Friends system
CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES players(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'accepted', 'blocked'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, friend_id)
);

CREATE INDEX idx_friends_player ON friends(player_id);
CREATE INDEX idx_friends_friend ON friends(friend_id);

-- Daily quests
CREATE TABLE IF NOT EXISTS daily_quests (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  quest_type VARCHAR(50) NOT NULL,
  quest_description TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  reward_gold INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  can_reroll BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_daily_quests_player ON daily_quests(player_id, is_completed);

-- Battle pass progress
CREATE TABLE IF NOT EXISTS battle_pass_progress (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  season_id VARCHAR(50) NOT NULL,
  tier INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  claimed_tiers JSONB DEFAULT '[]',
  PRIMARY KEY (player_id, season_id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS player_achievements (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  achievement_id VARCHAR(100) NOT NULL,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (player_id, achievement_id)
);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  session_id VARCHAR(100),
  client_timestamp TIMESTAMP WITH TIME ZONE,
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_player ON analytics_events(player_id);
CREATE INDEX idx_analytics_events_time ON analytics_events(server_timestamp DESC);

-- Balance telemetry (aggregated)
CREATE TABLE IF NOT EXISTS balance_telemetry (
  id SERIAL PRIMARY KEY,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  race VARCHAR(50) NOT NULL,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  avg_game_duration_ms INTEGER,
  avg_turns INTEGER,
  most_played_cards JSONB,
  rank_tier VARCHAR(20),
  UNIQUE(period_start, race, rank_tier)
);

CREATE INDEX idx_balance_telemetry_period ON balance_telemetry(period_start, period_end);
CREATE INDEX idx_balance_telemetry_race ON balance_telemetry(race);

-- Arena runs
CREATE TABLE IF NOT EXISTS arena_runs (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  deck_cards JSONB NOT NULL,
  offered_cards JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  rewards_claimed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_arena_runs_player ON arena_runs(player_id, is_active);
