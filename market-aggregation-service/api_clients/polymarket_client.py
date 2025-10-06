"""
Polymarket API Client
"""
import requests
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from dateutil import parser as date_parser
import sys
import os

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import (
    UnifiedMarket, MarketOutcome, Platform, MarketType,
    calculate_decimal_odds, calculate_american_odds,
    normalize_market_title, extract_team_names
)

class PolymarketClient:
    """Client for interacting with Polymarket Gamma API"""
    
    def __init__(self):
        self.gamma_api_base = "https://gamma-api.polymarket.com"
        self.clob_api_base = "https://clob.polymarket.com"
        
    def fetch_markets(
        self,
        limit: int = 100,
        closed: bool = False,
        active: bool = True,
        tag_id: Optional[int] = None,
        start_date_min: Optional[str] = None
    ) -> List[UnifiedMarket]:
        """
        Fetch markets from Polymarket
        
        Args:
            limit: Maximum number of markets to fetch
            closed: Whether to include closed markets
            active: Whether to include only active markets
            tag_id: Filter by tag ID (category)
            start_date_min: Minimum start date filter
        """
        url = f"{self.gamma_api_base}/markets"
        
        params = {
            "limit": limit,
            "closed": closed,
            "active": active,
            "archived": False
        }
        
        if tag_id:
            params["tag_id"] = tag_id
        if start_date_min:
            params["start_date_min"] = start_date_min
            
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            raw_markets = response.json()
            
            print(f"Polymarket: Fetched {len(raw_markets)} raw markets")
            
            # Convert to unified format
            unified_markets = []
            for raw_market in raw_markets:
                try:
                    unified = self._convert_to_unified(raw_market)
                    if unified:
                        unified_markets.append(unified)
                except Exception as e:
                    print(f"Error converting Polymarket market {raw_market.get('id', 'unknown')}: {e}")
                    continue
            
            print(f"Polymarket: Converted {len(unified_markets)} markets to unified format")
            return unified_markets
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching Polymarket markets: {e}")
            return []
    
    def fetch_market_by_id(self, market_id: str) -> Optional[UnifiedMarket]:
        """Fetch a single market by condition ID"""
        url = f"{self.gamma_api_base}/markets"
        params = {"condition_ids": market_id}
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            raw_markets = response.json()
            
            if raw_markets and len(raw_markets) > 0:
                return self._convert_to_unified(raw_markets[0])
            return None
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching Polymarket market {market_id}: {e}")
            return None
    
    def get_orderbook(self, token_id: str) -> Optional[Dict[str, Any]]:
        """Get orderbook for a specific token"""
        url = f"{self.clob_api_base}/book"
        params = {"token_id": token_id}
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching orderbook for token {token_id}: {e}")
            return None
    
    def get_market_price(self, token_id: str, side: str = "BUY") -> Optional[float]:
        """Get market price for a specific token"""
        url = f"{self.clob_api_base}/price"
        params = {"token_id": token_id, "side": side}
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            price_data = response.json()
            return float(price_data.get("price", 0))
        except requests.exceptions.RequestException as e:
            print(f"Error fetching price for token {token_id}: {e}")
            return None
    
    def _convert_to_unified(self, raw_market: Dict[str, Any]) -> Optional[UnifiedMarket]:
        """Convert Polymarket market to unified format"""
        try:
            # Extract basic info
            market_id = raw_market.get("conditionId") or raw_market.get("id")
            question = raw_market.get("question", "")
            
            if not market_id or not question:
                return None
            
            # Parse outcomes and prices
            outcomes_str = raw_market.get("outcomes", "[]")
            prices_str = raw_market.get("outcomePrices", "[]")
            
            try:
                outcomes = json.loads(outcomes_str) if isinstance(outcomes_str, str) else outcomes_str
                prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
            except json.JSONDecodeError:
                return None
            
            if not outcomes or not prices or len(outcomes) != len(prices):
                return None
            
            # Create MarketOutcome objects
            market_outcomes = []
            for outcome_name, price_str in zip(outcomes, prices):
                try:
                    price = float(price_str)
                    if price <= 0 or price >= 1:
                        continue
                    
                    decimal_odds = calculate_decimal_odds(price)
                    american_odds = calculate_american_odds(price)
                    
                    market_outcomes.append(MarketOutcome(
                        name=outcome_name,
                        price=price,
                        decimal_odds=decimal_odds,
                        american_odds=american_odds,
                        volume=None
                    ))
                except (ValueError, TypeError):
                    continue
            
            if not market_outcomes:
                return None
            
            # Determine market type from tags/events
            market_type = self._determine_market_type(raw_market)
            
            # Parse dates
            start_time = None
            end_time = None
            
            game_start_time = raw_market.get("gameStartTime")
            if game_start_time:
                try:
                    start_time = date_parser.parse(game_start_time)
                except:
                    pass
            
            end_date = raw_market.get("endDate")
            if end_date:
                try:
                    end_time = date_parser.parse(end_date)
                except:
                    pass
            
            # Extract category info
            category = raw_market.get("category")
            tags = raw_market.get("tags", [])
            tag_name = tags[0].get("label") if tags and len(tags) > 0 else None
            
            # Extract events info
            events = raw_market.get("events", [])
            sport = None
            league = None
            if events and len(events) > 0:
                event = events[0]
                sport = event.get("sportLabel")
                league = event.get("leagueName")
            
            # Create normalized title and extract teams
            normalized_title = normalize_market_title(question)
            normalized_teams = extract_team_names(question)
            
            # Create unified market
            unified = UnifiedMarket(
                platform=Platform.POLYMARKET,
                market_id=market_id,
                question=question,
                outcomes=market_outcomes,
                market_type=market_type,
                start_time=start_time,
                end_time=end_time,
                category=category,
                subcategory=tag_name,
                sport=sport,
                league=league,
                total_volume=raw_market.get("volumeNum"),
                liquidity=raw_market.get("liquidityNum"),
                is_active=raw_market.get("active", True),
                is_closed=raw_market.get("closed", False),
                raw_data=raw_market,
                normalized_title=normalized_title,
                normalized_teams=normalized_teams
            )
            
            return unified
            
        except Exception as e:
            print(f"Error in _convert_to_unified: {e}")
            return None
    
    def _determine_market_type(self, raw_market: Dict[str, Any]) -> MarketType:
        """Determine the type of market based on tags and events"""
        # Check tags
        tags = raw_market.get("tags", [])
        if tags:
            tag_labels = [tag.get("label", "").lower() for tag in tags]
            for label in tag_labels:
                if any(sport in label for sport in ["nfl", "nba", "mlb", "nhl", "soccer", "football", "basketball", "tennis", "ufc", "mma"]):
                    return MarketType.SPORTS
                if "politics" in label or "election" in label:
                    return MarketType.POLITICS
                if "crypto" in label or "bitcoin" in label or "ethereum" in label:
                    return MarketType.CRYPTO
        
        # Check events
        events = raw_market.get("events", [])
        if events and len(events) > 0:
            return MarketType.SPORTS
        
        # Check category
        category = raw_market.get("category", "").lower()
        if "sports" in category:
            return MarketType.SPORTS
        if "politics" in category:
            return MarketType.POLITICS
        if "crypto" in category:
            return MarketType.CRYPTO
        
        return MarketType.OTHER


if __name__ == "__main__":
    # Test the client
    client = PolymarketClient()
    markets = client.fetch_markets(limit=10, active=True)
    
    print(f"\nFetched {len(markets)} markets from Polymarket")
    for market in markets[:3]:
        print(f"\n{market.platform.value}: {market.question}")
        for outcome in market.outcomes:
            print(f"  - {outcome.name}: {outcome.american_odds} ({outcome.price:.2%})")

