"""
Data models for the market aggregation service
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel

class Platform(Enum):
    """Supported platforms"""
    POLYMARKET = "polymarket"
    KALSHI = "kalshi"
    LIMITLESS = "limitless"

class MarketType(Enum):
    """Type of market"""
    SPORTS = "sports"
    POLITICS = "politics"
    CRYPTO = "crypto"
    ENTERTAINMENT = "entertainment"
    OTHER = "other"

@dataclass
class MarketOutcome:
    """Represents a single outcome in a market"""
    name: str
    price: float  # Probability (0.0 to 1.0)
    decimal_odds: float  # Decimal odds
    american_odds: str  # American odds format (+150, -200, etc)
    best_bid: Optional[float] = None
    best_ask: Optional[float] = None
    volume: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "price": self.price,
            "decimal_odds": self.decimal_odds,
            "american_odds": self.american_odds,
            "best_bid": self.best_bid,
            "best_ask": self.best_ask,
            "volume": self.volume
        }

@dataclass
class UnifiedMarket:
    """Unified market data structure across all platforms"""
    platform: Platform
    market_id: str
    question: str
    outcomes: List[MarketOutcome]
    market_type: MarketType
    
    # Timing
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    # Market metadata
    category: Optional[str] = None
    subcategory: Optional[str] = None
    sport: Optional[str] = None
    league: Optional[str] = None
    
    # Volume and liquidity
    total_volume: Optional[float] = None
    liquidity: Optional[float] = None
    
    # Status
    is_active: bool = True
    is_closed: bool = False
    
    # Original data
    raw_data: Dict[str, Any] = field(default_factory=dict)
    
    # Normalized fields for matching
    normalized_title: str = ""
    normalized_teams: List[str] = field(default_factory=list)
    
    # Timestamp
    fetched_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "platform": self.platform.value,
            "market_id": self.market_id,
            "question": self.question,
            "outcomes": [o.to_dict() for o in self.outcomes],
            "market_type": self.market_type.value,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "category": self.category,
            "subcategory": self.subcategory,
            "sport": self.sport,
            "league": self.league,
            "total_volume": self.total_volume,
            "liquidity": self.liquidity,
            "is_active": self.is_active,
            "is_closed": self.is_closed,
            "normalized_title": self.normalized_title,
            "normalized_teams": self.normalized_teams,
            "fetched_at": self.fetched_at.isoformat()
        }

@dataclass
class MarketComparison:
    """Comparison of the same market across different platforms"""
    question: str
    markets: List[UnifiedMarket]
    best_platform: Platform
    best_outcome_name: str
    best_price: float
    best_odds: str
    price_spread: float  # Difference between best and worst odds
    arbitrage_opportunity: bool = False
    arbitrage_percentage: Optional[float] = None
    
    # Delta tracking
    price_deltas: Dict[str, float] = field(default_factory=dict)  # Platform -> delta
    
    # Metadata
    market_type: MarketType = MarketType.OTHER
    normalized_title: str = ""
    last_updated: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "question": self.question,
            "markets": [m.to_dict() for m in self.markets],
            "best_platform": self.best_platform.value,
            "best_outcome_name": self.best_outcome_name,
            "best_price": self.best_price,
            "best_odds": self.best_odds,
            "price_spread": self.price_spread,
            "arbitrage_opportunity": self.arbitrage_opportunity,
            "arbitrage_percentage": self.arbitrage_percentage,
            "price_deltas": self.price_deltas,
            "market_type": self.market_type.value,
            "normalized_title": self.normalized_title,
            "last_updated": self.last_updated.isoformat()
        }

@dataclass
class PriceHistory:
    """Track price history for a market on a platform"""
    platform: Platform
    market_id: str
    outcome_name: str
    timestamp: datetime
    price: float
    volume: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "platform": self.platform.value,
            "market_id": self.market_id,
            "outcome_name": self.outcome_name,
            "timestamp": self.timestamp.isoformat(),
            "price": self.price,
            "volume": self.volume
        }

def calculate_decimal_odds(probability: float) -> float:
    """Convert probability to decimal odds"""
    if probability <= 0 or probability >= 1:
        return 0.0
    return round(1.0 / probability, 2)

def calculate_american_odds(probability: float) -> str:
    """Convert probability to American odds format"""
    if probability <= 0 or probability >= 1:
        return "N/A"
    
    decimal = 1.0 / probability
    
    if decimal >= 2.0:
        # Underdog (positive odds)
        american = int((decimal - 1) * 100)
        return f"+{american}"
    else:
        # Favorite (negative odds)
        american = int(-100 / (decimal - 1))
        return str(american)

def normalize_market_title(title: str) -> str:
    """Normalize market title for comparison across platforms"""
    # Convert to lowercase
    normalized = title.lower()
    
    # Remove common prefixes
    prefixes = ["will ", "who will ", "which ", "does ", "is ", "are ", "what "]
    for prefix in prefixes:
        if normalized.startswith(prefix):
            normalized = normalized[len(prefix):]
    
    # Remove common suffixes
    suffixes = [" win", " beat", " defeat", "?", ".", " win?", " beat?"]
    for suffix in suffixes:
        if normalized.endswith(suffix):
            normalized = normalized[:-len(suffix)]
    
    # Remove extra whitespace
    normalized = " ".join(normalized.split())
    
    return normalized

def extract_team_names(title: str) -> List[str]:
    """Extract team/participant names from market title"""
    teams = []
    
    # Look for "vs" patterns
    if " vs. " in title:
        parts = title.split(" vs. ")
        teams = [p.strip() for p in parts]
    elif " vs " in title:
        parts = title.split(" vs ")
        teams = [p.strip() for p in parts]
    elif " @ " in title:
        parts = title.split(" @ ")
        teams = [p.strip() for p in parts]
    
    # Normalize team names
    teams = [normalize_market_title(t) for t in teams]
    
    return teams

def calculate_arbitrage(outcomes: List[float]) -> tuple[bool, Optional[float]]:
    """
    Calculate if there's an arbitrage opportunity
    Returns (has_arbitrage, profit_percentage)
    """
    if not outcomes or len(outcomes) < 2:
        return False, None
    
    # Sum of implied probabilities
    implied_prob_sum = sum(outcomes)
    
    # If sum < 1.0, there's an arbitrage opportunity
    if implied_prob_sum < 1.0:
        profit_percentage = (1.0 - implied_prob_sum) * 100
        return True, round(profit_percentage, 2)
    
    return False, None

