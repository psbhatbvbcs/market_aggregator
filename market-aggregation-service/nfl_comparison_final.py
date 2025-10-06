"""
NFL Market Comparison - Final Version with Proper Filtering

Uses the exact same filtering logic as your Discord bot:
1. Fetch markets with tag_id and start_date_min
2. Filter with spread <= 0.05 (removes illiquid player props)
3. Filter to binary markets only (2 outcomes)

Usage:
    python nfl_comparison_final.py
"""

import sys
import os
import json
from datetime import datetime, timedelta, timezone
from dateutil import parser as date_parser

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from api_clients.polymarket_client import PolymarketClient
from api_clients.kalshi_client import KalshiClient
from api_clients.odds_api_client import OddsAPIClient
from aggregator import MarketAggregator
from simple_excel_exporter import SimpleMarketExporter
from db_manager import MarketDBManager
from nfl_teams import normalize_nfl_team_name
from odds_api_exporter import OddsAPIExporter


def filter_future_markets(markets):
    """
    Filter markets by:
    1. Future gameStartTime (within 2 hours from now)
    2. Spread <= 0.05 (removes illiquid/prop markets)
    
    Adapted from discord_bot/commands/markets/helpers/polymarket_api.py
    """
    if not markets:
        return []
    
    future_markets = []
    now = datetime.now(timezone.utc) - timedelta(hours=2)
    
    print(f"Filtering {len(markets)} markets by time and spread...")
    
    for market in markets:
        # Check if market has gameStartTime in raw_data
        game_start_time_str = market.raw_data.get("gameStartTime")
        spread = market.raw_data.get('spread', 0.0)
        
        # Only include markets with spread <= 0.05 (liquid markets)
        if spread <= 0.05 and game_start_time_str:
            try:
                game_start_time = date_parser.parse(game_start_time_str)
                if game_start_time.tzinfo is None:
                    game_start_time = game_start_time.replace(tzinfo=timezone.utc)
                
                if game_start_time > now:
                    future_markets.append(market)
            except Exception as e:
                print(f"Warning: Error parsing time for market {market.market_id}: {e}")
                continue
    
    print(f"Found {len(future_markets)} markets with spread <= 0.05 and future start time")
    return future_markets


def filter_correct_markets(markets):
    """
    Filter to only include markets with exactly 2 outcomes.
    This is the final filter to ensure we only have binary markets.
    
    Adapted from discord_bot/commands/markets/helpers/polymarket_api.py
    """
    correct_markets = []
    
    for market in markets:
        try:
            outcomes = market.outcomes
            if len(outcomes) == 2:
                correct_markets.append(market)
        except Exception as e:
            print(f"Warning: Error checking outcomes for market {market.market_id}: {e}")
            continue
    
    print(f"Filtered to {len(correct_markets)} binary markets (2 outcomes only)")
    return correct_markets


def fetch_nfl_game_markets():
    """Fetch NFL game markets using the same logic as Discord bot"""
    
    print("\n" + "=" * 70)
    print("NFL GAME MARKETS COMPARISON (Discord Bot Logic)")
    print("=" * 70 + "\n")
    
    all_markets = []
    
    # ========================================================================
    # Fetch from Polymarket - Using exact Discord bot params
    # ========================================================================
    print("[1/2] Fetching NFL markets from Polymarket...")
    print("-" * 70)
    
    try:
        client = PolymarketClient()
        
        # Same params as Discord bot
        nfl_date = "2025-08-07T00:00:00Z"
        
        print(f"Using tag_id: 450 (NFL)")
        print(f"Using start_date_min: {nfl_date}")
        
        polymarket_markets = client.fetch_markets(
            limit=1000,
            closed=False,
            active=True,
            tag_id=450,
            start_date_min=nfl_date
        )
        
        print(f"✅ Fetched {len(polymarket_markets)} total NFL markets")
        
        # Apply Discord bot filtering
        print("\nApplying Discord bot filters...")
        
        # Step 1: Filter by spread and future time
        future_markets = filter_future_markets(polymarket_markets)
        
        # Step 2: Filter to binary markets only
        game_markets = filter_correct_markets(future_markets)
        
        all_markets.extend(game_markets)
        
        # Show examples
        if game_markets:
            print("\nExample Polymarket game markets:")
            for market in game_markets[:5]:
                print(f"  • {market.question}")
                spread = market.raw_data.get('spread', 'N/A')
                print(f"    Spread: {spread}, Outcomes: {[o.name for o in market.outcomes]}")
    
    except Exception as e:
        print(f"❌ Error fetching from Polymarket: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    
    # ========================================================================
    # Fetch from Kalshi
    # ========================================================================
    print("[2/2] Fetching NFL markets from Kalshi...")
    print("-" * 70)
    
    try:
        client = KalshiClient()
        
        print(f"Using series_ticker: KXNFLGAME")
        
        kalshi_markets = client.fetch_markets(
            series_ticker="KXNFLGAME",
            status="open",
            limit=200
        )
        
        print(f"✅ Fetched {len(kalshi_markets)} NFL game markets")
        
        all_markets.extend(kalshi_markets)
        
        # Show examples
        if kalshi_markets:
            print("\nExample Kalshi game markets:")
            for market in kalshi_markets[:5]:
                print(f"  • {market.question}")
                print(f"    Ticker: {market.market_id}")
    
    except Exception as e:
        print(f"❌ Error fetching from Kalshi: {e}")
        print("    (May require KALSHI_API_KEY environment variable)")
    
    print("\n" + "=" * 70)
    print(f"TOTAL NFL GAME MARKETS: {len(all_markets)}")
    print(f"  Polymarket: {len([m for m in all_markets if m.platform.value == 'polymarket'])}")
    print(f"  Kalshi: {len([m for m in all_markets if m.platform.value == 'kalshi'])}")
    print("=" * 70)
    
    return all_markets


def fetch_traditional_sportsbook_odds():
    """Fetch NFL odds from traditional sportsbooks via The Odds API"""
    
    print("\n" + "=" * 70)
    print("[BONUS] Fetching Traditional Sportsbook Odds")
    print("=" * 70 + "\n")
    
    # API key from user's request
    api_key = "db06be1d18367c369444aa40d6a25499"
    
    try:
        client = OddsAPIClient(api_key)
        games = client.fetch_nfl_odds()
        
        if not games:
            print("⚠️  No traditional sportsbook odds found")
            return {}
        
        # Process and find best odds for each game
        best_odds_by_game = {}
        
        for game in games:
            game_key = f"{game['away_team']} @ {game['home_team']}"
            best_odds = client.get_best_odds_for_game(game)
            all_odds = client.get_all_odds_for_game(game)
            
            best_odds_by_game[game_key] = {
                'best_odds': best_odds,
                'all_odds': all_odds,
                'raw_game': game
            }
        
        print(f"✅ Found best odds for {len(best_odds_by_game)} games across {games[0]['bookmakers'].__len__() if games else 0} bookmakers")
        
        # Show sample
        if best_odds_by_game:
            print("\nSample best odds:")
            for i, (game_key, data) in enumerate(list(best_odds_by_game.items())[:3]):
                best = data['best_odds']
                print(f"\n  {game_key}")
                print(f"    {best['home_team']}: {best['best_home_odds']:.2f} @ {best['best_home_platform']}")
                print(f"    {best['away_team']}: {best['best_away_odds']:.2f} @ {best['best_away_platform']}")
        
        return best_odds_by_game
        
    except Exception as e:
        print(f"❌ Error fetching traditional sportsbook odds: {e}")
        import traceback
        traceback.print_exc()
        return {}


def compare_markets(markets):
    """Compare NFL game markets across platforms"""
    
    if not markets:
        print("\n⚠️  No markets to compare!")
        return []
    
    print("\n" + "=" * 70)
    print("MATCHING NFL GAME MARKETS")
    print("=" * 70 + "\n")
    
    # Use aggregator
    aggregator = MarketAggregator()
    aggregator.all_markets = markets
    
    # Match
    matched_groups = aggregator.match_markets()
    
    if not matched_groups:
        print("\n⚠️  No matched markets found")
        print("\nShowing sample markets from each platform:")
        
        poly_markets = [m for m in markets if m.platform.value == 'polymarket']
        kalshi_markets = [m for m in markets if m.platform.value == 'kalshi']
        
        if poly_markets:
            print("\nPolymarket game markets:")
            for m in poly_markets[:5]:
                print(f"  • {m.question}")
                print(f"    Start: {m.start_time}")
        
        if kalshi_markets:
            print("\nKalshi game markets:")
            for m in kalshi_markets[:5]:
                print(f"  • {m.question}")
                print(f"    Start: {m.start_time}")
        
        return []
    
    # Create comparisons
    comparisons = aggregator.create_comparisons()
    
    # Display results
    print("\n" + "=" * 70)
    print(f"🎉 FOUND {len(comparisons)} MATCHED GAMES!")
    print("=" * 70 + "\n")
    
    for i, comp in enumerate(comparisons, 1):
        print(f"\n{i}. {comp.question}")
        print(f"   {'─' * 66}")
        
        for market in comp.markets:
            platform = market.platform.value.upper()
            print(f"\n   {platform}:")
            print(f"   Market ID: {market.market_id}")
            
            if market.start_time:
                print(f"   Game Time: {market.start_time.strftime('%Y-%m-%d %H:%M UTC')}")
            
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
    
    filename = f"nfl_games_final_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    platform_counts = {}
    for m in markets:
        p = m.platform.value
        platform_counts[p] = platform_counts.get(p, 0) + 1
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "sport": "NFL",
        "filters_applied": [
            "spread <= 0.05 (liquid markets only)",
            "2 outcomes only (binary markets)",
            "future gameStartTime"
        ],
        "summary": {
            "total_markets": len(markets),
            "by_platform": platform_counts,
            "matched_comparisons": len(comparisons),
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


def export_to_excel(comparisons):
    """Export comparisons to Excel files (one per game)"""
    if not comparisons:
        return
    
    exporter = SimpleMarketExporter("nfl_tracking")
    
    for comp in comparisons:
        # Get polymarket and ALL kalshi markets
        poly_market = None
        kalshi_markets = []
        
        for market in comp.markets:
            if market.platform.value == 'polymarket':
                poly_market = market
            elif market.platform.value == 'kalshi':
                kalshi_markets.append(market)
        
        # Find the BEST matching Kalshi market based on team names
        # (We only want ONE Kalshi market that best represents the comparison)
        if poly_market and kalshi_markets:
            best_kalshi_market = None
            
            # If there's only one Kalshi market, use it
            if len(kalshi_markets) == 1:
                best_kalshi_market = kalshi_markets[0]
            else:
                # Find the Kalshi market for the favorite (higher probability team on Polymarket)
                poly_outcomes = {o.name: o.price for o in poly_market.outcomes}
                favorite_team = max(poly_outcomes.items(), key=lambda x: x[1])[0]
                
                # Match the favorite team with a Kalshi market
                normalized_favorite = normalize_nfl_team_name(favorite_team)
                for kalshi_market in kalshi_markets:
                    kalshi_team = kalshi_market.raw_data.get('yes_sub_title', '')
                    normalized_kalshi_team = normalize_nfl_team_name(kalshi_team)
                    if normalized_kalshi_team == normalized_favorite:
                        best_kalshi_market = kalshi_market
                        break
                
                # Fallback to first market if no match found
                if not best_kalshi_market:
                    best_kalshi_market = kalshi_markets[0]
            
            if best_kalshi_market:
                # Calculate the specific spread for this Kalshi market
                kalshi_yes_price = next((o.price for o in best_kalshi_market.outcomes if 'yes' in o.name.lower()), None)
                kalshi_team_raw = best_kalshi_market.raw_data.get('yes_sub_title', '')
                
                # Normalize team names and find matching Polymarket price
                normalized_kalshi_team = normalize_nfl_team_name(kalshi_team_raw)
                poly_team_price = None
                for outcome in poly_market.outcomes:
                    normalized_outcome = normalize_nfl_team_name(outcome.name)
                    if normalized_outcome == normalized_kalshi_team:
                        poly_team_price = outcome.price
                        break
                
                # Calculate spread
                if poly_team_price is not None and kalshi_yes_price is not None:
                    specific_spread = abs((poly_team_price * 100) - (kalshi_yes_price * 100))
                else:
                    specific_spread = comp.price_spread
                
                exporter.add_comparison(
                    market_title=comp.question,
                    poly_id=poly_market.market_id,
                    kalshi_id=best_kalshi_market.market_id,
                    poly_data=poly_market.to_dict(),
                    kalshi_data=best_kalshi_market.to_dict(),
                    price_spread=specific_spread  # Pass the pre-calculated spread
                )
    
    exporter.export()


def save_to_mongodb(comparisons, use_db=True):
    """Save comparisons to MongoDB"""
    if not comparisons or not use_db:
        return
    
    try:
        db = MarketDBManager()
        
        for comp in comparisons:
            # Get polymarket and ALL kalshi markets
            poly_market = None
            kalshi_markets = []
            
            for market in comp.markets:
                if market.platform.value == 'polymarket':
                    poly_market = market
                elif market.platform.value == 'kalshi':
                    kalshi_markets.append(market)
            
            # Find the BEST matching Kalshi market (same logic as Excel export)
            if poly_market and kalshi_markets:
                best_kalshi_market = None
                
                # If there's only one Kalshi market, use it
                if len(kalshi_markets) == 1:
                    best_kalshi_market = kalshi_markets[0]
                else:
                    # Find the Kalshi market for the favorite (higher probability team on Polymarket)
                    poly_outcomes = {o.name: o.price for o in poly_market.outcomes}
                    favorite_team = max(poly_outcomes.items(), key=lambda x: x[1])[0]
                    
                    # Match the favorite team with a Kalshi market
                    normalized_favorite = normalize_nfl_team_name(favorite_team)
                    for kalshi_market in kalshi_markets:
                        kalshi_team = kalshi_market.raw_data.get('yes_sub_title', '')
                        normalized_kalshi_team = normalize_nfl_team_name(kalshi_team)
                        if normalized_kalshi_team == normalized_favorite:
                            best_kalshi_market = kalshi_market
                            break
                    
                    # Fallback to first market if no match found
                    if not best_kalshi_market:
                        best_kalshi_market = kalshi_markets[0]
                
                if best_kalshi_market:
                    # Calculate actual spread for THIS specific Kalshi market
                    kalshi_yes_price = next((o.price for o in best_kalshi_market.outcomes if 'yes' in o.name.lower()), None)
                    kalshi_team_raw = best_kalshi_market.raw_data.get('yes_sub_title', '')
                    
                    # Normalize team names and find matching Polymarket price
                    normalized_kalshi_team = normalize_nfl_team_name(kalshi_team_raw)
                    poly_team_price = None
                    for outcome in poly_market.outcomes:
                        normalized_outcome = normalize_nfl_team_name(outcome.name)
                        if normalized_outcome == normalized_kalshi_team:
                            poly_team_price = outcome.price
                            break
                    
                    # Calculate spread for this specific comparison
                    if poly_team_price is not None and kalshi_yes_price is not None:
                        specific_spread = abs((poly_team_price * 100) - (kalshi_yes_price * 100))
                    else:
                        specific_spread = comp.price_spread
                    
                    # Extract comparison data
                    comparison_data = {
                        'price_spread': specific_spread,
                        'best_platform': comp.best_platform.value,
                        'best_odds': comp.best_odds,
                        'arbitrage_opportunity': comp.arbitrage_opportunity,
                        'kalshi_team': kalshi_team_raw,
                    }
                    
                    db.save_comparison(
                        poly_id=poly_market.market_id,
                        kalshi_id=best_kalshi_market.market_id,
                        market_title=comp.question,
                        polymarket_response=poly_market.raw_data,
                        kalshi_response=best_kalshi_market.raw_data,
                        comparison_data=comparison_data,
                        category="nfl"
                    )
        
        db.close()
        print("✅ Saved to MongoDB")
        
    except Exception as e:
        print(f"⚠️  MongoDB save failed: {e}")
        print("   (Make sure MongoDB is running: mongod)")


def export_traditional_odds(traditional_odds):
    """Export traditional sportsbook odds to separate CSVs (one per game)"""
    if not traditional_odds:
        print("\n⚠️  No traditional sportsbook odds to export")
        return
    
    try:
        exporter = OddsAPIExporter("traditional_odds_tracking")
        
        for game_key, odds_data in traditional_odds.items():
            exporter.add_game(
                game_data=odds_data['raw_game'],
                all_odds=odds_data['all_odds'],
                best_odds=odds_data['best_odds']
            )
        
        exporter.export()
        
    except Exception as e:
        print(f"❌ Error exporting traditional odds: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Main execution"""
    
    try:
        # Fetch markets
        markets = fetch_nfl_game_markets()
        
        # Fetch traditional sportsbook odds
        traditional_odds = fetch_traditional_sportsbook_odds()
        
        # Compare
        comparisons = compare_markets(markets)
        
        # Export to JSON
        export_results(markets, comparisons)
        
        # Export to Excel
        export_to_excel(comparisons)
        
        # Export traditional sportsbook odds to separate CSV
        export_traditional_odds(traditional_odds)
        
        # Save to MongoDB
        save_to_mongodb(comparisons, use_db=True)
        
        # Summary
        print("\n" + "=" * 70)
        print("NFL GAME COMPARISON COMPLETE")
        print("=" * 70)
        
        if comparisons:
            best = max(comparisons, key=lambda c: c.price_spread)
            print(f"\n🏆 Best Opportunity:")
            print(f"   {best.question}")
            print(f"   Best: {best.best_platform.value.upper()} @ {best.best_odds}")
            print(f"   Spread: {best.price_spread:.2f}%")
        else:
            print("\n💡 Tips:")
            print("   • Check if games are happening this week")
            print("   • Polymarket may add markets closer to game time")
            print("   • For Kalshi auth: Set KALSHI_API_KEY environment variable")
        
        print("=" * 70 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

