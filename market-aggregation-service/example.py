"""
Example usage of the Market Aggregation Service

This script demonstrates all major features:
1. Fetching markets from all platforms
2. Matching similar markets
3. Creating price comparisons
4. Finding best odds
5. Detecting arbitrage opportunities
6. Analyzing by market type
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from aggregator import MarketAggregator
from models import Platform, MarketType


def main():
    print("\n" + "=" * 70)
    print("MARKET AGGREGATION SERVICE - EXAMPLE")
    print("=" * 70 + "\n")
    
    # Initialize the aggregator
    aggregator = MarketAggregator()
    
    # ========================================================================
    # Step 1: Fetch markets from all platforms
    # ========================================================================
    print("Step 1: Fetching markets from all platforms...")
    print("-" * 70)
    
    markets = aggregator.fetch_all_markets(
        include_polymarket=True,
        include_kalshi=True,
        include_limitless=True,
        limit_per_platform=50  # Start with 50 per platform for faster testing
    )
    
    print(f"\n✅ Fetched {len(markets)} total markets")
    
    # Show breakdown by platform
    platform_counts = {}
    for market in markets:
        p = market.platform.value
        platform_counts[p] = platform_counts.get(p, 0) + 1
    
    for platform, count in platform_counts.items():
        print(f"   • {platform}: {count} markets")
    
    # ========================================================================
    # Step 2: Match similar markets across platforms
    # ========================================================================
    print("\n" + "=" * 70)
    print("Step 2: Matching similar markets across platforms...")
    print("-" * 70)
    
    matched_groups = aggregator.match_markets()
    
    print(f"\n✅ Found {len(matched_groups)} matched market groups")
    
    # Show some examples
    if matched_groups:
        print("\nExample matched markets:")
        for i, group in enumerate(matched_groups[:3], 1):
            print(f"\n{i}. {group[0].normalized_title}")
            platforms = [m.platform.value for m in group]
            print(f"   Platforms: {', '.join(platforms)}")
    
    # ========================================================================
    # Step 3: Create price comparisons
    # ========================================================================
    print("\n" + "=" * 70)
    print("Step 3: Creating price comparisons...")
    print("-" * 70)
    
    comparisons = aggregator.create_comparisons()
    
    print(f"\n✅ Created {len(comparisons)} price comparisons")
    
    # ========================================================================
    # Step 4: Find markets with best odds differentials
    # ========================================================================
    print("\n" + "=" * 70)
    print("Step 4: Finding best odds opportunities...")
    print("-" * 70)
    
    best_odds = aggregator.get_best_odds_markets(limit=5)
    
    if best_odds:
        print(f"\n🎯 Top 5 Price Differentials:\n")
        for i, comp in enumerate(best_odds, 1):
            print(f"{i}. {comp.question}")
            print(f"   Question: {comp.question[:60]}...")
            print(f"   Best Platform: {comp.best_platform.value}")
            print(f"   Best Odds: {comp.best_odds} ({comp.best_price:.1%})")
            print(f"   Price Spread: {comp.price_spread:.2f}%")
            print(f"   Platforms Compared: {len(comp.markets)}")
            print()
    else:
        print("\n⚠️  No significant price differentials found")
    
    # ========================================================================
    # Step 5: Detect arbitrage opportunities
    # ========================================================================
    print("=" * 70)
    print("Step 5: Detecting arbitrage opportunities...")
    print("-" * 70)
    
    arbitrage_opps = aggregator.get_arbitrage_opportunities()
    
    if arbitrage_opps:
        print(f"\n💰 Found {len(arbitrage_opps)} arbitrage opportunities!\n")
        for i, arb in enumerate(arbitrage_opps, 1):
            print(f"{i}. {arb.question[:60]}...")
            print(f"   Potential Profit: {arb.arbitrage_percentage:.2f}%")
            print(f"   Platforms: {[m.platform.value for m in arb.markets]}")
            print()
    else:
        print("\n⚠️  No arbitrage opportunities found")
    
    # ========================================================================
    # Step 6: Analyze by market type
    # ========================================================================
    print("=" * 70)
    print("Step 6: Analyzing by market type...")
    print("-" * 70)
    
    # Count by type
    type_counts = {}
    for market in markets:
        t = market.market_type.value
        type_counts[t] = type_counts.get(t, 0) + 1
    
    print(f"\n📊 Markets by Type:")
    for mtype, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   • {mtype}: {count}")
    
    # Show sports markets specifically
    sports_comps = aggregator.get_markets_by_type(MarketType.SPORTS)
    if sports_comps:
        print(f"\n🏀 Sports Market Comparisons: {len(sports_comps)}")
        for comp in sports_comps[:3]:
            print(f"   • {comp.question[:60]}...")
            print(f"     Best: {comp.best_platform.value} @ {comp.best_odds}")
    
    # Show politics markets
    politics_comps = aggregator.get_markets_by_type(MarketType.POLITICS)
    if politics_comps:
        print(f"\n🗳️  Politics Market Comparisons: {len(politics_comps)}")
        for comp in politics_comps[:3]:
            print(f"   • {comp.question[:60]}...")
            print(f"     Best: {comp.best_platform.value} @ {comp.best_odds}")
    
    # ========================================================================
    # Step 7: Detailed look at a specific comparison
    # ========================================================================
    if comparisons:
        print("\n" + "=" * 70)
        print("Step 7: Detailed comparison example...")
        print("-" * 70)
        
        # Take the first comparison as an example
        example = comparisons[0]
        
        print(f"\n📋 Market: {example.question}\n")
        print(f"Market Type: {example.market_type.value}")
        print(f"Best Platform: {example.best_platform.value}")
        print(f"Price Spread: {example.price_spread:.2f}%")
        
        print(f"\n🏢 Available on {len(example.markets)} platform(s):\n")
        for market in example.markets:
            print(f"  {market.platform.value.upper()}")
            print(f"    Market ID: {market.market_id}")
            print(f"    Volume: ${market.total_volume:,.0f}" if market.total_volume else "    Volume: N/A")
            if market.outcomes:
                print(f"    Outcomes:")
                for outcome in market.outcomes:
                    print(f"      • {outcome.name}: {outcome.american_odds} ({outcome.price:.1%})")
            print()
    
    # ========================================================================
    # Step 8: Export data
    # ========================================================================
    print("=" * 70)
    print("Step 8: Exporting data...")
    print("-" * 70)
    
    import json
    from datetime import datetime
    
    output_file = "example_output.json"
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_markets": len(markets),
            "matched_groups": len(matched_groups),
            "comparisons": len(comparisons),
            "arbitrage_opportunities": len(arbitrage_opps),
            "by_platform": platform_counts,
            "by_type": type_counts
        },
        "best_odds": [c.to_dict() for c in best_odds],
        "arbitrage": [a.to_dict() for a in arbitrage_opps],
        "all_comparisons": [c.to_dict() for c in comparisons]
    }
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\n✅ Data exported to {output_file}")
    
    # ========================================================================
    # Summary
    # ========================================================================
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    aggregator.print_summary()
    
    print("\n" + "=" * 70)
    print("EXAMPLE COMPLETED!")
    print("=" * 70)
    print("\nNext steps:")
    print("  • Review example_output.json for detailed data")
    print("  • Run 'python main.py tracker' for continuous monitoring")
    print("  • Run 'python main.py api' to start the REST API server")
    print("  • Check USAGE.md for more examples")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

