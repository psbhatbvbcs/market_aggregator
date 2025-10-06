# Market Aggregation Service - Usage Guide

## Quick Start

### 1. Installation

```bash
cd market-aggregation-service
pip install -r requirements.txt
```

### 2. Configuration (Optional)

For Kalshi API access, create a `.env` file:

```bash
cp config.example .env
# Edit .env with your Kalshi API credentials
```

### 3. Run the Service

The service has three modes:

#### Mode 1: Single Aggregation (One-time)

Fetches markets once, matches them, and exports results:

```bash
python main.py single
```

**Output:**
- Console output with summary
- JSON file: `market_snapshot_YYYYMMDD_HHMMSS.json`

#### Mode 2: Continuous Price Tracker (Every 5 seconds)

Continuously tracks prices with delta calculations:

```bash
python main.py tracker
```

**Features:**
- Updates every 5 seconds
- Calculates price deltas
- Identifies arbitrage opportunities
- Shows significant price changes
- Press `Ctrl+C` to stop and export final data

#### Mode 3: REST API Server

Start an HTTP API server to query aggregated data:

```bash
python main.py api
```

**Access:**
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc

**Custom host/port:**
```bash
python main.py api --host 0.0.0.0 --port 8080
```

## API Endpoints

### GET /

Root endpoint with API information

### GET /stats

Get aggregation statistics:

```json
{
  "total_markets": 250,
  "matched_groups": 45,
  "comparisons": 45,
  "arbitrage_opportunities": 3,
  "by_platform": {
    "polymarket": 100,
    "kalshi": 80,
    "limitless": 70
  },
  "by_type": {
    "sports": 120,
    "politics": 80,
    "other": 50
  }
}
```

### GET /markets

Get all markets with optional filtering:

**Query Parameters:**
- `platform`: Filter by platform (polymarket, kalshi, limitless)
- `market_type`: Filter by type (sports, politics, crypto, etc.)
- `limit`: Max results (default: 50, max: 500)

**Example:**
```bash
curl "http://localhost:8000/markets?platform=polymarket&market_type=sports&limit=10"
```

### GET /markets/{market_id}

Get a specific market by ID:

```bash
curl "http://localhost:8000/markets/0x1234..."
```

### GET /comparisons

Get market price comparisons:

**Query Parameters:**
- `market_type`: Filter by type
- `min_spread`: Minimum price spread percentage
- `limit`: Max results (default: 50)

**Example:**
```bash
curl "http://localhost:8000/comparisons?market_type=sports&min_spread=5.0"
```

### GET /comparisons/best-odds

Get markets with the best price differentials:

**Query Parameters:**
- `limit`: Number of markets (default: 20, max: 100)

**Example:**
```bash
curl "http://localhost:8000/comparisons/best-odds?limit=10"
```

**Response:**
```json
{
  "count": 10,
  "markets": [
    {
      "question": "Will the Lakers win?",
      "best_platform": "polymarket",
      "best_odds": "+150",
      "best_price": 0.40,
      "price_spread": 8.5,
      "markets": [...]
    }
  ]
}
```

### GET /comparisons/arbitrage

Get markets with arbitrage opportunities:

```bash
curl "http://localhost:8000/comparisons/arbitrage"
```

### GET /platforms

Get list of supported platforms

### POST /refresh

Manually trigger a data refresh:

```bash
curl -X POST "http://localhost:8000/refresh"
```

## Understanding the Output

### Price Spread

The difference in implied probability between the best and worst odds:

- **High Spread (>5%)**: Significant price difference, good opportunity
- **Medium Spread (2-5%)**: Moderate difference
- **Low Spread (<2%)**: Markets are aligned

### American Odds

- **Positive (+150)**: Underdog - Bet $100 to win $150
- **Negative (-200)**: Favorite - Bet $200 to win $100

### Price Deltas

Change in implied probability since last update:

- **+2.5%**: Price increased by 2.5 percentage points
- **-1.8%**: Price decreased by 1.8 percentage points

### Arbitrage Opportunities

When the sum of best prices across platforms < 100%, indicating guaranteed profit:

```
Example:
- Polymarket: Team A @ 45% (Yes)
- Kalshi: Team B @ 48% (No on Team A)
Total: 93% < 100% → 7% arbitrage opportunity
```

## Examples

### Example 1: Find Best Sports Betting Odds

```bash
# Single run
python main.py single

# Look for sports markets with >5% spread
curl "http://localhost:8000/comparisons?market_type=sports&min_spread=5.0"
```

### Example 2: Monitor NBA Markets

```bash
# Start tracker
python main.py tracker

# Watch for significant price changes in NBA markets
# The tracker will highlight markets with ≥1% changes
```

### Example 3: Find Arbitrage in Politics Markets

```bash
# Start API server
python main.py api

# Query arbitrage opportunities
curl "http://localhost:8000/comparisons/arbitrage" | jq '.opportunities[] | select(.market_type == "politics")'
```

### Example 4: Compare Specific Market

```bash
# Get market ID from one platform
# Then check comparisons for that market
curl "http://localhost:8000/comparisons" | jq '.comparisons[] | select(.question | contains("Lakers"))'
```

## Advanced Usage

### Testing Individual Clients

Test Polymarket client:
```bash
python api_clients/polymarket_client.py
```

Test Kalshi client:
```bash
python api_clients/kalshi_client.py
```

Test Limitless client:
```bash
python api_clients/limitless_client.py
```

### Testing the Aggregator

```bash
python aggregator.py
```

### Custom Integration

```python
from aggregator import MarketAggregator
from models import Platform, MarketType

# Create aggregator
aggregator = MarketAggregator()

# Fetch markets
markets = aggregator.fetch_all_markets(limit_per_platform=50)

# Match across platforms
matched = aggregator.match_markets()

# Create comparisons
comparisons = aggregator.create_comparisons()

# Get best odds
best_odds = aggregator.get_best_odds_markets(limit=10)

# Get arbitrage opportunities
arbitrage = aggregator.get_arbitrage_opportunities()

# Filter by type
sports_comps = aggregator.get_markets_by_type(MarketType.SPORTS)
```

## Troubleshooting

### No Kalshi markets fetched

- Kalshi requires authentication for most endpoints
- Set `KALSHI_API_KEY` and `KALSHI_PRIVATE_KEY_PATH` in `.env`
- Generate RSA key: `ssh-keygen -t rsa -b 2048 -m PEM -f rsa_key`

### Connection timeouts

- Check your internet connection
- Some platforms may have rate limits
- Try reducing `limit_per_platform`

### No matched markets

- Markets must be from different platforms
- Similarity threshold is high (80%+)
- Check if markets are from similar categories

### Memory issues with tracker

- Price history is limited to last 1000 entries
- Export data periodically: `tracker.export_to_json()`

## Performance

- **Single run**: ~10-30 seconds depending on limits
- **Tracker update cycle**: ~10-20 seconds per cycle
- **API response time**: <1 second (after initialization)
- **Memory usage**: ~100-200 MB for 300 markets

## Tips

1. **Start with single mode** to verify everything works
2. **Use tracker mode** for real-time monitoring
3. **Use API mode** for integration with other systems
4. **Set reasonable limits** (50-100 per platform is good)
5. **Monitor for patterns** in price changes over time
6. **Check arbitrage opportunities** - they're rare but valuable!

## Data Export

All modes can export data to JSON:

```bash
# Single mode: Automatic export
python main.py single
# Creates: market_snapshot_YYYYMMDD_HHMMSS.json

# Tracker mode: Export on exit (Ctrl+C)
python main.py tracker
# Creates: final_market_data.json

# API mode: Manual export
curl -X POST "http://localhost:8000/refresh"
```

## Next Steps

- Integrate with a database for historical tracking
- Add webhooks for price alerts
- Build a frontend dashboard
- Add more platforms (Odds API, Overtime, etc.)
- Implement automated trading strategies (at your own risk!)

