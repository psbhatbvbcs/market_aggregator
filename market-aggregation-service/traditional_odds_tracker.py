"""
Traditional Sportsbook Odds Tracker
Continuously tracks NFL odds from traditional sportsbooks via The Odds API
"""
import time
import argparse
from datetime import datetime
from api_clients.odds_api_client import OddsAPIClient
from odds_api_exporter import OddsAPIExporter


class TraditionalOddsTracker:
    """Continuous tracker for traditional sportsbook odds"""
    
    def __init__(self, api_key: str, interval: int = 5):
        """
        Initialize tracker
        
        Args:
            api_key: The Odds API key
            interval: Update interval in seconds (default: 5)
        """
        self.api_key = api_key
        self.interval = interval
        self.client = OddsAPIClient(api_key)
        self.exporter = OddsAPIExporter("traditional_odds_tracking")
    
    def fetch_and_export(self):
        """Fetch odds and export to CSV"""
        try:
            # Fetch NFL odds
            games = self.client.fetch_nfl_odds()
            
            if not games:
                print("⚠️  No games found")
                return 0
            
            # Process each game
            game_count = 0
            for game in games:
                best_odds = self.client.get_best_odds_for_game(game)
                all_odds = self.client.get_all_odds_for_game(game)
                
                # Add to exporter
                self.exporter.add_game(
                    game_data=game,
                    all_odds=all_odds,
                    best_odds=best_odds
                )
                game_count += 1
            
            # Export to CSV files
            self.exporter.export()
            
            return game_count
            
        except Exception as e:
            print(f"❌ Error fetching/exporting odds: {e}")
            import traceback
            traceback.print_exc()
            return 0
    
    def run(self, max_iterations: int = None):
        """
        Run the tracker continuously
        
        Args:
            max_iterations: Maximum number of iterations (None for infinite)
        """
        print("\n" + "=" * 70)
        print("TRADITIONAL SPORTSBOOKS ODDS TRACKER")
        print("=" * 70)
        print(f"\n⏱️  Update interval: {self.interval} seconds")
        if max_iterations:
            print(f"🔢 Max iterations: {max_iterations}")
        else:
            print(f"🔄 Running continuously (Ctrl+C to stop)")
        print("\n" + "=" * 70 + "\n")
        
        iteration = 0
        
        try:
            while True:
                iteration += 1
                
                if max_iterations and iteration > max_iterations:
                    print(f"\n✅ Reached maximum iterations ({max_iterations})")
                    break
                
                print(f"\n[Iteration {iteration}] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print("-" * 70)
                
                # Fetch and export
                game_count = self.fetch_and_export()
                
                print(f"\n✅ Iteration {iteration} complete - tracked {game_count} games")
                
                # Wait for next iteration
                if not max_iterations or iteration < max_iterations:
                    print(f"⏰ Next update in {self.interval} seconds...")
                    print("=" * 70)
                    time.sleep(self.interval)
                
        except KeyboardInterrupt:
            print("\n\n⚠️  Tracker stopped by user")
        except Exception as e:
            print(f"\n❌ Tracker error: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n" + "=" * 70)
        print(f"✅ Tracker shut down cleanly after {iteration} iterations")
        print("=" * 70 + "\n")


def main():
    """Main execution"""
    parser = argparse.ArgumentParser(
        description="Track traditional sportsbook odds continuously"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=5,
        help="Update interval in seconds (default: 5)"
    )
    parser.add_argument(
        "--max-iterations",
        type=int,
        default=None,
        help="Maximum number of iterations (default: infinite)"
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default="db06be1d18367c369444aa40d6a25499",
        help="The Odds API key"
    )
    
    args = parser.parse_args()
    
    # Create and run tracker
    tracker = TraditionalOddsTracker(
        api_key=args.api_key,
        interval=args.interval
    )
    
    tracker.run(max_iterations=args.max_iterations)


if __name__ == "__main__":
    main()

