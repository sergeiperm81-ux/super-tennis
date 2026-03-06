-- ============================================================
-- SUPER.TENNIS — Initial Database Schema
-- ============================================================
-- Source data: Jeff Sackmann tennis_atp + tennis_wta (CC-BY-NC-SA 4.0)
-- Extended with AI-generated content via OpenAI
-- ============================================================

-- PLAYERS: core player data from Sackmann CSV + enriched fields
CREATE TABLE players (
  id            SERIAL PRIMARY KEY,
  player_id     TEXT UNIQUE NOT NULL,         -- Sackmann ID (e.g. "104925")
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  full_name     TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  slug          TEXT UNIQUE NOT NULL,         -- URL slug: "novak-djokovic"
  hand          TEXT CHECK (hand IN ('R','L','U','A')), -- Right, Left, Unknown, Ambidextrous
  birth_date    DATE,
  country_code  TEXT,                         -- IOC 3-letter code
  height_cm     INT,
  tour          TEXT NOT NULL CHECK (tour IN ('atp','wta')),

  -- Enriched fields (from AI or manual)
  bio_short     TEXT,                         -- 1-2 sentence bio
  image_url     TEXT,                         -- Photo URL
  is_active     BOOLEAN DEFAULT true,

  -- Career stats (aggregated from matches)
  career_titles    INT DEFAULT 0,
  grand_slam_titles INT DEFAULT 0,
  career_win       INT DEFAULT 0,
  career_loss      INT DEFAULT 0,
  career_prize_usd BIGINT DEFAULT 0,

  -- SEO & content
  meta_title       TEXT,
  meta_description TEXT,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_players_tour ON players(tour);
CREATE INDEX idx_players_country ON players(country_code);
CREATE INDEX idx_players_slug ON players(slug);
CREATE INDEX idx_players_active ON players(is_active);

-- RANKINGS: weekly snapshots from Sackmann rankings CSV
CREATE TABLE rankings (
  id            SERIAL PRIMARY KEY,
  ranking_date  DATE NOT NULL,
  player_id     TEXT NOT NULL REFERENCES players(player_id),
  tour          TEXT NOT NULL CHECK (tour IN ('atp','wta')),
  ranking       INT NOT NULL,
  points        INT,
  tours_played  INT,

  UNIQUE(ranking_date, player_id, tour)
);

CREATE INDEX idx_rankings_date ON rankings(ranking_date DESC);
CREATE INDEX idx_rankings_player ON rankings(player_id);
CREATE INDEX idx_rankings_top ON rankings(ranking_date, tour, ranking);

-- TOURNAMENTS: extracted from match data
CREATE TABLE tournaments (
  id            SERIAL PRIMARY KEY,
  tourney_id    TEXT UNIQUE NOT NULL,         -- Sackmann tourney ID
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  surface       TEXT,                         -- Hard, Clay, Grass, Carpet
  level         TEXT,                         -- G=Grand Slam, M=Masters, A=ATP500/250, etc.
  tour          TEXT NOT NULL CHECK (tour IN ('atp','wta')),
  country_code  TEXT,
  city          TEXT,
  draw_size     INT,

  -- Enriched
  description   TEXT,
  image_url     TEXT,
  prize_money_usd BIGINT,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tournaments_slug ON tournaments(slug);
CREATE INDEX idx_tournaments_level ON tournaments(level);

-- MATCHES: individual match results from Sackmann CSV
CREATE TABLE matches (
  id              SERIAL PRIMARY KEY,
  tourney_id      TEXT REFERENCES tournaments(tourney_id),
  match_num       INT,
  tour            TEXT NOT NULL CHECK (tour IN ('atp','wta')),
  tourney_date    DATE,
  round           TEXT,                       -- F, SF, QF, R16, R32, R64, R128, RR, BR
  best_of         INT,                        -- 3 or 5

  winner_id       TEXT REFERENCES players(player_id),
  loser_id        TEXT REFERENCES players(player_id),
  score           TEXT,
  minutes         INT,

  -- Winner stats
  w_ace     INT, w_df      INT, w_svpt    INT,
  w_1st_in  INT, w_1st_won INT, w_2nd_won INT,
  w_sv_gms  INT, w_bp_saved INT, w_bp_faced INT,

  -- Loser stats
  l_ace     INT, l_df      INT, l_svpt    INT,
  l_1st_in  INT, l_1st_won INT, l_2nd_won INT,
  l_sv_gms  INT, l_bp_saved INT, l_bp_faced INT,

  UNIQUE(tourney_id, match_num, tour)
);

CREATE INDEX idx_matches_winner ON matches(winner_id);
CREATE INDEX idx_matches_loser ON matches(loser_id);
CREATE INDEX idx_matches_date ON matches(tourney_date DESC);
CREATE INDEX idx_matches_tourney ON matches(tourney_id);

-- ARTICLES: AI-generated content for the site
CREATE TABLE articles (
  id              SERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN (
    'players','records','gear','lifestyle','tournaments'
  )),
  subcategory     TEXT,                       -- e.g. 'net-worth', 'racket', 'profile'

  excerpt         TEXT,                       -- Short preview text
  body            TEXT,                       -- Full article (Markdown)
  image_url       TEXT,
  image_alt       TEXT,

  -- SEO
  meta_title      TEXT,
  meta_description TEXT,

  -- Relations
  player_id       TEXT REFERENCES players(player_id),
  tournament_id   TEXT REFERENCES tournaments(tourney_id),

  -- Publishing
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  published_at    TIMESTAMPTZ,

  -- AI metadata
  ai_model        TEXT,                       -- e.g. 'gpt-4o-mini'
  ai_prompt_hash  TEXT,                       -- Hash of prompt used
  ai_generated_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_player ON articles(player_id);
CREATE INDEX idx_articles_published ON articles(published_at DESC);

-- INTERLINKS: internal linking map for SEO
CREATE TABLE interlinks (
  id            SERIAL PRIMARY KEY,
  source_slug   TEXT NOT NULL,               -- Article that contains the link
  target_slug   TEXT NOT NULL,               -- Article being linked to
  anchor_text   TEXT,                        -- Link text
  context       TEXT,                        -- Sentence around the link

  UNIQUE(source_slug, target_slug)
);

CREATE INDEX idx_interlinks_source ON interlinks(source_slug);
CREATE INDEX idx_interlinks_target ON interlinks(target_slug);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER trg_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Enable Row Level Security (read-only public access)
-- ============================================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interlinks ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (anon key)
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public read rankings" ON rankings FOR SELECT USING (true);
CREATE POLICY "Public read tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read articles" ON articles FOR SELECT
  USING (status = 'published');
CREATE POLICY "Public read interlinks" ON interlinks FOR SELECT USING (true);
