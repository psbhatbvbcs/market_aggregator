"""
The Odds API Client for traditional sportsbooks
"""
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from models import UnifiedMarket, MarketOutcome, MarketType, Platform


class OddsAPIClient:
    """Client for The Odds API to fetch traditional sportsbook odds"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.the-odds-api.com/v4"
    
    def fetch_nfl_odds(self) -> List[Dict[str, Any]]:
        """
        Fetch NFL H2H odds from The Odds API
        
        Returns:
            List of games with odds from multiple bookmakers
        """
        url = f"{self.base_url}/sports/americanfootball_nfl/odds/"
        params = {
            'apiKey': self.api_key,
            'regions': 'us,us2',
            'markets': 'h2h'
        }
        
        try:
            print(f"📡 Fetching NFL odds from The Odds API...")
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            games = response.json()
            print(f"✅ Fetched {len(games)} NFL games from The Odds API")
            
            return games
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching from The Odds API: {e}")
            return []
    
    def get_best_odds_for_game(self, game: Dict[str, Any]) -> Dict[str, Any]:
        """
        Find the best odds for each team across all bookmakers
        
        Args:
            game: Game data with bookmakers
            
        Returns:
            Dictionary with best odds information
        """
        home_team = game.get('home_team', '')
        away_team = game.get('away_team', '')
        
        best_home_odds = None
        best_home_platform = None
        best_away_odds = None
        best_away_platform = None
        
        for bookmaker in game.get('bookmakers', []):
            platform_name = bookmaker.get('title', bookmaker.get('key', ''))
            
            for market in bookmaker.get('markets', []):
                if market.get('key') != 'h2h':
                    continue
                    
                for outcome in market.get('outcomes', []):
                    team_name = outcome.get('name', '')
                    price = outcome.get('price', 0)
                    
                    if team_name == home_team:
                        if best_home_odds is None or price > best_home_odds:
                            best_home_odds = price
                            best_home_platform = platform_name
                    elif team_name == away_team:
                        if best_away_odds is None or price > best_away_odds:
                            best_away_odds = price
                            best_away_platform = platform_name
        
        return {
            'home_team': home_team,
            'away_team': away_team,
            'commence_time': game.get('commence_time'),
            'best_home_odds': best_home_odds,
            'best_home_platform': best_home_platform,
            'best_away_odds': best_away_odds,
            'best_away_platform': best_away_platform,
            'game_id': game.get('id', ''),
            'total_bookmakers': len(game.get('bookmakers', []))
        }
    
    def convert_decimal_to_probability(self, decimal_odds: float) -> float:
        """
        Convert decimal odds to implied probability percentage
        
        Args:
            decimal_odds: Decimal odds (e.g., 2.64)
            
        Returns:
            Probability as percentage (e.g., 37.88)
        """
        if decimal_odds <= 0:
            return 0.0
        return (1 / decimal_odds) * 100
    
    def get_all_odds_for_game(self, game: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get all bookmaker odds for a game
        
        Args:
            game: Game data
            
        Returns:
            List of odds from all bookmakers
        """
        home_team = game.get('home_team', '')
        away_team = game.get('away_team', '')
        all_odds = []
        
        for bookmaker in game.get('bookmakers', []):
            platform_name = bookmaker.get('title', bookmaker.get('key', ''))
            last_update = bookmaker.get('last_update', '')
            
            home_odds = None
            away_odds = None
            
            for market in bookmaker.get('markets', []):
                if market.get('key') != 'h2h':
                    continue
                    
                for outcome in market.get('outcomes', []):
                    team_name = outcome.get('name', '')
                    price = outcome.get('price', 0)
                    
                    if team_name == home_team:
                        home_odds = price
                    elif team_name == away_team:
                        away_odds = price
            
            if home_odds and away_odds:
                all_odds.append({
                    'platform': platform_name,
                    'platform_key': bookmaker.get('key', ''),
                    'home_team': home_team,
                    'away_team': away_team,
                    'home_odds': home_odds,
                    'away_odds': away_odds,
                    'home_probability': self.convert_decimal_to_probability(home_odds),
                    'away_probability': self.convert_decimal_to_probability(away_odds),
                    'last_update': last_update
                })
        
        return all_odds

