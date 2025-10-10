"""
FastAPI Server for Market Aggregator Dashboard

Provides real-time market comparison data from multiple platforms:
- NFL: Polymarket + Kalshi comparisons
- NFL: Traditional sportsbooks odds (via Odds API)
- Politics: Polymarket + Kalshi comparisons
"""

from fastapi import FastAPI, HTTPException
from fastapi import Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone, date
from typing import List, Dict, Any, Optional
import signal
import asyncio
import sys
import os
import requests
import time
from dateutil import parser as date_parser

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api_clients.polymarket_client import PolymarketClient
from api_clients.kalshi_client import KalshiClient
from api_clients.limitless_client import LimitlessClient
from api_clients.odds_api_client import OddsAPIClient
from api_clients.rundown_client import RundownClient
from aggregator import MarketAggregator
from market_mappings import MANUAL_MAPPINGS
from nfl_teams import normalize_nfl_team_name

app = FastAPI(title="Market Aggregator API", version="1.0.0")

# CORS middleware for Next.js dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
poly_client = PolymarketClient()
kalshi_client = KalshiClient()
limitless_client = LimitlessClient()
rundown_client = RundownClient()
odds_api_key = "db06be1d18367c369444aa40d6a25499"
odds_client = OddsAPIClient(odds_api_key)

# Simple in-memory cache for external "others" endpoint
OTHERS_CACHE_TTL_SECONDS = 5
_others_cache_payload: Optional[Dict[str, Any]] = None
_others_cache_limit: Optional[int] = None
_others_cache_offset: Optional[int] = None
_others_cache_ts: float = 0.0
_others_cache_lock = asyncio.Lock()

def filter_future_markets(markets):
    """Filter markets by future gameStartTime and spread <= 0.05"""
    if not markets:
        return []
    
    future_markets = []
    now = datetime.now(timezone.utc) - timedelta(hours=2)
    
    for market in markets:
        game_start_time_str = market.raw_data.get("gameStartTime")
        spread = market.raw_data.get('spread', 0.0)
        
        if spread <= 0.05 and game_start_time_str:
            try:
                game_start_time = date_parser.parse(game_start_time_str)
                if game_start_time.tzinfo is None:
                    game_start_time = game_start_time.replace(tzinfo=timezone.utc)
                
                if game_start_time > now:
                    future_markets.append(market)
            except Exception:
                continue
    
    return future_markets


def filter_correct_markets(markets):
    """Filter to only include markets with exactly 2 outcomes"""
    correct_markets = []
    
    for market in markets:
        try:
            outcomes = market.outcomes
            if len(outcomes) == 2:
                correct_markets.append(market)
        except Exception:
            continue
    
    return correct_markets
"""WebSocket support removed; frontend polls REST endpoints."""



@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Market Aggregator API",
        "version": "1.0.0",
        "endpoints": {
            "/nfl/crypto": "NFL markets from Polymarket + Kalshi",
            "/nfl/traditional": "NFL odds from traditional sportsbooks",
            "/politics": "Politics markets from Polymarket + Kalshi",
            "/crypto": "Crypto markets across Polymarket/Kalshi/Limitless",
            "/others": "Externally matched Polymarket + Kalshi markets"
        }
    }


@app.get("/nfl/crypto")
async def get_nfl_crypto_markets():
    """
    Get NFL market comparisons from Polymarket and Kalshi
    """
    try:
        all_markets = []
        
        # Fetch from Polymarket
        nfl_date = "2025-08-07T00:00:00Z"
        polymarket_markets = poly_client.fetch_markets(
            limit=1000,
            closed=False,
            active=True,
            tag_id=450,
            start_date_min=nfl_date
        )
        
        # Apply filtering
        future_markets = filter_future_markets(polymarket_markets)
        game_markets = filter_correct_markets(future_markets)
        all_markets.extend(game_markets)
        
        # Fetch from Kalshi
        kalshi_markets = kalshi_client.fetch_markets(
            series_ticker="KXNFLGAME",
            status="open",
            limit=200
        )
        all_markets.extend(kalshi_markets)
        
        # Match markets
        aggregator = MarketAggregator()
        aggregator.all_markets = all_markets
        matched_groups = aggregator.match_markets()
        
        if not matched_groups:
            return {
                "comparisons": [],
                "summary": {
                    "total_comparisons": 0,
                    "polymarket_markets": len(game_markets),
                    "kalshi_markets": len(kalshi_markets)
                }
            }
        
        # Create comparisons
        comparisons = aggregator.create_comparisons()
        
        # Format response
        comparison_data = []
        for comp in comparisons:
            poly_market = None
            kalshi_markets_list = []
            
            for market in comp.markets:
                if market.platform.value == 'polymarket':
                    poly_market = market
                elif market.platform.value == 'kalshi':
                    kalshi_markets_list.append(market)
            
            # Find best Kalshi market match
            best_kalshi_market = None
            if poly_market and kalshi_markets_list:
                if len(kalshi_markets_list) == 1:
                    best_kalshi_market = kalshi_markets_list[0]
                else:
                    poly_outcomes = {o.name: o.price for o in poly_market.outcomes}
                    favorite_team = max(poly_outcomes.items(), key=lambda x: x[1])[0]
                    normalized_favorite = normalize_nfl_team_name(favorite_team)
                    
                    for kalshi_market in kalshi_markets_list:
                        kalshi_team = kalshi_market.raw_data.get('yes_sub_title', '')
                        normalized_kalshi_team = normalize_nfl_team_name(kalshi_team)
                        if normalized_kalshi_team == normalized_favorite:
                            best_kalshi_market = kalshi_market
                            break
                    
                    if not best_kalshi_market:
                        best_kalshi_market = kalshi_markets_list[0]
            
            # Calculate specific spread
            specific_spread = comp.price_spread
            if poly_market and best_kalshi_market:
                kalshi_yes_price = next((o.price for o in best_kalshi_market.outcomes if 'yes' in o.name.lower()), None)
                kalshi_team_raw = best_kalshi_market.raw_data.get('yes_sub_title', '')
                normalized_kalshi_team = normalize_nfl_team_name(kalshi_team_raw)
                
                poly_team_price = None
                for outcome in poly_market.outcomes:
                    normalized_outcome = normalize_nfl_team_name(outcome.name)
                    if normalized_outcome == normalized_kalshi_team:
                        poly_team_price = outcome.price
                        break
                
                if poly_team_price is not None and kalshi_yes_price is not None:
                    specific_spread = abs((poly_team_price * 100) - (kalshi_yes_price * 100))
            
            # Build per-team Kalshi structure (two separate markets: team1 yes/no, team2 yes/no)
            kalshi_by_team = []
            if kalshi_markets_list:
                # Determine team names from Polymarket outcomes when possible
                team_names = []
                if poly_market and poly_market.outcomes and len(poly_market.outcomes) == 2:
                    team_names = [o.name for o in poly_market.outcomes]
                
                # Map normalized team name -> kalshi market
                norm_to_kalshi = {}
                for km in kalshi_markets_list:
                    team_raw = km.raw_data.get('yes_sub_title', '') or km.raw_data.get('subtitle', '')
                    norm = normalize_nfl_team_name(team_raw)
                    if norm:
                        norm_to_kalshi[norm] = km
                
                # Try to return exactly two entries in the same order as Polymarket teams when available
                ordered_norms = []
                if team_names:
                    for t in team_names:
                        ordered_norms.append(normalize_nfl_team_name(t))
                else:
                    ordered_norms = list(norm_to_kalshi.keys())[:2]
                
                for norm in ordered_norms:
                    km = norm_to_kalshi.get(norm)
                    if not km:
                        continue
                    yes_out = next(({
                        'name': o.name,
                        'price': o.price,
                        'american_odds': o.american_odds
                    } for o in km.outcomes if 'yes' in o.name.lower()), None)
                    no_out = next(({
                        'name': o.name,
                        'price': o.price,
                        'american_odds': o.american_odds
                    } for o in km.outcomes if 'no' in o.name.lower()), None)
                    kalshi_by_team.append({
                        'team_normalized': norm,
                        'team_display': next((t for t in team_names if normalize_nfl_team_name(t) == norm), km.raw_data.get('yes_sub_title', '')),
                        'market_id': km.market_id,
                        'volume': km.total_volume,
                        'liquidity': km.liquidity,
                        'start_time': km.start_time.isoformat() if km.start_time else None,
                        'yes': yes_out,
                        'no': no_out
                    })
            
            # Compute best per-team among: Polymarket(team), Kalshi(team YES), Opponent NO (from the other Kalshi market)
            per_team_best = []
            if poly_market and len(poly_market.outcomes) == 2 and len(kalshi_by_team) >= 1:
                # Build dicts for quick lookup
                poly_data_by_team = {normalize_nfl_team_name(o.name): {'price': o.price, 'american_odds': o.american_odds} for o in poly_market.outcomes}
                kalshi_data_by_team = {k['team_normalized']: {
                    'yes': {'price': k['yes']['price'], 'american_odds': k['yes']['american_odds']} if k.get('yes') else None,
                    'no': {'price': k['no']['price'], 'american_odds': k['no']['american_odds']} if k.get('no') else None
                } for k in kalshi_by_team}
                # For each team, competitor is the other team if present
                for idx, kteam in enumerate(kalshi_by_team):
                    team_norm = kteam['team_normalized']
                    # Opponent
                    opp_norm = None
                    if len(kalshi_by_team) == 2:
                        opp_norm = kalshi_by_team[1 - idx]['team_normalized']
                    
                    candidates = []
                    # Poly candidate (team win)
                    if team_norm in poly_data_by_team:
                        pd = poly_data_by_team[team_norm]
                        candidates.append(('polymarket', 'polymarket_team', pd['price'], pd['american_odds']))
                    # Kalshi team YES
                    yes_d = kalshi_data_by_team.get(team_norm, {}).get('yes')
                    if yes_d is not None:
                        candidates.append(('kalshi', 'kalshi_yes', yes_d['price'], yes_d['american_odds']))
                    # Opponent NO (equivalent to team win)
                    if opp_norm and kalshi_data_by_team.get(opp_norm, {}).get('no') is not None:
                        no_d = kalshi_data_by_team[opp_norm]['no']
                        candidates.append(('kalshi', 'opponent_no', no_d['price'], no_d['american_odds']))
                    
                    if candidates:
                        # Select the lowest implied probability (better payout)
                        best = min(candidates, key=lambda x: x[2])
                        per_team_best.append({
                            'team_normalized': team_norm,
                            'team_display': kteam['team_display'],
                            'best_platform': best[0],
                            'best_source': best[1],
                            'best_price': best[2],
                            'best_american_odds': best[3]
                        })
            
            comparison_item = {
                "title": comp.question,
                "price_spread": specific_spread,
                "best_platform": comp.best_platform.value,
                "arbitrage_opportunity": comp.arbitrage_opportunity,
                "kalshi_by_team": kalshi_by_team,
                "per_team_best": per_team_best,
                "polymarket": {
                    "market_id": poly_market.market_id if poly_market else None,
                    "outcomes": [
                        {
                            "name": o.name,
                            "price": o.price,
                            "american_odds": o.american_odds
                        } for o in poly_market.outcomes
                    ] if poly_market else [],
                    "volume": poly_market.total_volume if poly_market else 0,
                    "liquidity": poly_market.liquidity if poly_market else 0,
                    "start_time": poly_market.start_time.isoformat() if poly_market and poly_market.start_time else None
                } if poly_market else None,
                "kalshi": {
                    "market_id": best_kalshi_market.market_id if best_kalshi_market else None,
                    "outcomes": [
                        {
                            "name": o.name,
                            "price": o.price,
                            "american_odds": o.american_odds
                        } for o in best_kalshi_market.outcomes
                    ] if best_kalshi_market else [],
                    "volume": best_kalshi_market.total_volume if best_kalshi_market else 0,
                    "liquidity": best_kalshi_market.liquidity if best_kalshi_market else 0,
                    "start_time": best_kalshi_market.start_time.isoformat() if best_kalshi_market and best_kalshi_market.start_time else None
                } if best_kalshi_market else None
            }
            comparison_data.append(comparison_item)
        
        return {
            "comparisons": comparison_data,
            "summary": {
                "total_comparisons": len(comparison_data),
                "polymarket_markets": len(game_markets),
                "kalshi_markets": len(kalshi_markets),
                "arbitrage_opportunities": sum(1 for c in comparison_data if c.get("arbitrage_opportunity", False))
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket feeds removed


@app.get("/nfl/traditional")
async def get_nfl_traditional_odds():
    """
    Get NFL odds from traditional sportsbooks via Odds API
    """
    try:
        games = odds_client.fetch_nfl_odds()
        
        if not games:
            return {
                "games": [],
                "summary": {
                    "total_games": 0,
                    "bookmakers": 0
                }
            }
        
        game_data = []
        for game in games:
            best_odds = odds_client.get_best_odds_for_game(game)
            all_odds = odds_client.get_all_odds_for_game(game)
            
            game_item = {
                "title": f"{game['away_team']} @ {game['home_team']}",
                "commence_time": game.get('commence_time'),
                "home_team": game['home_team'],
                "away_team": game['away_team'],
                "best_odds": best_odds,
                "all_odds": all_odds
            }
            game_data.append(game_item)
        
        return {
            "games": game_data,
            "summary": {
                "total_games": len(game_data),
                "bookmakers": len(games[0]['bookmakers']) if games else 0
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


 


@app.get("/politics")
async def get_politics_markets():
    """
    Get politics market comparisons from Polymarket and Kalshi
    """
    try:
        politics_mappings = MANUAL_MAPPINGS.get('politics', [])
        
        if not politics_mappings:
            return {
                "comparisons": [],
                "summary": {
                    "total_comparisons": 0
                }
            }
        
        comparison_data = []
        
        for mapping in politics_mappings:
            poly_id = mapping.get('polymarket_id')
            kalshi_id = mapping.get('kalshi_id')
            description = mapping.get('description', 'Unknown Market')
            
            if not poly_id or not kalshi_id:
                continue
            
            try:
                # Fetch markets
                poly_market = poly_client.fetch_market_by_id(poly_id)
                kalshi_markets = kalshi_client.fetch_market_by_event_ticker(kalshi_id)
                kalshi_market = kalshi_markets[0] if kalshi_markets else None
                
                if not poly_market or not kalshi_market:
                    continue
                
                # Get Yes prices
                poly_yes_price = None
                kalshi_yes_price = None
                
                for outcome in poly_market.outcomes:
                    if 'yes' in outcome.name.lower():
                        poly_yes_price = outcome.price
                        break
                
                for outcome in kalshi_market.outcomes:
                    if 'yes' in outcome.name.lower():
                        kalshi_yes_price = outcome.price
                        break
                
                if not poly_yes_price or not kalshi_yes_price:
                    continue
                
                # Calculate spread
                price_spread = abs(poly_yes_price - kalshi_yes_price) * 100
                best_platform = "polymarket" if poly_yes_price > kalshi_yes_price else "kalshi"
                
                comparison_item = {
                    "title": description,
                    "price_spread": price_spread,
                    "best_platform": best_platform,
                    "arbitrage_opportunity": price_spread > 5.0,
                    "polymarket": {
                        "market_id": poly_market.market_id,
                        "outcomes": [
                            {
                                "name": o.name,
                                "price": o.price,
                                "american_odds": o.american_odds
                            } for o in poly_market.outcomes
                        ],
                        "volume": poly_market.total_volume,
                        "liquidity": poly_market.liquidity
                    },
                    "kalshi": {
                        "market_id": kalshi_market.market_id,
                        "outcomes": [
                            {
                                "name": o.name,
                                "price": o.price,
                                "american_odds": o.american_odds
                            } for o in kalshi_market.outcomes
                        ],
                        "volume": kalshi_market.total_volume,
                        "liquidity": kalshi_market.liquidity
                    }
                }
                comparison_data.append(comparison_item)
                
            except Exception as e:
                print(f"Error processing politics market {description}: {e}")
                continue
        
        return {
            "comparisons": comparison_data,
            "summary": {
                "total_comparisons": len(comparison_data),
                "arbitrage_opportunities": sum(1 for c in comparison_data if c.get("arbitrage_opportunity", False))
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


 


@app.get("/crypto")
async def get_crypto_markets():
    """
    Get crypto market comparisons from Polymarket and Kalshi
    """
    try:
        crypto_mappings = MANUAL_MAPPINGS.get('crypto', [])
        
        if not crypto_mappings:
            return {
                "comparisons": [],
                "summary": {
                    "total_comparisons": 0,
                    "arbitrage_opportunities": 0
                },
                "timestamp": datetime.now().isoformat()
            }
        
        comparison_data = []
        
        for mapping in crypto_mappings:
            poly_id = mapping.get('polymarket_id')
            kalshi_id = mapping.get('kalshi_id')
            limitless_id = mapping.get('limitless_id')
            description = mapping.get('description', 'Unknown Market')
            
            # Skip if no IDs are provided at all
            if not poly_id and not kalshi_id and not limitless_id:
                continue
            
            try:
                # Fetch markets (only if IDs are provided)
                poly_market = poly_client.fetch_market_by_id(poly_id) if poly_id else None
                kalshi_market = None
                if kalshi_id:
                    kalshi_markets = kalshi_client.fetch_market_by_event_ticker(kalshi_id)
                    kalshi_market = kalshi_markets[0] if kalshi_markets else None
                limitless_market = limitless_client.fetch_market_by_id(limitless_id) if limitless_id else None
                
                # Skip only if we have no valid markets
                valid_markets = [m for m in [poly_market, kalshi_market, limitless_market] if m is not None]
                if len(valid_markets) < 1:
                    continue
                
                # Get Yes prices (only for available markets)
                poly_yes_price = None
                kalshi_yes_price = None
                limitless_yes_price = None
                
                if poly_market:
                    for outcome in poly_market.outcomes:
                        if 'yes' in outcome.name.lower():
                            poly_yes_price = outcome.price
                            break
                
                if kalshi_market:
                    for outcome in kalshi_market.outcomes:
                        if 'yes' in outcome.name.lower():
                            kalshi_yes_price = outcome.price
                            break
                
                if limitless_market:
                    for outcome in limitless_market.outcomes:
                        if 'yes' in outcome.name.lower():
                            limitless_yes_price = outcome.price
                            break
                
                # Get valid prices
                valid_prices = []
                if poly_yes_price is not None:
                    valid_prices.append(("polymarket", poly_yes_price))
                if kalshi_yes_price is not None:
                    valid_prices.append(("kalshi", kalshi_yes_price))
                if limitless_yes_price is not None:
                    valid_prices.append(("limitless", limitless_yes_price))
                
                if len(valid_prices) < 1:
                    continue
                
                # Calculate spread (find max and min prices across available platforms)
                prices = [price for _, price in valid_prices]
                max_price = max(prices)
                min_price = min(prices)
                
                # If only 1 platform, spread is 0
                price_spread = (max_price - min_price) * 100 if len(valid_prices) > 1 else 0
                
                # Determine best platform
                best_platform = next(platform for platform, price in valid_prices if price == max_price)
                
                comparison_item = {
                    "title": description,
                    "price_spread": price_spread,
                    "best_platform": best_platform,
                    "arbitrage_opportunity": price_spread > 5.0,
                    "polymarket": {
                        "market_id": poly_market.market_id,
                        "outcomes": [
                            {
                                "name": o.name,
                                "price": o.price,
                                "american_odds": o.american_odds
                            } for o in poly_market.outcomes
                        ],
                        "volume": poly_market.total_volume,
                        "liquidity": poly_market.liquidity
                    } if poly_market else None,
                    "kalshi": {
                        "market_id": kalshi_market.market_id,
                        "outcomes": [
                            {
                                "name": o.name,
                                "price": o.price,
                                "american_odds": o.american_odds
                            } for o in kalshi_market.outcomes
                        ],
                        "volume": kalshi_market.total_volume,
                        "liquidity": kalshi_market.liquidity
                    } if kalshi_market else None,
                    "limitless": {
                        "market_id": limitless_market.market_id,
                        "outcomes": [
                            {
                                "name": o.name,
                                "price": o.price,
                                "american_odds": o.american_odds
                            } for o in limitless_market.outcomes
                        ],
                        "volume": limitless_market.total_volume,
                        "liquidity": limitless_market.liquidity
                    } if limitless_market else None
                }
                comparison_data.append(comparison_item)
                
            except Exception as e:
                print(f"Error processing crypto market {description}: {e}")
                continue
        
        return {
            "comparisons": comparison_data,
            "summary": {
                "total_comparisons": len(comparison_data),
                "arbitrage_opportunities": sum(1 for c in comparison_data if c.get("arbitrage_opportunity", False))
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


 


# ===================== Others (external matched markets) =====================
@app.get("/others")
async def get_others_matched_markets(limit: int = Query(10, ge=1, le=100), offset: int = Query(0, ge=0)):
    """
    Proxy external matched markets API (Polymarket + Kalshi) and normalize
    to the same structure used by politics comparisons.
    """
    try:
        global _others_cache_payload, _others_cache_limit, _others_cache_offset, _others_cache_ts
        url = f"https://monitorthesituation.lol/api/bff/matches?top_k=1&limit={limit}&offset={offset}"
        headers = {"accept": "*/*"}
        # Serve from cache when fresh and matching params
        now = time.time()
        if (
            _others_cache_payload is not None
            and _others_cache_limit == limit
            and _others_cache_offset == offset
            and (now - _others_cache_ts) < OTHERS_CACHE_TTL_SECONDS
        ):
            return _others_cache_payload

        # Lock and re-check inside to avoid stampede
        async with _others_cache_lock:
            now = time.time()
            if (
                _others_cache_payload is not None
                and _others_cache_limit == limit
                and _others_cache_offset == offset
                and (now - _others_cache_ts) < OTHERS_CACHE_TTL_SECONDS
            ):
                return _others_cache_payload

            # Run blocking HTTP in a thread to avoid blocking the event loop
            resp = await asyncio.to_thread(requests.get, url, headers=headers, timeout=10)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Upstream matches API error")
        raw = resp.json() or {}

        def to_fraction(val):
            try:
                if val is None:
                    return None
                n = float(val)
                if n > 1:
                    n = max(0.0, min(1.0, n / 100.0))
                else:
                    n = max(0.0, min(1.0, n))
                return n
            except Exception:
                return None

        comparisons = []
        for item in (raw.get("data") or []):
            best = (item.get("best") or {}).get("market") or {}
            source = item.get("source") or {}

            title = best.get("title") or source.get("title") or "Matched Market"

            kalshi_yes = to_fraction(best.get("yes_ask", best.get("yes_bid", best.get("last_price"))))
            poly_yes = to_fraction(source.get("yes_ask", source.get("yes_bid", source.get("last_price"))))

            polymarket = None
            if source:
                polymarket = {
                    "market_id": source.get("market_ref_id") or source.get("id") or "",
                    "outcomes": [
                        {"name": "Yes", "price": poly_yes or 0.0, "american_odds": ""},
                        {"name": "No", "price": 1 - (poly_yes or 0.0), "american_odds": ""},
                    ],
                    "volume": source.get("volume") or 0,
                    "liquidity": float(source.get("liquidity") or 0),
                }

            kalshi = None
            if best:
                kalshi = {
                    "market_id": best.get("market_ref_id") or best.get("id") or "",
                    "outcomes": [
                        {"name": "Yes", "price": kalshi_yes or 0.0, "american_odds": ""},
                        {"name": "No", "price": 1 - (kalshi_yes or 0.0), "american_odds": ""},
                    ],
                    "volume": best.get("volume") or 0,
                    "liquidity": float(best.get("liquidity") or 0),
                }

            spread = 0.0
            if poly_yes is not None and kalshi_yes is not None:
                spread = abs(poly_yes - kalshi_yes) * 100.0
            best_platform = (
                "polymarket" if (poly_yes or 0) > (kalshi_yes or 0) else "kalshi"
            )

            comparisons.append({
                "title": title,
                "price_spread": spread,
                "best_platform": best_platform,
                "arbitrage_opportunity": spread > 5.0,
                "polymarket": polymarket,
                "kalshi": kalshi,
            })

        payload = {
            "comparisons": comparisons,
            "summary": {
                "total_comparisons": len(comparisons),
                "arbitrage_opportunities": sum(1 for c in comparisons if c.get("arbitrage_opportunity")),
            },
            "timestamp": datetime.now().isoformat(),
            "limit": limit,
            "offset": offset,
        }

        # Update cache
        async with _others_cache_lock:
            _others_cache_payload = payload
            _others_cache_limit = limit
            _others_cache_offset = offset
            _others_cache_ts = time.time()

        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


 


def start_server(host: str = "0.0.0.0", port: int = 8000):
    """Start the FastAPI server with robust signal handling."""
    import uvicorn
    import os

    # Zero graceful timeout to avoid hanging on shutdown with active websocket tasks
    config = uvicorn.Config(
        app,
        host=host,
        port=port,
        log_level="info",
        timeout_graceful_shutdown=0,
    )
    server = uvicorn.Server(config)

    def _force_exit(signum, frame):
        try:
            print("\n\n⚠️  Received signal, force-stopping server...\n")
        except Exception:
            pass
        try:
            server.should_exit = True
        except Exception:
            pass
        os._exit(130 if signum == signal.SIGINT else 143)

    # Ensure Ctrl+C/SIGTERM always terminates promptly
    signal.signal(signal.SIGINT, _force_exit)
    signal.signal(signal.SIGTERM, _force_exit)

    server.run()


@app.get("/rundown")
async def get_rundown_markets():
    """
    Get rundown market data from The Rundown API
    """
    try:
        # Using a hardcoded date from the example for demonstration
        event_date = date(2025, 10, 12)
        # Using sport_id=2 (NFL) from the example
        rundown_data = rundown_client.get_events_by_date(sport_id=2, event_date=event_date)
        
        events = rundown_data.get("events", [])
        
        if not events:
            return {
                "events": [],
                "summary": {"total_events": 0, "total_bookmakers": 0},
                "timestamp": datetime.now().isoformat()
            }
            
        processed_events = []
        all_bookmakers = set()

        for event in events:
            home_team = ""
            away_team = ""
            for team in event.get("teams", []):
                if team.get("is_home"):
                    home_team = team.get("name")
                if team.get("is_away"):
                    away_team = team.get("name")

            lines = []
            if "lines" in event and event["lines"]:
                for line_data in event["lines"].values():
                    affiliate_name = line_data.get("affiliate", {}).get("affiliate_name")
                    if affiliate_name:
                        all_bookmakers.add(affiliate_name)
                        moneyline = line_data.get("moneyline", {})
                        lines.append({
                            "affiliate_name": affiliate_name,
                            "moneyline_home": moneyline.get("moneyline_home"),
                            "moneyline_away": moneyline.get("moneyline_away"),
                        })

            processed_events.append({
                "event_id": event.get("event_id"),
                "sport_id": event.get("sport_id"),
                "event_date": event.get("event_date"),
                "home_team": home_team,
                "away_team": away_team,
                "lines": lines
            })

        return {
            "events": processed_events,
            "summary": {
                "total_events": len(processed_events),
                "total_bookmakers": len(all_bookmakers)
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/rundown")
async def ws_rundown(websocket: WebSocket):
    async def fetch():
        return await get_rundown_markets()
    await push_periodic(websocket, fetch)


if __name__ == "__main__":
    start_server(host="0.0.0.0", port=8000)
