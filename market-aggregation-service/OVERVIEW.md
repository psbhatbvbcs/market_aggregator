# Market Aggregation Service - Complete Overview

## 🎯 What It Does

This standalone service aggregates prediction markets from **Polymarket**, **Kalshi**, and **Limitless**, then:

1. ✅ **Fetches markets** from all three platforms in parallel
2. 🔍 **Matches similar markets** across platforms using fuzzy matching
3. 💰 **Compares prices** to find the best odds
4. 📊 **Tracks price changes** every 5 seconds with delta calculations
5. 🎲 **Identifies arbitrage opportunities** automatically
6. 🌐 **Provides REST API** for easy integration

## 📁 Project Structure

```
market-aggregation-service/
├── README.md                    # Overview and setup
├── USAGE.md                     # Comprehensive usage guide
├── OVERVIEW.md                  # This file
├── requirements.txt             # Python dependencies
├── config.example               # Configuration template
├── quickstart.sh               # Interactive setup script
│
├── models.py                    # Data models (UnifiedMarket, MarketComparison, etc.)
├── aggregator.py               # Core matching and comparison logic
├── price_tracker.py            # Continuous price monitoring (every 5s)
├── api_server.py               # REST API with FastAPI
├── main.py                     # Main entry point with CLI
│
└── api_clients/                # Platform-specific API clients
    ├── __init__.py
    ├── polymarket_client.py    # Polymarket Gamma API
    ├── kalshi_client.py        # Kalshi Trade API
    └── limitless_client.py     # Limitless Exchange API
```

## 🚀 Quick Start

### Option 1: Interactive Script

```bash
cd market-aggregation-service
./quickstart.sh
```

### Option 2: Manual

```bash
# Install dependencies
pip install -r requirements.txt

# Run single aggregation
python main.py single

# Or start price tracker (updates every 5s)
python main.py tracker

# Or start API server
python main.py api
```

## 🔧 How It Works

### 1. Data Fetching

Each platform has a dedicated client:

- **PolymarketClient**: Fetches from Gamma API (`https://gamma-api.polymarket.com`)
- **KalshiClient**: Fetches from Trade API (`https://api.elections.kalshi.com`)
- **LimitlessClient**: Fetches from Exchange API (`https://api.limitless.exchange`)

All markets are converted to a unified format (`UnifiedMarket`) for easy comparison.

### 2. Market Matching

The aggregator uses multiple strategies to match similar markets:

```python
# Title similarity
"Will Lakers beat Warriors?" ≈ "Lakers vs Warriors winner"

# Team extraction
Teams: ["lakers", "warriors"] → Match across platforms

# Time proximity
Events within 24 hours → Likely the same game

# Token-based matching
"Lakers Warriors win" ≈ "Warriors Lakers winner"
```

Similarity thresholds:
- Title: 80%
- Teams: 85%
- Token sort: 85%

### 3. Price Comparison

For each matched group:

```python
Example: "Lakers vs Warriors"

Polymarket: Yes @ 0.55 (+122)  ← Best odds
Kalshi:     Yes @ 0.52 (+108)
Limitless:  Yes @ 0.48 (-108)

Spread: 7% (55% - 48%)
Best Platform: Polymarket
```

### 4. Delta Tracking (Every 5 Seconds)

```python
Previous: Lakers @ 0.55 (55%)
Current:  Lakers @ 0.58 (58%)
Delta:    +3.0%  ▲
```

### 5. Arbitrage Detection

```python
Polymarket: Team A @ 0.45 (45%)
Kalshi:     Team B @ 0.48 (48%)
Total:      93% < 100%

Arbitrage: YES
Profit:    7% guaranteed
```

## 📊 Data Models

### UnifiedMarket

Standardized market across all platforms:

```python
{
  "platform": "polymarket",
  "market_id": "0x1234...",
  "question": "Will Lakers win?",
  "outcomes": [
    {
      "name": "Yes",
      "price": 0.55,
      "decimal_odds": 1.82,
      "american_odds": "+122"
    },
    {
      "name": "No",
      "price": 0.45,
      "decimal_odds": 2.22,
      "american_odds": "+122"
    }
  ],
  "market_type": "sports",
  "start_time": "2025-10-06T19:00:00Z",
  "total_volume": 125000,
  "is_active": true
}
```

### MarketComparison

Comparison across platforms:

```python
{
  "question": "Will Lakers win?",
  "markets": [...],  # UnifiedMarket objects
  "best_platform": "polymarket",
  "best_odds": "+122",
  "best_price": 0.55,
  "price_spread": 7.0,  # Percentage
  "arbitrage_opportunity": false,
  "price_deltas": {
    "polymarket": +2.5,  # Changed +2.5% since last update
    "kalshi": -1.0,
    "limitless": +0.5
  }
}
```

## 🌐 REST API

### Key Endpoints

```bash
GET  /stats                      # Overall statistics
GET  /markets                    # All markets (filterable)
GET  /markets/{id}               # Specific market
GET  /comparisons                # Price comparisons
GET  /comparisons/best-odds      # Top opportunities
GET  /comparisons/arbitrage      # Arbitrage only
POST /refresh                    # Trigger refresh
```

### Example Queries

```bash
# Get sports markets from Polymarket
curl "localhost:8000/markets?platform=polymarket&market_type=sports"

# Find best odds with >5% spread
curl "localhost:8000/comparisons?min_spread=5.0"

# Get arbitrage opportunities
curl "localhost:8000/comparisons/arbitrage"
```

## 🎨 Features in Detail

### Smart Matching

- **Fuzzy string matching** using Levenshtein distance
- **Team name extraction** from titles
- **Time proximity checking** for events
- **Category-based filtering** (sports, politics, etc.)
- **Cross-platform normalization** of market titles

### Price Tracking

- **5-second intervals** (configurable)
- **Delta calculation** for all platforms
- **History tracking** (last 1000 price points)
- **Significant change detection** (≥1% highlighted)
- **Automatic export** to JSON on exit

### Arbitrage Detection

- **Implied probability calculation**
- **Multi-outcome arbitrage** detection
- **Profit percentage** calculation
- **Real-time alerts** in tracker mode

### Data Export

All modes support JSON export:

```json
{
  "timestamp": "2025-10-06T15:30:00Z",
  "total_markets": 250,
  "comparisons": [
    {
      "question": "Will Lakers win?",
      "best_platform": "polymarket",
      "price_spread": 7.5,
      ...
    }
  ]
}
```

## 📈 Performance

- **Fetch speed**: ~10-30s for 300 markets (100 per platform)
- **Matching speed**: ~2-5s for 300 markets
- **Update cycle**: ~10-20s total (fetch + match + compare)
- **Memory usage**: ~100-200 MB
- **API response**: <1s after initialization

## 🔐 Authentication

### Polymarket

✅ No authentication required for read-only access

### Kalshi

⚠️ Optional but recommended:

1. Get API key from https://kalshi.com
2. Generate RSA key pair: `ssh-keygen -t rsa -b 2048 -m PEM -f rsa_key`
3. Set environment variables:
   ```bash
   export KALSHI_API_KEY="your_key"
   export KALSHI_PRIVATE_KEY_PATH="./rsa_key"
   ```

### Limitless

✅ No authentication required for read-only access

## 🎯 Use Cases

### 1. Find Best Odds

```bash
python main.py single
# Check output for markets with high price spread
```

### 2. Monitor Price Changes

```bash
python main.py tracker
# Watch for significant price movements
```

### 3. Arbitrage Hunting

```bash
python main.py api
curl "localhost:8000/comparisons/arbitrage"
```

### 4. Market Analysis

```bash
# Export data
python main.py single
# Analyze market_snapshot_*.json
```

### 5. Integration

```python
from aggregator import MarketAggregator

aggregator = MarketAggregator()
markets = aggregator.fetch_all_markets()
comparisons = aggregator.create_comparisons()

# Custom processing...
```

## 🐛 Troubleshooting

### No markets fetched

- Check internet connection
- Verify API endpoints are accessible
- Check for rate limiting

### No Kalshi markets

- Kalshi requires authentication
- Set `KALSHI_API_KEY` environment variable
- Ensure RSA private key path is correct

### Few matched markets

- Normal! Markets must be:
  - From different platforms
  - Very similar (80%+ match)
  - In same category
  - Close in time

### Memory issues

- Reduce `limit_per_platform`
- Price history limited to 1000 entries
- Export data periodically

## 📝 Example Output

### Single Mode

```
==================================================================
MARKET AGGREGATION SUMMARY
==================================================================

Markets by Platform:
  polymarket: 100
  kalshi: 80
  limitless: 70

Markets by Type:
  sports: 120
  politics: 80
  other: 50

Matched Groups: 45
Price Comparisons: 45
Arbitrage Opportunities: 3

------------------------------------------------------------
TOP 5 PRICE DIFFERENTIALS:
------------------------------------------------------------

1. Will Lakers beat Warriors?
   Best: polymarket @ +122 (55.0%)
   Spread: 7.50%

2. Will Trump win 2024 election?
   Best: kalshi @ -150 (60.0%)
   Spread: 5.25%

...
```

### Tracker Mode

```
======================================================================
UPDATE CYCLE #12 - 2025-10-06 15:30:45
======================================================================

[1/3] Fetching from Polymarket...
✓ Polymarket: 100 markets

[2/3] Fetching from Kalshi...
✓ Kalshi: 80 markets

[3/3] Fetching from Limitless...
✓ Limitless: 70 markets

----------------------------------------------------------------------
UPDATE SUMMARY
----------------------------------------------------------------------
Duration: 12.45s
Total Markets: 250
Matched Groups: 45
Comparisons: 45
Markets with Price Changes: 23

⚠️  5 markets with significant price changes (≥1%):

  • Will Lakers beat Warriors?...
    Best: polymarket @ +122
    ▲ polymarket: +2.50%
    ▼ kalshi: -1.20%
    ━ limitless: +0.30%

...
```

## 🚀 Future Enhancements

Potential additions:

- 📊 **Historical database** (PostgreSQL/MongoDB)
- 📱 **Webhooks** for price alerts
- 🎨 **Web dashboard** (React/Vue)
- 🤖 **Telegram bot** integration
- 📈 **Advanced analytics** (ML predictions)
- 🔔 **Real-time notifications**
- 💹 **Automated trading** (with caution!)

## 📞 Support

For issues or questions:

1. Check `USAGE.md` for detailed examples
2. Test individual clients: `python api_clients/polymarket_client.py`
3. Review error messages in console output
4. Check API documentation: http://localhost:8000/docs

## 🎉 Success Criteria

You know it's working when:

✅ All three platforms return markets  
✅ Markets are matched across platforms  
✅ Price comparisons show spread differences  
✅ Tracker shows price deltas  
✅ API server responds with data  
✅ JSON export contains meaningful data

## 📜 License

This is a standalone service for educational and research purposes. Use responsibly and comply with each platform's terms of service.

---

**Happy aggregating! 📊💰**

