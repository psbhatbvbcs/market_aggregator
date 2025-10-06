"""
The Odds API CSV Exporter
Exports traditional sportsbook odds to separate CSV files (one per game)
"""
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List
import os


class OddsAPIExporter:
    """Export The Odds API data to CSV with all platform odds"""
    
    def __init__(self, base_folder: str = "traditional_odds_tracking"):
        """
        Initialize the exporter
        
        Args:
            base_folder: Folder to store CSV files (one per game)
        """
        self.base_folder = base_folder
        self.games_data = {}  # Store data by game
    
    def add_game(self, game_data: Dict[str, Any], all_odds: List[Dict[str, Any]], best_odds: Dict[str, Any]):
        """
        Add a game's odds from all platforms
        
        Args:
            game_data: Raw game data from The Odds API
            all_odds: List of all odds from different platforms
            best_odds: Best odds summary
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        game_time = game_data.get('commence_time', 'N/A')
        home_team = game_data.get('home_team', '')
        away_team = game_data.get('away_team', '')
        game_name = f"{away_team} vs {home_team}"
        
        # Initialize game data if not exists
        if game_name not in self.games_data:
            self.games_data[game_name] = []
        
        # Create a row for each platform
        for odds in all_odds:
            platform = odds.get('platform', 'Unknown')
            
            # Convert decimal odds to probability
            home_prob = odds.get('home_probability', 0)
            away_prob = odds.get('away_probability', 0)
            
            row = {
                'Timestamp': timestamp,
                'Game Time': game_time,
                'Platform': platform,
                'Platform Key': odds.get('platform_key', ''),
                'Home Team': home_team,
                'Home Odds (Decimal)': odds.get('home_odds', 0),
                'Home Probability (%)': f"{home_prob:.2f}",
                'Away Team': away_team,
                'Away Odds (Decimal)': odds.get('away_odds', 0),
                'Away Probability (%)': f"{away_prob:.2f}",
                'Last Update': odds.get('last_update', ''),
            }
            
            # Mark if this platform has the best odds
            if platform == best_odds.get('best_home_platform'):
                row['Best Home Odds'] = '✓'
            else:
                row['Best Home Odds'] = ''
                
            if platform == best_odds.get('best_away_platform'):
                row['Best Away Odds'] = '✓'
            else:
                row['Best Away Odds'] = ''
            
            self.games_data[game_name].append(row)
        
        # Add separator row after each iteration (batch of platforms)
        separator = {
            'Timestamp': '---',
            'Game Time': '---',
            'Platform': '---',
            'Platform Key': '---',
            'Home Team': '---',
            'Home Odds (Decimal)': 0,
            'Home Probability (%)': '---',
            'Away Team': '---',
            'Away Odds (Decimal)': 0,
            'Away Probability (%)': '---',
            'Last Update': '---',
            'Best Home Odds': '---',
            'Best Away Odds': '---',
        }
        self.games_data[game_name].append(separator)
    
    def export(self) -> List[str]:
        """
        Export data to separate CSV files (one per game)
        
        Returns:
            List of created file paths
        """
        if not self.games_data:
            print("⚠️  No Odds API data to export")
            return []
        
        # Create folder if it doesn't exist
        if not os.path.exists(self.base_folder):
            os.makedirs(self.base_folder)
        
        exported_files = []
        
        try:
            for game_name, rows in self.games_data.items():
                if not rows:
                    continue
                
                # Sanitize filename
                safe_filename = game_name.replace('/', '_').replace('\\', '_')
                filename = os.path.join(self.base_folder, f"{safe_filename}.csv")
                
                # Create DataFrame from new rows
                new_df = pd.DataFrame(rows)
                
                # If file exists, append to it
                if os.path.exists(filename):
                    existing_df = pd.read_csv(filename)
                    
                    # Remove blank rows
                    existing_df = existing_df.dropna(how='all')
                    
                    # Combine (separators already added in add_game method)
                    combined_df = pd.concat([existing_df, new_df], ignore_index=True)
                else:
                    combined_df = new_df
                
                # Save to CSV
                combined_df.to_csv(filename, index=False)
                exported_files.append(filename)
            
            print(f"\n📊 Traditional Sportsbooks Odds:")
            print(f"   ✅ Exported {len(exported_files)} game(s) to separate CSV files")
            for filepath in exported_files:
                print(f"   📁 {filepath}")
            
            # Clear games data for next iteration
            self.games_data = {}
            
            return exported_files
            
        except Exception as e:
            print(f"❌ Error exporting Odds API data: {e}")
            import traceback
            traceback.print_exc()
            return []

