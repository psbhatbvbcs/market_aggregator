"""
Politics Market Tracker

Continuously tracks manually mapped politics markets every 5 seconds.
Exports to Excel and saves to MongoDB.
"""

import sys
import os
import time
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api_clients.polymarket_client import PolymarketClient
from api_clients.kalshi_client import KalshiClient
from market_mappings import MANUAL_MAPPINGS
from db_manager import MarketDBManager
from simple_excel_exporter import SimpleMarketExporter


class PoliticsMarketTracker:
    """Tracks politics markets continuously"""
    
    def __init__(self, interval_seconds: int = 5, use_db: bool = True, use_excel: bool = True):
        """
        Initialize tracker
        
        Args:
            interval_seconds: Update interval (default: 5 seconds)
            use_db: Whether to save to MongoDB
            use_excel: Whether to export to Excel
        """
        self.interval = interval_seconds
        self.use_db = use_db
        self.use_excel = use_excel
        
        self.poly_client = PolymarketClient()
        self.kalshi_client = KalshiClient()
        
        if self.use_db:
            try:
                self.db = MarketDBManager()
                print("✅ Connected to MongoDB")
            except Exception as e:
                print(f"⚠️  Could not connect to MongoDB: {e}")
                print("   Make sure MongoDB is running: mongod")
                self.use_db = False
        
        self.iteration = 0
    
    def fetch_market_pair(self, poly_id: str, kalshi_id: str):
        """
        Fetch a market pair from both platforms
        
        Args:
            poly_id: Polymarket condition ID
            kalshi_id: Kalshi event ticker
        
        Returns:
            tuple: (polymarket_market, kalshi_markets)
        """
        # Fetch from Polymarket
        poly_market = self.poly_client.fetch_market_by_id(poly_id)
        
        # Fetch from Kalshi
        kalshi_markets = self.kalshi_client.fetch_market_by_event_ticker(kalshi_id)
        kalshi_market = kalshi_markets[0] if kalshi_markets else None
        
        return poly_market, kalshi_market
    
    def compare_markets(self, poly_market, kalshi_market):
        """
        Generate comparison data
        
        Args:
            poly_market: UnifiedMarket from Polymarket
            kalshi_market: UnifiedMarket from Kalshi
        
        Returns:
            dict: Comparison data
        """
        if not poly_market or not kalshi_market:
            return None
        
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
            return None
        
        # Calculate spread
        price_spread = abs(poly_yes_price - kalshi_yes_price) * 100
        
        # Determine best platform
        best_platform = "polymarket" if poly_yes_price > kalshi_yes_price else "kalshi"
        
        return {
            "poly_yes_price": poly_yes_price,
            "kalshi_yes_price": kalshi_yes_price,
            "price_spread": price_spread,
            "best_platform": best_platform,
            "arbitrage_opportunity": price_spread > 5.0,  # Arbitrary threshold
        }
    
    def track_iteration(self):
        """Run one tracking iteration"""
        self.iteration += 1
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        print("\n" + "=" * 70)
        print(f"ITERATION {self.iteration} - {timestamp}")
        print("=" * 70)
        
        # Get politics markets from manual mappings
        politics_mappings = MANUAL_MAPPINGS.get('politics', [])
        
        if not politics_mappings:
            print("⚠️  No politics markets configured in market_mappings.py")
            return
        
        print(f"\n📊 Tracking {len(politics_mappings)} market pair(s)...\n")
        
        # Excel exporter for this iteration (separate file per market)
        if self.use_excel:
            exporter = SimpleMarketExporter("politics_tracking")
        
        for i, mapping in enumerate(politics_mappings, 1):
            poly_id = mapping.get('polymarket_id')
            kalshi_id = mapping.get('kalshi_id')
            description = mapping.get('description', 'Unknown Market')
            
            if not poly_id or not kalshi_id:
                continue
            
            print(f"[{i}/{len(politics_mappings)}] {description}")
            print("-" * 70)
            
            try:
                # Fetch markets
                poly_market, kalshi_market = self.fetch_market_pair(poly_id, kalshi_id)
                
                if not poly_market or not kalshi_market:
                    print("  ⚠️  Could not fetch one or both markets\n")
                    continue
                
                # Compare
                comparison = self.compare_markets(poly_market, kalshi_market)
                
                if not comparison:
                    print("  ⚠️  Could not compare markets\n")
                    continue
                
                # Display
                print(f"  Polymarket: {comparison['poly_yes_price']:.1%} | "
                      f"Vol: ${poly_market.total_volume:,.0f} | "
                      f"Liq: ${poly_market.liquidity:,.0f}")
                print(f"  Kalshi:     {comparison['kalshi_yes_price']:.1%} | "
                      f"Vol: ${kalshi_market.total_volume:,.0f} | "
                      f"Liq: ${kalshi_market.liquidity:,.0f}")
                print(f"  📊 Spread: {comparison['price_spread']:.2f}% | "
                      f"Best: {comparison['best_platform'].upper()}")
                
                # Save to MongoDB
                if self.use_db:
                    try:
                        self.db.save_comparison(
                            poly_id=poly_id,
                            kalshi_id=kalshi_id,
                            market_title=description,
                            polymarket_response=poly_market.raw_data,
                            kalshi_response=kalshi_market.raw_data,
                            comparison_data=comparison,
                            category="politics"
                        )
                        
                        # Also save price snapshot
                        self.db.save_price_snapshot(
                            poly_id=poly_id,
                            kalshi_id=kalshi_id,
                            poly_prices={"yes": comparison['poly_yes_price']},
                            kalshi_prices={"yes": comparison['kalshi_yes_price']}
                        )
                    except Exception as e:
                        print(f"  ⚠️  DB save error: {e}")
                
                # Add to Excel export
                if self.use_excel:
                    exporter.add_comparison(
                        market_title=description,
                        poly_id=poly_id,
                        kalshi_id=kalshi_id,
                        poly_data=poly_market.to_dict(),
                        kalshi_data=kalshi_market.to_dict()
                    )
                
                print()
                
            except Exception as e:
                print(f"  ❌ Error: {e}\n")
                import traceback
                traceback.print_exc()
        
        # Export Excel
        if self.use_excel and exporter.data_rows:
            exporter.export()
        
        print("=" * 70)
        print(f"✅ Iteration {self.iteration} complete")
        print(f"⏰ Next update in {self.interval} seconds...")
        print("=" * 70)
    
    def start(self, max_iterations: int = None):
        """
        Start continuous tracking
        
        Args:
            max_iterations: Maximum number of iterations (None for infinite)
        """
        print("\n" + "🚀" * 35)
        print("POLITICS MARKET TRACKER")
        print("🚀" * 35)
        print(f"\n⏱️  Update Interval: {self.interval} seconds")
        print(f"💾 MongoDB: {'✅ Enabled' if self.use_db else '❌ Disabled'}")
        print(f"📊 Excel Export: {'✅ Enabled' if self.use_excel else '❌ Disabled'}")
        print(f"\n⚠️  Press Ctrl+C to stop\n")
        
        try:
            iteration_count = 0
            while True:
                self.track_iteration()
                
                iteration_count += 1
                if max_iterations and iteration_count >= max_iterations:
                    print("\n✅ Reached maximum iterations")
                    break
                
                # Wait for next iteration
                time.sleep(self.interval)
                
        except KeyboardInterrupt:
            print("\n\n⚠️  Tracker stopped by user")
        except Exception as e:
            print(f"\n\n❌ Tracker error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if self.use_db:
                self.db.close()
            print("\n✅ Tracker shut down cleanly\n")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Track politics markets continuously")
    parser.add_argument("--interval", type=int, default=5, help="Update interval in seconds (default: 5)")
    parser.add_argument("--no-db", action="store_true", help="Disable MongoDB")
    parser.add_argument("--no-excel", action="store_true", help="Disable Excel export")
    parser.add_argument("--max-iterations", type=int, help="Maximum iterations (default: infinite)")
    
    args = parser.parse_args()
    
    tracker = PoliticsMarketTracker(
        interval_seconds=args.interval,
        use_db=not args.no_db,
        use_excel=not args.no_excel
    )
    
    tracker.start(max_iterations=args.max_iterations)

