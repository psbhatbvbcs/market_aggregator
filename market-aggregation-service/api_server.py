"""
REST API Server for querying aggregated market data
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from enum import Enum
import uvicorn
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models import Platform, MarketType
from aggregator import MarketAggregator
from price_tracker import PriceTracker

# Initialize FastAPI app
app = FastAPI(
    title="Market Aggregation API",
    description="Aggregates and compares prediction markets from Polymarket, Kalshi, and Limitless",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
aggregator = MarketAggregator()
tracker = PriceTracker(update_interval=5)

# Track initialization
initialized = False


@app.on_event("startup")
async def startup_event():
    """Initialize data on startup"""
    global initialized
    print("🚀 Starting Market Aggregation API...")
    print("📊 Fetching initial market data...")
    
    # Fetch initial data
    aggregator.fetch_all_markets(
        include_polymarket=True,
        include_kalshi=True,
        include_limitless=True,
        limit_per_platform=100
    )
    aggregator.match_markets()
    aggregator.create_comparisons()
    
    initialized = True
    print("✅ API Server Ready!")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Market Aggregation API",
        "version": "1.0.0",
        "endpoints": {
            "markets": "/markets",
            "comparisons": "/comparisons",
            "best_odds": "/comparisons/best-odds",
            "arbitrage": "/comparisons/arbitrage",
            "stats": "/stats",
            "platforms": "/platforms"
        }
    }


@app.get("/stats")
async def get_stats():
    """Get statistics about aggregated data"""
    if not initialized:
        raise HTTPException(status_code=503, detail="Service initializing...")
    
    # Count by platform
    platform_counts = {}
    for market in aggregator.all_markets:
        platform = market.platform.value
        platform_counts[platform] = platform_counts.get(platform, 0) + 1
    
    # Count by type
    type_counts = {}
    for market in aggregator.all_markets:
        mtype = market.market_type.value
        type_counts[mtype] = type_counts.get(mtype, 0) + 1
    
    return {
        "total_markets": len(aggregator.all_markets),
        "matched_groups": len(aggregator.market_groups),
        "comparisons": len(aggregator.comparisons),
        "arbitrage_opportunities": len(aggregator.get_arbitrage_opportunities()),
        "by_platform": platform_counts,
        "by_type": type_counts,
        "last_updated": aggregator.all_markets[0].fetched_at.isoformat() if aggregator.all_markets else None
    }


@app.get("/markets")
async def get_markets(
    platform: Optional[str] = Query(None, description="Filter by platform (polymarket, kalshi, limitless)"),
    market_type: Optional[str] = Query(None, description="Filter by type (sports, politics, crypto, etc)"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of markets to return")
):
    """Get all markets with optional filtering"""
    if not initialized:
        raise HTTPException(status_code=503, detail="Service initializing...")
    
    markets = aggregator.all_markets
    
    # Apply filters
    if platform:
        try:
            platform_enum = Platform(platform.lower())
            markets = [m for m in markets if m.platform == platform_enum]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}")
    
    if market_type:
        try:
            type_enum = MarketType(market_type.lower())
            markets = [m for m in markets if m.market_type == type_enum]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid market type: {market_type}")
    
    # Limit results
    markets = markets[:limit]
    
    return {
        "count": len(markets),
        "markets": [m.to_dict() for m in markets]
    }


@app.get("/markets/{market_id}")
async def get_market(market_id: str):
    """Get a specific market by ID"""
    if not initialized:
        raise HTTPException(status_code=503, detail="Service initializing...")
    
    for market in aggregator.all_markets:
        if market.market_id == market_id:
            return market.to_dict()
    
    raise HTTPException(status_code=404, detail="Market not found")


@app.get("/comparisons")
async def get_comparisons(
    market_type: Optional[str] = Query(None, description="Filter by type (sports, politics, crypto, etc)"),
    min_spread: float = Query(0.0, ge=0.0, description="Minimum price spread percentage"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of comparisons")
):
    """Get market comparisons"""
    if not initialized:
        raise HTTPException(status_code=503, detail="Service initializing...")
    
    comparisons = aggregator.comparisons
    
    # Apply filters
    if market_type:
        try:
            type_enum = MarketType(market_type.lower())
            comparisons = [c for c in comparisons if c.market_type == type_enum]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid market type: {market_type}")
    
    if min_spread > 0:
        comparisons = [c for c in comparisons if c.price_spread >= min_spread]
    
    # Sort by spread (best opportunities first)
    comparisons = sorted(comparisons, key=lambda c: c.price_spread, reverse=True)
    
    # Limit results
    comparisons = comparisons[:limit]
    
    return {
        "count": len(comparisons),
        "comparisons": [c.to_dict() for c in comparisons]
    }


@app.get("/comparisons/best-odds")
async def get_best_odds(
    limit: int = Query(20, ge=1, le=100, description="Number of markets to return")
):
    """Get markets with the best price differentials"""
    if not initialized:
        raise HTTPException(status_code=503, detail="Service initializing...")
    
    best_odds = aggregator.get_best_odds_markets(limit=limit)
    
    return {
        "count": len(best_odds),
        "markets": [c.to_dict() for c in best_odds]
    }


@app.get("/comparisons/arbitrage")
async def get_arbitrage():
    """Get markets with arbitrage opportunities"""
    if not initialized:
        raise HTTPException(status_code=503, detail="Service initializing...")
    
    arbitrage = aggregator.get_arbitrage_opportunities()
    
    return {
        "count": len(arbitrage),
        "opportunities": [c.to_dict() for c in arbitrage]
    }


@app.get("/platforms")
async def get_platforms():
    """Get list of supported platforms"""
    return {
        "platforms": [
            {
                "value": "polymarket",
                "name": "Polymarket",
                "description": "Decentralized prediction market"
            },
            {
                "value": "kalshi",
                "name": "Kalshi",
                "description": "CFTC-regulated event contracts"
            },
            {
                "value": "limitless",
                "name": "Limitless Exchange",
                "description": "Prediction market on Base"
            }
        ]
    }


@app.post("/refresh")
async def refresh_data():
    """Manually trigger a data refresh"""
    print("🔄 Manual refresh triggered...")
    
    # Fetch fresh data
    aggregator.fetch_all_markets(
        include_polymarket=True,
        include_kalshi=True,
        include_limitless=True,
        limit_per_platform=100
    )
    aggregator.match_markets()
    aggregator.create_comparisons()
    
    return {
        "status": "success",
        "message": "Data refreshed successfully",
        "total_markets": len(aggregator.all_markets),
        "comparisons": len(aggregator.comparisons)
    }


def start_server(host: str = "0.0.0.0", port: int = 8000):
    """Start the API server"""
    print("=" * 70)
    print("MARKET AGGREGATION API SERVER")
    print("=" * 70)
    print(f"Starting server at http://{host}:{port}")
    print("API Documentation: http://localhost:8000/docs")
    print("=" * 70)
    
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    start_server()

