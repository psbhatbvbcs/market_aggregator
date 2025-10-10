import requests
from typing import Optional

class DomeAPIClient:
    BASE_URL = "https://api.domeapi.io/v1"

    def __init__(self, api_key: Optional[str]):
        if not api_key:
            raise ValueError("DomeAPIClient requires an api_key")
        self.api_key = api_key
        self.headers = {
            "accept": "application/json",
            "x-api-key": self.api_key
        }

    def get_matching_markets_by_slugs(self, polymarket_slugs: list = None, kalshi_tickers: list = None):
        if not polymarket_slugs and not kalshi_tickers:
            return None
        
        endpoint = f"{self.BASE_URL}/matching-markets/sports/"
        params = {}
        if polymarket_slugs:
            params["polymarket_market_slug"] = polymarket_slugs
        if kalshi_tickers:
            params["kalshi_event_ticker"] = kalshi_tickers
            
        try:
            response = requests.get(endpoint, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json().get('markets')
        except requests.exceptions.RequestException as e:
            print(f"Error fetching matching markets by slugs from Dome API: {e}")
            return None

    def get_matching_markets_by_sport_and_date(self, sport: str, date: str):
        if not sport or not date:
            return None
        
        endpoint = f"{self.BASE_URL}/matching-markets/sports/{sport}/"
        params = {"date": date}
        
        try:
            response = requests.get(endpoint, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json().get('markets')
        except requests.exceptions.RequestException as e:
            print(f"Error fetching matching markets by sport and date from Dome API: {e}")
            return None

if __name__ == '__main__':
    dome_client = DomeAPIClient()
    # Example usage:
    markets = dome_client.get_matching_markets_by_sport_and_date('nfl', '2025-10-12')
    if markets:
        print(markets)
    
    # markets_by_slug = dome_client.get_matching_markets_by_slugs(polymarket_slugs=['nfl-ari-den-2025-08-16'])
    # if markets_by_slug:
    #     print(markets_by_slug)
