import os
import requests
from datetime import date
from typing import Dict, Any

class RundownClient:
    """
    Client for The Rundown API.
    Requires RAPIDAPI_KEY environment variable to be set.
    """
    def __init__(self):
        self.api_key = "bc27e7387dmsh38d411a3abc9e35plea17cjsnccd1838ac7b7"
        self.api_host = "therundown-therundown-v1.p.rapidapi.com"
        self.api_base = f"https://{self.api_host}"
        self.headers = {
            "x-rapidapi-key": self.api_key,
            "x-rapidapi-host": self.api_host,
        }

    def get_events_by_date(self, sport_id: int, event_date: date) -> Dict[str, Any]:
        """Fetch events for a given sport and date."""
        if not self.api_key:
            print("Warning: RAPIDAPI_KEY environment variable not set. RundownClient will not work.")
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
            if "403" in str(e) or "not subscribed" in str(e).lower():
                print("API key not subscribed to The Rundown API. Please subscribe on RapidAPI.")
            return {"events": []}
