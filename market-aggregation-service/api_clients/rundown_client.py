import os
import requests
from datetime import date
from typing import Dict, Any, Optional

class RundownClient:
    """
    Client for The Rundown API.
    """
    def __init__(self, api_key: Optional[str]):
        if not api_key:
            raise ValueError("RundownClient requires an api_key")
        self.api_key = api_key
        self.api_host = "therundown-therundown-v1.p.rapidapi.com"
        self.api_base = f"https://{self.api_host}"
        self.headers = {
            "x-rapidapi-key": self.api_key,
            "x-rapidapi-host": self.api_host,
        }

    def get_events_by_date(self, sport_id: int, event_date: date) -> Dict[str, Any]:
        """Fetch events for a given sport and date."""
        if not self.api_key:
            print("Warning: No API key provided to RundownClient. The client will not work.")
            return {"events": []}
            
        date_str = event_date.strftime("%Y-%m-%d")
        url = f"{self.api_base}/sports/{sport_id}/events/{date_str}"
        params = {"include": "scores"}
        
        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=30)
            response.raise_for_status()
            # The API returns a dictionary with an 'events' key which is a list of event objects.
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching The Rundown events: {e}")
            return None
