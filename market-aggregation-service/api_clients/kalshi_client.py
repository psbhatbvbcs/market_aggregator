"""
Kalshi API Client
"""
import requests
import jwt
import time
import os
from typing import List, Optional, Dict, Any
from datetime import datetime
from dateutil import parser as date_parser
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import sys
import configparser

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import (
    UnifiedMarket, MarketOutcome, Platform, MarketType,
    calculate_decimal_odds, calculate_american_odds,
    normalize_market_title, extract_team_names
)

# Read configuration for fallback
config = configparser.ConfigParser()
config.read(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'config'))

class KalshiClient:
    """Client for interacting with Kalshi API"""
    
    def __init__(self, api_key: Optional[str] = None, private_key_path: Optional[str] = None):
        self.api_base = "https://api.elections.kalshi.com/trade-api/v2"
        self.api_key = api_key or os.getenv("KALSHI_API_KEY") or config.get('API_KEYS', 'KALSHI_API_KEY', fallback=None)
        self.private_key_path = private_key_path or os.getenv("KALSHI_PRIVATE_KEY_PATH")
        self.token = None
        self.token_expiry = 0
        
    def _load_private_key(self) -> Optional[str]:
        """Load RSA private key from file"""
        if not self.private_key_path or not os.path.exists(self.private_key_path):
            return None
            
        try:
            with open(self.private_key_path, 'rb') as key_file:
                private_key = serialization.load_pem_private_key(
                    key_file.read(),
                    password=None,
                    backend=default_backend()
                )
                # Convert to PEM string
                pem = private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                )
                return pem.decode('utf-8')
        except Exception as e:
            print(f"Error loading private key: {e}")
            return None
    
    def _get_auth_token(self) -> Optional[str]:
        """Get authentication token using API key and private key"""
        # Check if we have a valid cached token
        if self.token and time.time() < self.token_expiry:
            return self.token
            
        if not self.api_key:
            print("Warning: No Kalshi API key configured")
            return None
        
        private_key = self._load_private_key()
        if not private_key:
            print("Warning: No Kalshi private key configured")
            return None
        
        # Create JWT token
        now = int(time.time())
        payload = {
            "iat": now,
            "exp": now + 3600,  # 1 hour expiry
            "sub": self.api_key
        }
        
        try:
            token = jwt.encode(payload, private_key, algorithm='RS256')
            self.token = token
            self.token_expiry = now + 3500  # Refresh 100 seconds before expiry
            return token
        except Exception as e:
            print(f"Error creating JWT token: {e}")
            return None
    
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make authenticated request to Kalshi API"""
        url = f"{self.api_base}{endpoint}"
        headers = {}
        
        # Add auth token if available
        token = self._get_auth_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            response = requests.get(url, params=params, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error making Kalshi request to {endpoint}: {e}")
            return None
    
    def fetch_market_by_event_ticker(self, event_ticker: str) -> List[UnifiedMarket]:
        """
        Fetch a specific market by event ticker
        
        Args:
            event_ticker: The event ticker (e.g., KXXIVISITUSA-26JAN01)
        
        Returns:
            List of UnifiedMarket (Kalshi events can have multiple markets)
        """
        try:
            url = f"https://api.elections.kalshi.com/trade-api/v2/events/{event_ticker}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            event_data = data.get('event', {})
            event_title = event_data.get('title', '')
            markets = data.get('markets', [])
            
            unified_markets = []
            for market_data in markets:
                # If market title is empty, use event title
                if not market_data.get('title'):
                    market_data['title'] = event_title
                
                unified = self._convert_to_unified(market_data)
                if unified:
                    unified_markets.append(unified)
            
            if unified_markets:
                print(f"Kalshi: Fetched {len(unified_markets)} market(s) from event '{event_ticker}'")
            
            return unified_markets
            
        except Exception as e:
            print(f"Error fetching Kalshi event {event_ticker}: {e}")
            return []
    
    def fetch_markets(self, series_ticker: Optional[str] = None, status: str = "open", limit: int = 100) -> List[UnifiedMarket]:
        """
        Fetch markets from Kalshi
        
        Args:
            series_ticker: Filter by series ticker (e.g., "KXEPLGAME" for esports)
            status: Market status (open, closed, settled)
            limit: Maximum number of markets to fetch
        """
        params = {
            "limit": limit,
            "status": status
        }
        
        if series_ticker:
            params["series_ticker"] = series_ticker
        
        response = self._make_request("/markets", params)
        
        if not response:
            return []
        
        raw_markets = response.get("markets", [])
        print(f"Kalshi: Fetched {len(raw_markets)} raw markets")
        
        # Convert to unified format
        unified_markets = []
        for raw_market in raw_markets:
            try:
                unified = self._convert_to_unified(raw_market)
                if unified:
                    unified_markets.append(unified)
            except Exception as e:
                print(f"Error converting Kalshi market {raw_market.get('ticker', 'unknown')}: {e}")
                continue
        
        print(f"Kalshi: Converted {len(unified_markets)} markets to unified format")
        return unified_markets
    
    def fetch_market_orderbook(self, ticker: str) -> Optional[Dict]:
        """Fetch orderbook for a specific market"""
        return self._make_request(f"/markets/{ticker}/orderbook")
    
    def fetch_event(self, event_ticker: str) -> Optional[Dict]:
        """Fetch event details"""
        response = self._make_request(f"/events/{event_ticker}")
        return response.get("event") if response else None
    
    def _convert_to_unified(self, raw_market: Dict[str, Any]) -> Optional[UnifiedMarket]:
        """Convert Kalshi market to unified format"""
        try:
            # Extract basic info
            ticker = raw_market.get("ticker")
            title = raw_market.get("title", "")
            subtitle = raw_market.get("subtitle", "")
            
            # Combine title and subtitle for question
            question = f"{title}"
            if subtitle and subtitle != title:
                question = f"{title}: {subtitle}"
            
            if not ticker or not question:
                return None
            
            # Kalshi markets are binary (Yes/No)
            # Use ASK prices (what you'd pay to BUY) for comparison
            yes_price = raw_market.get("yes_ask", 0) / 100.0  # Convert cents to probability
            no_price = raw_market.get("no_ask", 0) / 100.0
            
            # If no ask prices, use last prices as fallback
            if yes_price == 0:
                yes_price = raw_market.get("last_price", 50) / 100.0
            if no_price == 0:
                no_price = 1.0 - yes_price
            
            # Ensure prices are valid
            if yes_price <= 0 or yes_price >= 1:
                yes_price = 0.5
            if no_price <= 0 or no_price >= 1:
                no_price = 0.5
            
            # Create outcomes
            market_outcomes = [
                MarketOutcome(
                    name="Yes",
                    price=yes_price,
                    decimal_odds=calculate_decimal_odds(yes_price),
                    american_odds=calculate_american_odds(yes_price),
                    best_bid=raw_market.get("yes_bid", 0) / 100.0,
                    best_ask=raw_market.get("yes_ask", 0) / 100.0,
                    volume=raw_market.get("volume")
                ),
                MarketOutcome(
                    name="No",
                    price=no_price,
                    decimal_odds=calculate_decimal_odds(no_price),
                    american_odds=calculate_american_odds(no_price),
                    best_bid=raw_market.get("no_bid", 0) / 100.0,
                    best_ask=raw_market.get("no_ask", 0) / 100.0,
                    volume=raw_market.get("volume")
                )
            ]
            
            # Determine market type
            market_type = self._determine_market_type(raw_market)
            
            # Parse dates
            start_time = None
            end_time = None
            
            # Use expected_expiration_time for actual game time (not open_time which is market creation)
            game_time = raw_market.get("expected_expiration_time")
            if game_time:
                try:
                    start_time = datetime.fromisoformat(game_time.replace('Z', '+00:00'))
                except:
                    pass
            
            close_time = raw_market.get("close_time")
            if close_time:
                try:
                    end_time = datetime.fromisoformat(close_time.replace('Z', '+00:00'))
                except:
                    pass
            
            # Extract category
            category = raw_market.get("category")
            
            # Create normalized title and extract teams
            normalized_title = normalize_market_title(question)
            normalized_teams = extract_team_names(question)
            
            # Determine if market is active/closed
            status = raw_market.get("status", "")
            is_active = status == "open"
            is_closed = status in ["closed", "settled"]
            
            unified = UnifiedMarket(
                platform=Platform.KALSHI,
                market_id=ticker,
                question=question,
                outcomes=market_outcomes,
                market_type=market_type,
                start_time=start_time,
                end_time=end_time,
                category=category,
                subcategory=raw_market.get("series_ticker"),
                total_volume=raw_market.get("volume"),
                liquidity=float(raw_market.get("liquidity_dollars", "0").replace(",", "")) if raw_market.get("liquidity_dollars") else raw_market.get("liquidity", 0),
                is_active=is_active,
                is_closed=is_closed,
                raw_data=raw_market,
                normalized_title=normalized_title,
                normalized_teams=normalized_teams
            )
            
            # Store additional stats in raw_data for easy access
            unified.raw_data['volume_24h'] = raw_market.get('volume_24h', 0)
            unified.raw_data['open_interest'] = raw_market.get('open_interest', 0)
            unified.raw_data['liquidity'] = unified.liquidity
            
            return unified
            
        except Exception as e:
            print(f"Error in Kalshi _convert_to_unified: {e}")
            return None
    
    def _determine_market_type(self, raw_market: Dict[str, Any]) -> MarketType:
        """Determine the type of market"""
        category = raw_market.get("category", "").lower()
        event_ticker = raw_market.get("event_ticker", "").lower()
        ticker = raw_market.get("ticker", "").lower()
        title = raw_market.get("title", "").lower()
        
        # Check for sports keywords
        sports_keywords = ["nfl", "nba", "mlb", "nhl", "game", "match", "football", "basketball", "soccer"]
        if any(kw in event_ticker or kw in ticker or kw in title or kw in category for kw in sports_keywords):
            return MarketType.SPORTS
        
        # Check for politics keywords
        politics_keywords = ["election", "president", "senate", "congress", "politics"]
        if any(kw in event_ticker or kw in ticker or kw in title or kw in category for kw in politics_keywords):
            return MarketType.POLITICS
        
        # Check for crypto keywords
        crypto_keywords = ["crypto", "bitcoin", "btc", "ethereum", "eth"]
        if any(kw in event_ticker or kw in ticker or kw in title for kw in crypto_keywords):
            return MarketType.CRYPTO
        
        return MarketType.OTHER


if __name__ == "__main__":
    # Test the client
    client = KalshiClient()
    
    # Fetch open markets
    markets = client.fetch_markets(status="open", limit=10)
    
    print(f"\nFetched {len(markets)} markets from Kalshi")
    for market in markets[:3]:
        print(f"\n{market.platform.value}: {market.question}")
        for outcome in market.outcomes:
            print(f"  - {outcome.name}: {outcome.american_odds} ({outcome.price:.2%})")

