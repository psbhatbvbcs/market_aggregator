"""
Price Tracker - Continuously tracks price changes every 5 seconds
"""
import time
import asyncio
from datetime import datetime
from typing import List, Dict, Optional
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models import MarketComparison, PriceHistory, Platform
from aggregator import MarketAggregator

class PriceTracker:
    """Tracks price changes across platforms at regular intervals"""
    
    def __init__(self, update_interval: int = 5):
        """
        Initialize price tracker
        
        Args:
            update_interval: Seconds between updates (default: 5)
        """
        self.aggregator = MarketAggregator()
        self.update_interval = update_interval
        self.previous_comparisons: List[MarketComparison] = []
        self.price_history: List[PriceHistory] = []
        self.running = False
        
        # Stats
        self.update_count = 0
        self.total_markets_tracked = 0
        self.last_update_time: Optional[datetime] = None
        
    async def start(self):
        """Start the price tracking loop"""
        print("=" * 70)
        print("STARTING PRICE TRACKER")
        print(f"Update Interval: {self.update_interval} seconds")
        print("=" * 70)
        
        self.running = True
        
        try:
            while self.running:
                await self._update_cycle()
                await asyncio.sleep(self.update_interval)
        except KeyboardInterrupt:
            print("\n\nStopping price tracker...")
            self.running = False
        except Exception as e:
            print(f"Error in price tracker: {e}")
            self.running = False
    
    async def _update_cycle(self):
        """Perform one update cycle"""
        self.update_count += 1
        update_start = time.time()
        
        print(f"\n{'=' * 70}")
        print(f"UPDATE CYCLE #{self.update_count} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'=' * 70}")
        
        # Fetch all markets
        markets = self.aggregator.fetch_all_markets(
            include_polymarket=True,
            include_kalshi=True,
            include_limitless=True,
            limit_per_platform=100
        )
        
        if not markets:
            print("⚠️  No markets fetched!")
            return
        
        # Match markets across platforms
        matched_groups = self.aggregator.match_markets()
        
        # Create comparisons
        current_comparisons = self.aggregator.create_comparisons()
        
        # Calculate price deltas if we have previous data
        if self.previous_comparisons:
            current_comparisons = self.aggregator.calculate_price_deltas(self.previous_comparisons)
        
        # Record price history
        self._record_price_history(current_comparisons)
        
        # Update stats
        self.total_markets_tracked = len(markets)
        self.last_update_time = datetime.now()
        
        # Print update summary
        self._print_update_summary(current_comparisons, update_start)
        
        # Store for next cycle
        self.previous_comparisons = current_comparisons
    
    def _record_price_history(self, comparisons: List[MarketComparison]):
        """Record price history for all markets"""
        timestamp = datetime.utcnow()
        
        for comparison in comparisons:
            for market in comparison.markets:
                for outcome in market.outcomes:
                    history_entry = PriceHistory(
                        platform=market.platform,
                        market_id=market.market_id,
                        outcome_name=outcome.name,
                        timestamp=timestamp,
                        price=outcome.price,
                        volume=outcome.volume
                    )
                    self.price_history.append(history_entry)
        
        # Keep only last 1000 entries to prevent memory overflow
        if len(self.price_history) > 1000:
            self.price_history = self.price_history[-1000:]
    
    def _print_update_summary(self, comparisons: List[MarketComparison], start_time: float):
        """Print summary of this update cycle"""
        update_duration = time.time() - start_time
        
        print(f"\n{'-' * 70}")
        print(f"UPDATE SUMMARY")
        print(f"{'-' * 70}")
        print(f"Duration: {update_duration:.2f}s")
        print(f"Total Markets: {self.total_markets_tracked}")
        print(f"Matched Groups: {len(self.aggregator.market_groups)}")
        print(f"Comparisons: {len(comparisons)}")
        
        # Count markets with price changes
        changed_count = sum(1 for c in comparisons if c.price_deltas)
        if changed_count > 0:
            print(f"Markets with Price Changes: {changed_count}")
        
        # Show markets with significant changes
        significant_changes = [
            c for c in comparisons 
            if c.price_deltas and max(abs(d) for d in c.price_deltas.values()) >= 1.0
        ]
        
        if significant_changes:
            print(f"\n⚠️  {len(significant_changes)} markets with significant price changes (≥1%):")
            for comp in significant_changes[:5]:  # Show top 5
                print(f"\n  • {comp.question[:60]}...")
                print(f"    Best: {comp.best_platform.value} @ {comp.best_odds}")
                for platform, delta in comp.price_deltas.items():
                    symbol = "▲" if delta > 0 else "▼" if delta < 0 else "━"
                    print(f"    {symbol} {platform}: {delta:+.2f}%")
        
        # Show arbitrage opportunities
        arb_opportunities = [c for c in comparisons if c.arbitrage_opportunity]
        if arb_opportunities:
            print(f"\n💰 {len(arb_opportunities)} ARBITRAGE OPPORTUNITIES:")
            for comp in arb_opportunities[:3]:  # Show top 3
                print(f"\n  • {comp.question[:60]}...")
                print(f"    Potential Profit: {comp.arbitrage_percentage:.2f}%")
                platforms = [m.platform.value for m in comp.markets]
                print(f"    Platforms: {', '.join(platforms)}")
        
        # Show best odds differentials
        print(f"\n🎯 TOP 3 PRICE DIFFERENTIALS:")
        best_odds = sorted(comparisons, key=lambda c: c.price_spread, reverse=True)[:3]
        for i, comp in enumerate(best_odds, 1):
            print(f"\n  {i}. {comp.question[:60]}...")
            print(f"     Best: {comp.best_platform.value} @ {comp.best_odds} ({comp.best_price:.1%})")
            print(f"     Spread: {comp.price_spread:.2f}%")
            platforms = sorted([m.platform.value for m in comp.markets])
            print(f"     Across: {', '.join(platforms)}")
        
        print(f"\n{'=' * 70}\n")
    
    def stop(self):
        """Stop the price tracker"""
        self.running = False
    
    def get_stats(self) -> Dict:
        """Get current statistics"""
        return {
            "update_count": self.update_count,
            "total_markets_tracked": self.total_markets_tracked,
            "last_update": self.last_update_time.isoformat() if self.last_update_time else None,
            "price_history_entries": len(self.price_history),
            "current_comparisons": len(self.previous_comparisons),
            "running": self.running
        }
    
    def get_price_history(
        self,
        platform: Optional[Platform] = None,
        market_id: Optional[str] = None,
        limit: int = 100
    ) -> List[PriceHistory]:
        """Get price history with optional filtering"""
        filtered = self.price_history
        
        if platform:
            filtered = [h for h in filtered if h.platform == platform]
        
        if market_id:
            filtered = [h for h in filtered if h.market_id == market_id]
        
        # Return most recent entries
        return filtered[-limit:]
    
    def export_to_json(self, filename: str = "market_data.json"):
        """Export current market data to JSON"""
        data = {
            "timestamp": datetime.now().isoformat(),
            "stats": self.get_stats(),
            "comparisons": [c.to_dict() for c in self.previous_comparisons],
            "price_history": [h.to_dict() for h in self.price_history[-100:]]  # Last 100 entries
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"📁 Exported data to {filename}")


async def main():
    """Main entry point for price tracker"""
    tracker = PriceTracker(update_interval=5)
    
    try:
        await tracker.start()
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        tracker.stop()
        
        # Export final data
        tracker.export_to_json("final_market_data.json")
        
        print("\n" + "=" * 70)
        print("FINAL STATISTICS")
        print("=" * 70)
        stats = tracker.get_stats()
        for key, value in stats.items():
            print(f"{key}: {value}")
        print("=" * 70)


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())

