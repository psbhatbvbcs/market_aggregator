"""
Market Aggregator - Matches and compares markets across platforms
"""
from typing import List, Dict, Optional, Tuple
from fuzzywuzzy import fuzz
from datetime import datetime, timedelta
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models import (
    UnifiedMarket, MarketComparison, Platform, MarketType,
    normalize_market_title, extract_team_names, calculate_arbitrage
)
from api_clients.polymarket_client import PolymarketClient
from api_clients.kalshi_client import KalshiClient
from nfl_teams import extract_nfl_teams, are_same_nfl_teams
from market_mappings import get_all_mappings_for_category, find_matching_market_ids

class MarketAggregator:
    """Aggregates and matches markets from multiple platforms"""
    
    # Similarity threshold for fuzzy matching (0-100)
    TITLE_SIMILARITY_THRESHOLD = 80
    TEAM_SIMILARITY_THRESHOLD = 85
    
    # Time window for matching markets (events should be within this window)
    TIME_WINDOW_HOURS = 24
    
    def __init__(self):
        self.polymarket_client = PolymarketClient()
        self.kalshi_client = KalshiClient()
        
        # Cache for market data
        self.all_markets: List[UnifiedMarket] = []
        self.market_groups: List[List[UnifiedMarket]] = []
        self.comparisons: List[MarketComparison] = []
        
    def fetch_all_markets(
        self,
        include_polymarket: bool = True,
        include_kalshi: bool = True,
        limit_per_platform: int = 100
    ) -> List[UnifiedMarket]:
        """Fetch markets from all enabled platforms (Polymarket and Kalshi)"""
        all_markets = []
        
        print("=" * 60)
        print("FETCHING MARKETS FROM ALL PLATFORMS")
        print("=" * 60)
        
        # Fetch from Polymarket
        if include_polymarket:
            print("\n[1/3] Fetching from Polymarket...")
            try:
                polymarket_markets = self.polymarket_client.fetch_markets(
                    limit=limit_per_platform,
                    active=True,
                    closed=False
                )
                all_markets.extend(polymarket_markets)
                print(f"✓ Polymarket: {len(polymarket_markets)} markets")
            except Exception as e:
                print(f"✗ Error fetching Polymarket markets: {e}")
        
        # Fetch from Kalshi
        if include_kalshi:
            print("\n[2/3] Fetching from Kalshi...")
            try:
                kalshi_markets = self.kalshi_client.fetch_markets(
                    status="open",
                    limit=limit_per_platform
                )
                all_markets.extend(kalshi_markets)
                print(f"✓ Kalshi: {len(kalshi_markets)} markets")
            except Exception as e:
                print(f"✗ Error fetching Kalshi markets: {e}")
        
        print("\n" + "=" * 60)
        print(f"TOTAL MARKETS FETCHED: {len(all_markets)}")
        print("=" * 60)
        
        self.all_markets = all_markets
        return all_markets
    
    def _match_using_manual_mappings(self) -> List[List[UnifiedMarket]]:
        """
        Match markets using manual mappings from market_mappings.py
        Returns list of matched market groups
        """
        from market_mappings import MANUAL_MAPPINGS
        
        matched_groups = []
        
        # Create lookup dictionaries for quick access
        markets_by_platform_id = {}
        for market in self.all_markets:
            platform_key = f"{market.platform.value}_id"
            markets_by_platform_id[(platform_key, market.market_id)] = market
        
        # Process each category
        for category, mappings in MANUAL_MAPPINGS.items():
            if not mappings:
                continue
            
            print(f"\nChecking manual mappings for {category}...")
            
            for mapping in mappings:
                group = []
                
                # Try to find Polymarket market
                poly_id = mapping.get("polymarket_id")
                if poly_id:
                    poly_market = markets_by_platform_id.get(("polymarket_id", poly_id))
                    if poly_market:
                        group.append(poly_market)
                
                # Try to find Kalshi market
                kalshi_id = mapping.get("kalshi_id")
                if kalshi_id:
                    kalshi_market = markets_by_platform_id.get(("kalshi_id", kalshi_id))
                    if kalshi_market:
                        group.append(kalshi_market)
                
                
                # Only add if we found at least 2 markets from different platforms
                if len(group) >= 2:
                    platforms = [m.platform.value for m in group]
                    description = mapping.get("description", group[0].question[:50])
                    print(f"  ✓ Matched (manual): {description}... across {platforms}")
                    matched_groups.append(group)
        
        return matched_groups
    
    def match_markets(self) -> List[List[UnifiedMarket]]:
        """
        Match similar markets across platforms
        Returns list of market groups (each group contains matching markets)
        """
        print("\n" + "=" * 60)
        print("MATCHING MARKETS ACROSS PLATFORMS")
        print("=" * 60)
        
        if not self.all_markets:
            print("No markets to match!")
            return []
        
        # Group markets by type first for efficiency
        markets_by_type: Dict[MarketType, List[UnifiedMarket]] = {}
        for market in self.all_markets:
            if market.market_type not in markets_by_type:
                markets_by_type[market.market_type] = []
            markets_by_type[market.market_type].append(market)
        
        matched_groups = []
        processed_market_ids = set()
        
        # First, try manual mappings for all categories
        manual_matches = self._match_using_manual_mappings()
        if manual_matches:
            print(f"\n✅ Found {len(manual_matches)} manually mapped market groups")
            matched_groups.extend(manual_matches)
            # Mark these as processed
            for group in manual_matches:
                for market in group:
                    processed_market_ids.add(market.market_id)
        
        for market_type, markets in markets_by_type.items():
            print(f"\nMatching {market_type.value} markets ({len(markets)} total)...")
            
            for i, market1 in enumerate(markets):
                # Skip if already matched
                if market1.market_id in processed_market_ids:
                    continue
                
                # Start a new group with this market
                current_group = [market1]
                processed_market_ids.add(market1.market_id)
                
                # Try to find matching markets
                for market2 in markets[i+1:]:
                    if market2.market_id in processed_market_ids:
                        continue
                    
                    # Don't match markets from the same platform
                    if market1.platform == market2.platform:
                        continue
                    
                    # Check if markets match
                    if self._are_markets_similar(market1, market2):
                        current_group.append(market2)
                        processed_market_ids.add(market2.market_id)
                
                # Only keep groups with multiple markets (from different platforms)
                if len(current_group) > 1:
                    matched_groups.append(current_group)
                    platforms = [m.platform.value for m in current_group]
                    print(f"  ✓ Matched: {current_group[0].normalized_title[:50]}... across {platforms}")
        
        print(f"\n{'=' * 60}")
        print(f"FOUND {len(matched_groups)} MATCHED MARKET GROUPS")
        print("=" * 60)
        
        self.market_groups = matched_groups
        return matched_groups
    
    def _are_markets_similar(self, market1: UnifiedMarket, market2: UnifiedMarket) -> bool:
        """
        Determine if two markets are similar enough to be considered the same
        """
        # Different market types rarely match
        if market1.market_type != market2.market_type:
            return False
        
        # Check title similarity
        title_score = fuzz.ratio(market1.normalized_title, market2.normalized_title)
        if title_score >= self.TITLE_SIMILARITY_THRESHOLD:
            return True
        
        # Check partial match (one title contained in another)
        partial_score = fuzz.partial_ratio(market1.normalized_title, market2.normalized_title)
        if partial_score >= 90:
            return True
        
        # For sports markets, check team names
        if market1.market_type == MarketType.SPORTS:
            # Try NFL-specific team matching first (handles Chiefs/Kansas City etc.)
            try:
                nfl_teams1 = extract_nfl_teams(market1.question)
                nfl_teams2 = extract_nfl_teams(market2.question)
                
                if nfl_teams1 and nfl_teams2 and len(nfl_teams1) >= 1 and len(nfl_teams2) >= 1:
                    if are_same_nfl_teams(nfl_teams1, nfl_teams2):
                        # Also check time proximity
                        if self._check_time_proximity(market1, market2):
                            print(f"    ✓ NFL team match: {nfl_teams1} == {nfl_teams2}")
                            return True
            except Exception as e:
                # Fall back to generic team matching if NFL matching fails
                pass
            
            # Generic team matching (for non-NFL or as fallback)
            if market1.normalized_teams and market2.normalized_teams:
                # Check if teams match
                team_matches = 0
                for team1 in market1.normalized_teams:
                    for team2 in market2.normalized_teams:
                        team_score = fuzz.ratio(team1, team2)
                        if team_score >= self.TEAM_SIMILARITY_THRESHOLD:
                            team_matches += 1
                            break
                
                # If at least 2 teams match, consider it the same market
                if team_matches >= 2:
                    # Also check time proximity
                    if self._check_time_proximity(market1, market2):
                        return True
        
        # Check token-based similarity (for more flexible matching)
        token_score = fuzz.token_sort_ratio(market1.normalized_title, market2.normalized_title)
        if token_score >= 85:
            # For high token similarity, also check time proximity
            if self._check_time_proximity(market1, market2):
                return True
        
        return False
    
    def _check_time_proximity(self, market1: UnifiedMarket, market2: UnifiedMarket) -> bool:
        """Check if two markets have events at similar times"""
        # If either market doesn't have a start time, skip time check
        if not market1.start_time or not market2.start_time:
            return True  # Don't reject based on time if we don't have the data
        
        time_diff = abs((market1.start_time - market2.start_time).total_seconds() / 3600)
        return time_diff <= self.TIME_WINDOW_HOURS
    
    def create_comparisons(self) -> List[MarketComparison]:
        """Create price comparisons for matched markets"""
        print("\n" + "=" * 60)
        print("CREATING PRICE COMPARISONS")
        print("=" * 60)
        
        comparisons = []
        
        for group in self.market_groups:
            if len(group) < 2:
                continue
            
            try:
                comparison = self._create_comparison(group)
                if comparison:
                    comparisons.append(comparison)
            except Exception as e:
                print(f"Error creating comparison: {e}")
                continue
        
        print(f"\nCreated {len(comparisons)} price comparisons")
        
        self.comparisons = comparisons
        return comparisons
    
    def _create_comparison(self, markets: List[UnifiedMarket]) -> Optional[MarketComparison]:
        """Create a comparison object for a group of similar markets"""
        if not markets:
            return None
        
        # Use the first market's question as the canonical question
        question = markets[0].question
        normalized_title = markets[0].normalized_title
        market_type = markets[0].market_type
        
        # Find the best odds across all markets
        # We'll look at the "Yes" outcome or the first outcome
        best_platform = None
        best_outcome_name = ""
        best_price = 0.0
        best_odds = ""
        worst_price = 1.0
        
        for market in markets:
            if not market.outcomes:
                continue
            
            # Get the first outcome (usually "Yes" or the favored outcome)
            outcome = market.outcomes[0]
            
            # Higher price = better for the bettor
            if outcome.price > best_price:
                best_price = outcome.price
                best_platform = market.platform
                best_outcome_name = outcome.name
                best_odds = outcome.american_odds
            
            if outcome.price < worst_price:
                worst_price = outcome.price
        
        if not best_platform:
            return None
        
        # Calculate price spread (in probability terms)
        price_spread = round((best_price - worst_price) * 100, 2)  # Convert to percentage
        
        # Check for arbitrage opportunities
        # Collect best prices for all outcomes across platforms
        outcome_best_prices = []
        for market in markets:
            for outcome in market.outcomes:
                outcome_best_prices.append(outcome.price)
        
        arbitrage, arb_percentage = calculate_arbitrage(outcome_best_prices)
        
        comparison = MarketComparison(
            question=question,
            markets=markets,
            best_platform=best_platform,
            best_outcome_name=best_outcome_name,
            best_price=best_price,
            best_odds=best_odds,
            price_spread=price_spread,
            arbitrage_opportunity=arbitrage,
            arbitrage_percentage=arb_percentage,
            market_type=market_type,
            normalized_title=normalized_title
        )
        
        return comparison
    
    def calculate_price_deltas(self, old_comparisons: List[MarketComparison]) -> List[MarketComparison]:
        """
        Calculate price changes from previous comparisons
        """
        if not old_comparisons:
            return self.comparisons
        
        # Create a map of old comparisons by normalized title
        old_comp_map = {comp.normalized_title: comp for comp in old_comparisons}
        
        for comparison in self.comparisons:
            old_comp = old_comp_map.get(comparison.normalized_title)
            if not old_comp:
                continue
            
            # Calculate deltas for each platform
            for market in comparison.markets:
                # Find the corresponding market in old comparison
                old_market = None
                for old_m in old_comp.markets:
                    if old_m.platform == market.platform:
                        old_market = old_m
                        break
                
                if not old_market or not market.outcomes or not old_market.outcomes:
                    continue
                
                # Calculate delta for first outcome
                old_price = old_market.outcomes[0].price
                new_price = market.outcomes[0].price
                delta = round((new_price - old_price) * 100, 2)  # Percentage points
                
                comparison.price_deltas[market.platform.value] = delta
        
        return self.comparisons
    
    def get_best_odds_markets(self, limit: int = 10) -> List[MarketComparison]:
        """Get markets with the best price differentials"""
        # Sort by price spread (descending)
        sorted_comps = sorted(
            self.comparisons,
            key=lambda c: c.price_spread,
            reverse=True
        )
        return sorted_comps[:limit]
    
    def get_arbitrage_opportunities(self) -> List[MarketComparison]:
        """Get markets with arbitrage opportunities"""
        return [c for c in self.comparisons if c.arbitrage_opportunity]
    
    def get_markets_by_type(self, market_type: MarketType) -> List[MarketComparison]:
        """Get comparisons filtered by market type"""
        return [c for c in self.comparisons if c.market_type == market_type]
    
    def print_summary(self):
        """Print a summary of aggregated markets"""
        print("\n" + "=" * 60)
        print("MARKET AGGREGATION SUMMARY")
        print("=" * 60)
        
        # Count markets by platform
        platform_counts = {}
        for market in self.all_markets:
            platform = market.platform.value
            platform_counts[platform] = platform_counts.get(platform, 0) + 1
        
        print("\nMarkets by Platform:")
        for platform, count in platform_counts.items():
            print(f"  {platform}: {count}")
        
        # Count by market type
        type_counts = {}
        for market in self.all_markets:
            mtype = market.market_type.value
            type_counts[mtype] = type_counts.get(mtype, 0) + 1
        
        print("\nMarkets by Type:")
        for mtype, count in type_counts.items():
            print(f"  {mtype}: {count}")
        
        print(f"\nMatched Groups: {len(self.market_groups)}")
        print(f"Price Comparisons: {len(self.comparisons)}")
        print(f"Arbitrage Opportunities: {len(self.get_arbitrage_opportunities())}")
        
        # Show top opportunities
        if self.comparisons:
            print("\n" + "-" * 60)
            print("TOP 5 PRICE DIFFERENTIALS:")
            print("-" * 60)
            
            for i, comp in enumerate(self.get_best_odds_markets(5), 1):
                print(f"\n{i}. {comp.question[:60]}...")
                print(f"   Best: {comp.best_platform.value} @ {comp.best_odds} ({comp.best_price:.1%})")
                print(f"   Spread: {comp.price_spread:.2f}%")
                if comp.price_deltas:
                    deltas_str = ", ".join([f"{p}: {d:+.2f}%" for p, d in comp.price_deltas.items()])
                    print(f"   Δ: {deltas_str}")
        
        print("\n" + "=" * 60)


if __name__ == "__main__":
    # Test the aggregator
    aggregator = MarketAggregator()
    
    # Fetch markets
    print("Fetching markets from all platforms...")
    markets = aggregator.fetch_all_markets(
        include_polymarket=True,
        include_kalshi=True,
        include_limitless=True,
        limit_per_platform=50
    )
    
    # Match markets
    matched_groups = aggregator.match_markets()
    
    # Create comparisons
    comparisons = aggregator.create_comparisons()
    
    # Print summary
    aggregator.print_summary()

