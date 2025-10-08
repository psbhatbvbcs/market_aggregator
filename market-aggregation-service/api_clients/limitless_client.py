"""
Limitless Exchange API Client
"""
import requests
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

class LimitlessClient:
    """Client for interacting with Limitless Exchange API"""
    
    def __init__(self):
        self.api_base = "https://api.limitless.exchange"
        
    def fetch_markets(
        self,
        chain_id: int = 2,  # Base chain by default
        page: int = 1,
        limit: int = 100,
        sort_by: str = "newest"
    ) -> List[UnifiedMarket]:
        """
        Fetch active markets from Limitless
        
        Args:
            chain_id: Blockchain ID (2 for Base, 42161 for Arbitrum)
            page: Page number
            limit: Number of markets per page
            sort_by: Sort order (newest, liquidity, volume)
        """
        url = f"{self.api_base}/markets/active/{chain_id}"
        params = {
            "page": page,
            "limit": limit,
            "sortBy": sort_by
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            # Extract markets from response
            raw_markets = data.get("data", []) if isinstance(data, dict) else data
            print(f"Limitless: Fetched {len(raw_markets)} raw markets")
            
            # Convert to unified format
            unified_markets = []
            for raw_market in raw_markets:
                try:
                    unified = self._convert_to_unified(raw_market)
                    if unified:
                        unified_markets.append(unified)
                except Exception as e:
                    print(f"Error converting Limitless market {raw_market.get('id', 'unknown')}: {e}")
                    continue
            
            print(f"Limitless: Converted {len(unified_markets)} markets to unified format")
            return unified_markets
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching Limitless markets: {e}")
            return []
    
    def fetch_market_by_id(self, market_id: str, chain_id: int = 2) -> Optional[UnifiedMarket]:
        """Fetch a single market by ID"""
        url = f"{self.api_base}/markets/{market_id}"
        params = {"chainId": chain_id}
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            raw_market = response.json()
            return self._convert_to_unified(raw_market)
        except requests.exceptions.RequestException as e:
            print(f"Error fetching Limitless market {market_id}: {e}")
            return None
    
    def _convert_to_unified(self, raw_market: Dict[str, Any]) -> Optional[UnifiedMarket]:
        """Convert Limitless market to unified format"""
        try:
            # Extract basic info
            market_id = str(raw_market.get("id"))
            question = raw_market.get("title") or raw_market.get("question", "")
            
            if not market_id or not question:
                return None
            
            # Extract outcomes
            # Limitless typically has binary outcomes with prices
            outcomes_data = raw_market.get("outcomes", [])
            prices = raw_market.get("prices", [])
            
            # If no explicit outcomes, assume binary Yes/No
            if not outcomes_data:
                outcomes_data = ["Yes", "No"]
            
            # Create MarketOutcome objects
            market_outcomes = []
            for i, outcome_name in enumerate(outcomes_data):
                # Get price for this outcome
                if i < len(prices):
                    price = float(prices[i])
                else:
                    # If no price data, use last price or default
                    price = raw_market.get("lastPrice", 0.5)
                
                # Ensure price is valid
                if price <= 0 or price >= 1:
                    price = 0.5
                
                decimal_odds = calculate_decimal_odds(price)
                american_odds = calculate_american_odds(price)
                
                market_outcomes.append(MarketOutcome(
                    name=outcome_name,
                    price=price,
                    decimal_odds=decimal_odds,
                    american_odds=american_odds,
                    volume=raw_market.get("volumeFormatted")
                ))
            
            # If we still don't have outcomes, create default binary outcomes
            if not market_outcomes:
                price = raw_market.get("price", 0.5)
                if isinstance(price, (int, float)) and 0 < price < 1:
                    market_outcomes = [
                        MarketOutcome(
                            name="Yes",
                            price=price,
                            decimal_odds=calculate_decimal_odds(price),
                            american_odds=calculate_american_odds(price),
                            volume=raw_market.get("volumeFormatted")
                        ),
                        MarketOutcome(
                            name="No",
                            price=1.0 - price,
                            decimal_odds=calculate_decimal_odds(1.0 - price),
                            american_odds=calculate_american_odds(1.0 - price),
                            volume=raw_market.get("volumeFormatted")
                        )
                    ]
            
            if not market_outcomes:
                return None
            
            # Determine market type
            market_type = self._determine_market_type(raw_market)
            
            # Parse dates
            start_time = None
            end_time = None
            
            created_at = raw_market.get("createdAt")
            if created_at:
                try:
                    start_time = date_parser.parse(created_at) if isinstance(created_at, str) else datetime.fromtimestamp(created_at)
                except:
                    pass
            
            deadline = raw_market.get("deadline") or raw_market.get("expirationDate")
            if deadline:
                try:
                    end_time = date_parser.parse(deadline) if isinstance(deadline, str) else datetime.fromtimestamp(deadline)
                except:
                    pass
            
            # Extract category
            category = raw_market.get("category") or raw_market.get("tags", [""])[0] if raw_market.get("tags") else None
            
            # Create normalized title and extract teams
            normalized_title = normalize_market_title(question)
            normalized_teams = extract_team_names(question)
            
            # Check if market is active
            is_active = raw_market.get("status") != "closed" and raw_market.get("active", True)
            is_closed = raw_market.get("status") == "closed" or raw_market.get("closed", False)
            
            unified = UnifiedMarket(
                platform=Platform.LIMITLESS,
                market_id=market_id,
                question=question,
                outcomes=market_outcomes,
                market_type=market_type,
                start_time=start_time,
                end_time=end_time,
                category=category,
                total_volume=raw_market.get("volumeFormatted"),
                liquidity=raw_market.get("liquidity"),
                is_active=is_active,
                is_closed=is_closed,
                raw_data=raw_market,
                normalized_title=normalized_title,
                normalized_teams=normalized_teams
            )
            
            return unified
            
        except Exception as e:
            print(f"Error in Limitless _convert_to_unified: {e}")
            return None
    
    def _determine_market_type(self, raw_market: Dict[str, Any]) -> MarketType:
        """Determine the type of market"""
        category = raw_market.get("category", "").lower() if raw_market.get("category") else ""
        title = raw_market.get("title", "").lower()
        tags = [tag.lower() for tag in raw_market.get("tags", [])]
        
        # Check for sports keywords
        sports_keywords = ["sports", "nfl", "nba", "mlb", "nhl", "game", "match", "football", "basketball", "soccer"]
        if any(kw in category or kw in title or any(kw in tag for tag in tags) for kw in sports_keywords):
            return MarketType.SPORTS
        
        # Check for politics keywords
        politics_keywords = ["politics", "election", "president", "senate", "congress"]
        if any(kw in category or kw in title or any(kw in tag for tag in tags) for kw in politics_keywords):
            return MarketType.POLITICS
        
        # Check for crypto keywords
        crypto_keywords = ["crypto", "bitcoin", "btc", "ethereum", "eth", "defi"]
        if any(kw in category or kw in title or any(kw in tag for tag in tags) for kw in crypto_keywords):
            return MarketType.CRYPTO
        
        return MarketType.OTHER


if __name__ == "__main__":
    # Test the client
    client = LimitlessClient()
    
    # Fetch markets from Base chain
    markets = client.fetch_markets(chain_id=2, limit=10)
    
    print(f"\nFetched {len(markets)} markets from Limitless")
    for market in markets[:3]:
        print(f"\n{market.platform.value}: {market.question}")
        for outcome in market.outcomes:
            print(f"  - {outcome.name}: {outcome.american_odds} ({outcome.price:.2%})")

