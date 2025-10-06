"""
Politics Market Comparison

Compares politics markets across Polymarket, Kalshi, and Limitless.
Uses manual mappings from market_mappings.py for reliable matching.

Usage:
    python politics_comparison.py
"""

import sys
import os
import json
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api_clients.polymarket_client import PolymarketClient
from api_clients.kalshi_client import KalshiClient
from aggregator import MarketAggregator
from market_mappings import MANUAL_MAPPINGS


def fetch_politics_markets():
    """Fetch politics markets from all platforms"""
    
    print("\n" + "=" * 70)
    print("POLITICS MARKET COMPARISON")
    print("=" * 70 + "\n")
    
    all_markets = []
    
    # ========================================================================
    # Polymarket - Politics
    # ========================================================================
    print("[1/2] Fetching politics markets from Polymarket...")
    print("-" * 70)
    
    try:
        client = PolymarketClient()
        
        # Get manual mapping IDs for politics
        manual_poly_ids = [m['polymarket_id'] for m in MANUAL_MAPPINGS.get('politics', []) 
                          if m.get('polymarket_id')]
        
        politics_markets = []
        
        # First, fetch manually mapped markets by condition_id
        if manual_poly_ids:
            print(f"Fetching {len(manual_poly_ids)} manually mapped markets...")
            for condition_id in manual_poly_ids:
                market = client.fetch_market_by_id(condition_id)
                if market:
                    politics_markets.append(market)
        
        # Also fetch general politics markets
        if not manual_poly_ids:
            print(f"Fetching general politics markets...")
            general_markets = client.fetch_markets(
                limit=200,
                closed=False,
                active=True
                # Add tag_id for politics if you know it
                # tag_id=POLITICS_TAG_ID
            )
            
            # Add any auto-classified politics markets
            for m in general_markets:
                if m.market_type.value == 'politics':
                    politics_markets.append(m)
        
        all_markets.extend(politics_markets)
        
        print(f"✅ Fetched {len(politics_markets)} politics markets")
        
        if politics_markets:
            print("\nSample markets:")
            for market in politics_markets[:5]:
                print(f"  • {market.question}")
                print(f"    ID: {market.market_id}")
    
    except Exception as e:
        print(f"❌ Error fetching from Polymarket: {e}")
    
    print()
    
    # ========================================================================
    # Kalshi - Politics
    # ========================================================================
    print("[2/2] Fetching politics markets from Kalshi...")
    print("-" * 70)
    
    try:
        client = KalshiClient()
        
        # Get manual mapping IDs for politics
        manual_kalshi_ids = [m['kalshi_id'] for m in MANUAL_MAPPINGS.get('politics', []) 
                            if m.get('kalshi_id')]
        
        politics_markets = []
        
        # First, fetch manually mapped markets by event_ticker
        if manual_kalshi_ids:
            print(f"Fetching {len(manual_kalshi_ids)} manually mapped markets...")
            for event_ticker in manual_kalshi_ids:
                markets = client.fetch_market_by_event_ticker(event_ticker)
                politics_markets.extend(markets)
        
        # Also fetch general politics markets
        if not manual_kalshi_ids:
            print(f"Fetching general politics markets...")
            general_markets = client.fetch_markets(
                status="open",
                limit=200
            )
            
            # Add any auto-classified politics markets
            for m in general_markets:
                if m.market_type.value == 'politics':
                    politics_markets.append(m)
        
        all_markets.extend(politics_markets)
        
        print(f"✅ Fetched {len(politics_markets)} politics markets")
        
        if politics_markets:
            print("\nSample markets:")
            for market in politics_markets[:5]:
                print(f"  • {market.question}")
                print(f"    Ticker: {market.market_id}")
    
    except Exception as e:
        print(f"❌ Error fetching from Kalshi: {e}")
        print("    (May require KALSHI_API_KEY environment variable)")
    
    print("\n" + "=" * 70)
    print(f"TOTAL POLITICS MARKETS: {len(all_markets)}")
    print(f"  Polymarket: {len([m for m in all_markets if m.platform.value == 'polymarket'])}")
    print(f"  Kalshi: {len([m for m in all_markets if m.platform.value == 'kalshi'])}")
    print("=" * 70)
    
    return all_markets


def compare_markets(markets):
    """Compare politics markets using manual and fuzzy matching"""
    
    if not markets:
        print("\n⚠️  No markets to compare!")
        return []
    
    print("\n" + "=" * 70)
    print("COMPARING POLITICS MARKETS")
    print("=" * 70 + "\n")
    
    # Use aggregator
    aggregator = MarketAggregator()
    aggregator.all_markets = markets
    
    # Match (will use manual mappings first, then fuzzy matching)
    matched_groups = aggregator.match_markets()
    
    if not matched_groups:
        print("\n⚠️  No matched markets found")
        print("\n💡 Tips:")
        print("   • Add manual mappings in market_mappings.py")
        print("   • Politics markets often have different wording across platforms")
        print("   • Use manual mappings for reliable matching")
        return []
    
    # Create comparisons
    comparisons = aggregator.create_comparisons()
    
    # Display results
    print("\n" + "=" * 70)
    print(f"🎉 FOUND {len(comparisons)} POLITICS MARKET COMPARISONS!")
    print("=" * 70 + "\n")
    
    for i, comp in enumerate(comparisons, 1):
        print(f"\n{i}. {comp.question}")
        print(f"   {'─' * 66}")
        
        for market in comp.markets:
            platform = market.platform.value.upper()
            print(f"\n   {platform}:")
            print(f"   Market ID: {market.market_id}")
            
            if market.end_time:
                print(f"   End Date: {market.end_time.strftime('%Y-%m-%d')}")
            
            # Show volume and liquidity
            if market.total_volume is not None:
                print(f"   Volume: ${market.total_volume:,.0f}")
                if market.raw_data.get('volume_24hr') or market.raw_data.get('volume_24h'):
                    vol_24h = market.raw_data.get('volume_24hr') or market.raw_data.get('volume_24h')
                    print(f"   Volume 24h: ${vol_24h:,.0f}")
            
            if market.liquidity is not None:
                print(f"   Liquidity: ${market.liquidity:,.0f}")
            
            if market.raw_data.get('open_interest'):
                print(f"   Open Interest: {market.raw_data['open_interest']:,}")
            
            if market.outcomes:
                for outcome in market.outcomes:
                    is_best = (market.platform == comp.best_platform and 
                              outcome.name == comp.best_outcome_name)
                    marker = "⭐" if is_best else "  "
                    print(f"   {marker} {outcome.name}: {outcome.american_odds} ({outcome.price:.1%})")
        
        print(f"\n   🎯 BEST ODDS: {comp.best_platform.value.upper()} @ {comp.best_odds}")
        print(f"   📊 PRICE SPREAD: {comp.price_spread:.2f}%")
        
        if comp.arbitrage_opportunity:
            print(f"   💰 ARBITRAGE: {comp.arbitrage_percentage:.2f}% profit!")
    
    return comparisons


def export_results(markets, comparisons):
    """Export to JSON"""
    
    filename = f"politics_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    platform_counts = {}
    for m in markets:
        p = m.platform.value
        platform_counts[p] = platform_counts.get(p, 0) + 1
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "category": "Politics",
        "summary": {
            "total_markets": len(markets),
            "by_platform": platform_counts,
            "comparisons": len(comparisons),
            "arbitrage_opportunities": sum(1 for c in comparisons if c.arbitrage_opportunity)
        },
        "markets": [m.to_dict() for m in markets],
        "comparisons": [c.to_dict() for c in comparisons]
    }
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    print("\n" + "=" * 70)
    print(f"📁 Results exported to: {filename}")
    print("=" * 70)


def main():
    """Main execution"""
    
    try:
        # Fetch markets
        markets = fetch_politics_markets()
        
        # Compare
        comparisons = compare_markets(markets)
        
        # Export
        export_results(markets, comparisons)
        
        # Summary
        print("\n" + "=" * 70)
        print("POLITICS COMPARISON COMPLETE")
        print("=" * 70)
        
        if comparisons:
            best = max(comparisons, key=lambda c: c.price_spread)
            print(f"\n🏆 Best Opportunity:")
            print(f"   {best.question[:60]}...")
            print(f"   Best: {best.best_platform.value.upper()} @ {best.best_odds}")
            print(f"   Spread: {best.price_spread:.2f}%")
        else:
            print("\n💡 To add manual mappings:")
            print("   1. Edit market_mappings.py")
            print("   2. Add your Polymarket + Kalshi/Limitless market IDs to the 'politics' category")
            print("   3. Run this script again")
        
        print("=" * 70 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

