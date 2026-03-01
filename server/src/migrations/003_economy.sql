-- StarForge TCG Database Schema
-- Migration 003: Economy & Monetization tables

-- Currency transaction log (audit trail for all currency changes)
CREATE TABLE IF NOT EXISTS currency_transactions (
  id BIGSERIAL PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  currency_type VARCHAR(20) NOT NULL,  -- 'gold', 'stardust', 'nebula_gems'
  amount INTEGER NOT NULL,             -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,        -- 'pack_purchase', 'craft', 'disenchant', 'quest_reward', etc.
  reference_id VARCHAR(100),           -- optional link to pack/craft/quest ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_currency_tx_player ON currency_transactions(player_id, created_at DESC);
CREATE INDEX idx_currency_tx_type ON currency_transactions(currency_type);
CREATE INDEX idx_currency_tx_reason ON currency_transactions(reason);

-- Pack opening history
CREATE TABLE IF NOT EXISTS pack_openings (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pack_type VARCHAR(50) NOT NULL,      -- 'standard', 'premium', 'legendary'
  cost INTEGER NOT NULL,               -- gold spent
  pity_triggered BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pack_openings_player ON pack_openings(player_id, opened_at DESC);

-- Cards obtained from pack openings
CREATE TABLE IF NOT EXISTS pack_cards (
  id BIGSERIAL PRIMARY KEY,
  pack_opening_id UUID NOT NULL REFERENCES pack_openings(id) ON DELETE CASCADE,
  card_id VARCHAR(100) NOT NULL,
  rarity VARCHAR(20) NOT NULL,
  is_new BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_pack_cards_pack ON pack_cards(pack_opening_id);

-- Pack state (pity timer per player)
CREATE TABLE IF NOT EXISTS pack_state (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  total_opened INTEGER DEFAULT 0,
  packs_since_legendary INTEGER DEFAULT 0
);

-- Crafting history
CREATE TABLE IF NOT EXISTS crafting_log (
  id BIGSERIAL PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,         -- 'craft' or 'disenchant'
  card_id VARCHAR(100) NOT NULL,
  rarity VARCHAR(20) NOT NULL,
  dust_amount INTEGER NOT NULL,        -- positive for disenchant gain, negative for craft cost
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_crafting_log_player ON crafting_log(player_id, created_at DESC);

-- Ensure gold can't go negative (constraint)
ALTER TABLE players ADD CONSTRAINT chk_gold_nonneg CHECK (gold >= 0);
ALTER TABLE players ADD CONSTRAINT chk_stardust_nonneg CHECK (stardust >= 0);
ALTER TABLE players ADD CONSTRAINT chk_gems_nonneg CHECK (nebula_gems >= 0);

-- Fix battle_pass_progress.claimed_tiers default to use proper JSON structure
-- (original migration 001 set default to '[]', but service expects {free:[], premium:[]})
ALTER TABLE battle_pass_progress
  ALTER COLUMN claimed_tiers SET DEFAULT '{"free":[],"premium":[]}'::jsonb;

-- Update any existing rows with old format
UPDATE battle_pass_progress
  SET claimed_tiers = '{"free":[],"premium":[]}'::jsonb
  WHERE claimed_tiers = '[]'::jsonb OR claimed_tiers IS NULL;
