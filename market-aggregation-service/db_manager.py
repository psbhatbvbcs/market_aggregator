"""
MongoDB Manager for Market Comparisons

Stores market comparison data including full API responses and comparisons.
"""

from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
import json
from dotenv import load_dotenv

load_dotenv()


class MarketDBManager:
    """Manages MongoDB operations for market comparisons"""
    
    def __init__(self, connection_string: str = None):
        """
        Initialize MongoDB connection
        
        Args:
            connection_string: MongoDB connection string (defaults to localhost)
        """
        if connection_string is None:
            connection_string = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        
        self.client = MongoClient(connection_string)
        self.db = self.client['market_aggregator']
        
        # Collections
        self.comparisons = self.db['comparisons']
        self.price_history = self.db['price_history']
        self.market_snapshots = self.db['market_snapshots']
        
        # Create indexes
        self._create_indexes()
    
    def _create_indexes(self):
        """Create database indexes for efficient queries"""
        # Comparison indexes
        self.comparisons.create_index([("poly_id", ASCENDING)])
        self.comparisons.create_index([("kalshi_id", ASCENDING)])
        self.comparisons.create_index([("market_title", ASCENDING)])
        self.comparisons.create_index([("timestamp", DESCENDING)])
        self.comparisons.create_index([("category", ASCENDING)])
        
        # Price history indexes
        self.price_history.create_index([
            ("poly_id", ASCENDING),
            ("kalshi_id", ASCENDING),
            ("timestamp", DESCENDING)
        ])
        
        # Market snapshot indexes
        self.market_snapshots.create_index([
            ("platform", ASCENDING),
            ("market_id", ASCENDING),
            ("timestamp", DESCENDING)
        ])
    
    def _extract_polymarket_prices(self, polymarket_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract prices and outcomes from Polymarket response
        Handles the fact that outcomes and outcomePrices are JSON strings
        """
        try:
            # Parse outcomes (JSON string to list)
            outcomes_str = polymarket_response.get('outcomes', '[]')
            if isinstance(outcomes_str, str):
                outcomes = json.loads(outcomes_str)
            else:
                outcomes = outcomes_str
            
            # Parse prices (JSON string to list)
            prices_str = polymarket_response.get('outcomePrices', '[]')
            if isinstance(prices_str, str):
                prices = json.loads(prices_str)
            else:
                prices = prices_str
            
            # Convert prices to floats
            prices = [float(p) for p in prices] if prices else []
            
            # Create outcome-price mapping
            result = {
                "volume": polymarket_response.get('volume'),
                "liquidity": polymarket_response.get('liquidity'),
                "volume_24hr": polymarket_response.get('volume24hr'),
                "outcomes": outcomes,
                "prices": prices,
            }
            
            # Add named prices (outcome1, outcome2, etc.)
            for i, (outcome, price) in enumerate(zip(outcomes, prices)):
                result[f"price_{outcome.lower()}"] = price
                result[f"outcome_{i+1}"] = outcome
                result[f"price_{i+1}"] = price
            
            return result
            
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            print(f"⚠️  Error extracting Polymarket prices: {e}")
            return {
                "volume": polymarket_response.get('volume'),
                "liquidity": polymarket_response.get('liquidity'),
                "volume_24hr": polymarket_response.get('volume24hr'),
                "outcomes": [],
                "prices": [],
            }
    
    def save_comparison(
        self,
        poly_id: str,
        kalshi_id: str,
        market_title: str,
        polymarket_response: Dict[str, Any],
        kalshi_response: Dict[str, Any],
        comparison_data: Dict[str, Any],
        category: str = "politics"
    ) -> str:
        """
        Save a market comparison to database
        
        Args:
            poly_id: Polymarket condition ID
            kalshi_id: Kalshi event ticker
            market_title: Market question/title
            polymarket_response: Full Polymarket API response
            kalshi_response: Full Kalshi API response
            comparison_data: Comparison analysis data
            category: Market category
        
        Returns:
            Inserted document ID
        """
        document = {
            "poly_id": poly_id,
            "kalshi_id": kalshi_id,
            "market_title": market_title,
            "category": category,
            "timestamp": datetime.utcnow(),
            
            # Full API responses
            "polymarket_response": polymarket_response,
            "kalshi_response": kalshi_response,
            
            # Comparison data
            "comparison": comparison_data,
            
            # Extracted key metrics
            "polymarket": self._extract_polymarket_prices(polymarket_response),
            "kalshi": {
                "price_yes": kalshi_response.get('yes_ask'),
                "price_no": kalshi_response.get('no_bid'),
                "volume": kalshi_response.get('volume'),
                "volume_24h": kalshi_response.get('volume_24h'),
                "liquidity": kalshi_response.get('liquidity'),
                "open_interest": kalshi_response.get('open_interest'),
            },
            
            # Price difference
            "price_spread": comparison_data.get('price_spread'),
            "best_platform": comparison_data.get('best_platform'),
            "arbitrage_opportunity": comparison_data.get('arbitrage_opportunity', False),
        }
        
        result = self.comparisons.insert_one(document)
        print(f"✅ Saved comparison to MongoDB: {market_title}")
        return str(result.inserted_id)
    
    def save_price_snapshot(
        self,
        poly_id: str,
        kalshi_id: str,
        poly_prices: Dict[str, float],
        kalshi_prices: Dict[str, float]
    ):
        """
        Save a price snapshot for tracking price changes over time
        
        Args:
            poly_id: Polymarket condition ID
            kalshi_id: Kalshi event ticker
            poly_prices: Polymarket outcome prices
            kalshi_prices: Kalshi outcome prices
        """
        document = {
            "poly_id": poly_id,
            "kalshi_id": kalshi_id,
            "timestamp": datetime.utcnow(),
            "polymarket_prices": poly_prices,
            "kalshi_prices": kalshi_prices,
        }
        
        self.price_history.insert_one(document)
    
    def get_price_history(
        self,
        poly_id: str,
        kalshi_id: str,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get price history for a market pair
        
        Args:
            poly_id: Polymarket condition ID
            kalshi_id: Kalshi event ticker
            hours: Number of hours to look back
        
        Returns:
            List of price snapshots
        """
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        cursor = self.price_history.find({
            "poly_id": poly_id,
            "kalshi_id": kalshi_id,
            "timestamp": {"$gte": cutoff}
        }).sort("timestamp", ASCENDING)
        
        return list(cursor)
    
    def get_latest_comparison(self, poly_id: str = None, kalshi_id: str = None) -> Optional[Dict[str, Any]]:
        """
        Get the most recent comparison for a market
        
        Args:
            poly_id: Polymarket condition ID (optional)
            kalshi_id: Kalshi event ticker (optional)
        
        Returns:
            Latest comparison document or None
        """
        query = {}
        if poly_id:
            query["poly_id"] = poly_id
        if kalshi_id:
            query["kalshi_id"] = kalshi_id
        
        return self.comparisons.find_one(query, sort=[("timestamp", DESCENDING)])
    
    def get_all_tracked_markets(self) -> List[Dict[str, str]]:
        """
        Get all market pairs that are being tracked
        
        Returns:
            List of {poly_id, kalshi_id, market_title} dicts
        """
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "poly_id": "$poly_id",
                        "kalshi_id": "$kalshi_id"
                    },
                    "market_title": {"$last": "$market_title"},
                    "latest_timestamp": {"$max": "$timestamp"}
                }
            },
            {"$sort": {"latest_timestamp": -1}}
        ]
        
        results = self.comparisons.aggregate(pipeline)
        
        markets = []
        for r in results:
            markets.append({
                "poly_id": r['_id']['poly_id'],
                "kalshi_id": r['_id']['kalshi_id'],
                "market_title": r['market_title']
            })
        
        return markets
    
    def close(self):
        """Close MongoDB connection"""
        self.client.close()


if __name__ == "__main__":
    # Test the database manager
    print("Testing MongoDB Manager...")
    
    db = MarketDBManager()
    
    # Test save
    test_comparison = db.save_comparison(
        poly_id="0xtest123",
        kalshi_id="KXTEST-26JAN01",
        market_title="Test Market",
        polymarket_response={"volume": 1000, "liquidity": 500},
        kalshi_response={"volume": 2000, "liquidity": 1000},
        comparison_data={"price_spread": 5.0, "best_platform": "polymarket"},
        category="test"
    )
    
    print(f"✅ Saved test comparison: {test_comparison}")
    
    # Test retrieve
    latest = db.get_latest_comparison(poly_id="0xtest123")
    if latest:
        print(f"✅ Retrieved: {latest['market_title']}")
    
    # Cleanup test
    db.comparisons.delete_one({"_id": test_comparison})
    print("✅ Cleaned up test data")
    
    db.close()
    print("\n✅ MongoDB Manager test complete!")

