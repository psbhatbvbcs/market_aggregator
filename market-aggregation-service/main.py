"""
Main entry point for the Market Aggregation Service
"""
import argparse
import asyncio
import sys
import os
import signal

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from aggregator import MarketAggregator
from price_tracker import PriceTracker
from api_server import start_server


def _force_exit(signum, frame):
    # Immediate, reliable exit on Ctrl+C / SIGTERM
    try:
        print("\n\n⚠️  Received signal, force-stopping...\n")
    except Exception:
        pass
    os._exit(130 if signum == signal.SIGINT else 143)


# Install signal handlers early so all modes honor Ctrl+C
signal.signal(signal.SIGINT, _force_exit)
signal.signal(signal.SIGTERM, _force_exit)

def run_single_aggregation():
    """Run a single aggregation and print results"""
    print("\n" + "=" * 70)
    print("RUNNING SINGLE MARKET AGGREGATION")
    print("=" * 70 + "\n")
    
    aggregator = MarketAggregator()
    
    # Fetch markets from all platforms
    markets = aggregator.fetch_all_markets(
        include_polymarket=True,
        include_kalshi=True,
        include_limitless=True,
        limit_per_platform=100
    )
    
    if not markets:
        print("❌ No markets fetched!")
        return
    
    # Match markets across platforms
    matched_groups = aggregator.match_markets()
    
    # Create comparisons
    comparisons = aggregator.create_comparisons()
    
    # Print summary
    aggregator.print_summary()
    
    # Export to JSON
    import json
    from datetime import datetime
    
    output_file = f"market_snapshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    data = {
        "timestamp": datetime.now().isoformat(),
        "total_markets": len(markets),
        "matched_groups": len(matched_groups),
        "comparisons": len(comparisons),
        "markets": [m.to_dict() for m in markets],
        "comparisons": [c.to_dict() for c in comparisons]
    }
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\n📁 Data exported to {output_file}")


def run_price_tracker():
    """Run continuous price tracking"""
    print("\n" + "=" * 70)
    print("STARTING CONTINUOUS PRICE TRACKER")
    print("=" * 70 + "\n")
    
    tracker = PriceTracker(update_interval=5)
    
    try:
        asyncio.run(tracker.start())
    except KeyboardInterrupt:
        print("\n\nStopping price tracker...")
        tracker.stop()
        tracker.export_to_json("final_market_data.json")


def run_api_server(host: str = "0.0.0.0", port: int = 8000):
    """Run the REST API server"""
    start_server(host=host, port=port)


def main():
    """Main entry point with command-line arguments"""
    parser = argparse.ArgumentParser(
        description="Market Aggregation Service - Aggregates markets from Polymarket, Kalshi, and Limitless"
    )
    
    parser.add_argument(
        "mode",
        choices=["single", "tracker", "api"],
        help="Run mode: single (one-time aggregation), tracker (continuous 5s updates), api (REST API server)"
    )
    
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="API server host (default: 0.0.0.0)"
    )
    
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="API server port (default: 8000)"
    )
    
    args = parser.parse_args()
    
    # Check for environment variables
    if args.mode != "single":
        print("💡 Tip: Set environment variables for full functionality:")
        print("   - KALSHI_API_KEY")
        print("   - KALSHI_PRIVATE_KEY_PATH")
        print()
    
    # Run selected mode
    if args.mode == "single":
        run_single_aggregation()
    elif args.mode == "tracker":
        run_price_tracker()
    elif args.mode == "api":
        run_api_server(host=args.host, port=args.port)


if __name__ == "__main__":
    main()

