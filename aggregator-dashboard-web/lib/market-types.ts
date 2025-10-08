/**
 * TypeScript types for Market Aggregator Dashboard
 */

export interface Outcome {
  name: string;
  price: number;
  american_odds: string;
}

export interface MarketData {
  market_id: string;
  outcomes: Outcome[];
  volume: number | string; // Allow both numeric (Polymarket/Kalshi) and string (Limitless) formats
  liquidity: number;
  start_time?: string;
}

export interface Comparison {
  title: string;
  price_spread: number;
  best_platform: "polymarket" | "kalshi";
  arbitrage_opportunity: boolean;
  polymarket: MarketData | null;
  kalshi: MarketData | null; // legacy single-market view (kept for compatibility)
  // New: Kalshi by team (two markets: team1 yes/no, team2 yes/no)
  kalshi_by_team?: Array<{
    team_normalized: string;
    team_display: string;
    market_id: string;
    volume: number;
    liquidity: number;
    start_time?: string;
    yes: Outcome | null;
    no: Outcome | null;
  }>;
  // New: Best per team outcome across Poly team, Kalshi YES, Opponent NO
  per_team_best?: Array<{
    team_normalized: string;
    team_display?: string;
    best_platform: "polymarket" | "kalshi";
    best_source: "polymarket_team" | "kalshi_yes" | "opponent_no";
    best_price: number;
    best_american_odds: string;
  }>;
}

export interface CryptoMarketsResponse {
  comparisons: Comparison[];
  summary: {
    total_comparisons: number;
    polymarket_markets: number;
    kalshi_markets: number;
    arbitrage_opportunities: number;
  };
  timestamp: string;
}

export interface BestOdds {
  home_team: string;
  away_team: string;
  best_home_odds: number;
  best_home_platform: string;
  best_away_odds: number;
  best_away_platform: string;
}

export interface BookmakerOdds {
  bookmaker: string;
  home_odds: number;
  away_odds: number;
}

export interface TraditionalGame {
  title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  best_odds: BestOdds;
  all_odds: BookmakerOdds[];
}

export interface TraditionalOddsResponse {
  games: TraditionalGame[];
  summary: {
    total_games: number;
    bookmakers: number;
  };
  timestamp: string;
}

export interface PoliticsComparison {
  title: string;
  price_spread: number;
  best_platform: "polymarket" | "kalshi";
  arbitrage_opportunity: boolean;
  polymarket: MarketData;
  kalshi: MarketData;
}

export interface PoliticsResponse {
  comparisons: PoliticsComparison[];
  summary: {
    total_comparisons: number;
    arbitrage_opportunities: number;
  };
  timestamp: string;
}

export interface CryptoComparison {
  title: string;
  price_spread: number;
  best_platform: "polymarket" | "kalshi" | "limitless";
  arbitrage_opportunity: boolean;
  polymarket: MarketData | null;
  kalshi: MarketData | null;
  limitless: MarketData | null;
}

export interface CryptoResponse {
  comparisons: CryptoComparison[];
  summary: {
    total_comparisons: number;
    arbitrage_opportunities: number;
  };
  timestamp: string;
}

