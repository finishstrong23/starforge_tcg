-- StarForge TCG Database Schema
-- Migration 002: Seasons table and ranked ladder enhancements

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  reward_card_back VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active);
CREATE INDEX IF NOT EXISTS idx_seasons_dates ON seasons(start_date, end_date);

-- Insert default season if none exists
INSERT INTO seasons (id, name, start_date, end_date, is_active)
VALUES ('season_1', 'Season 1: Dawn of the Forge', NOW(), NOW() + INTERVAL '30 days', true)
ON CONFLICT (id) DO NOTHING;

-- Season reward history (tracks what rank rewards each player earned)
CREATE TABLE IF NOT EXISTS season_rewards (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  season_id VARCHAR(50) REFERENCES seasons(id),
  peak_tier VARCHAR(20) NOT NULL,
  peak_division INTEGER NOT NULL,
  peak_mmr INTEGER NOT NULL,
  reward_gold INTEGER DEFAULT 0,
  reward_stardust INTEGER DEFAULT 0,
  reward_card_back VARCHAR(100),
  claimed BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (player_id, season_id)
);
