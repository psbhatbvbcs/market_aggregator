# Politics Market Tracking System

Complete system for tracking and comparing politics markets across Polymarket and Kalshi.

## 🎯 Features

### 1. **Excel Export** (Multiple Sheets)
- ✅ One Excel file per tracking iteration
- ✅ Multiple sheets (one per market pair)
- ✅ Comprehensive comparison data:
  - Market prices (Yes/No for both platforms)
  - Volume & Liquidity metrics
  - 24-hour volume
  - Open Interest (Kalshi)
  - Price spread calculation
  - Best platform indicator
  - Arbitrage opportunities
  - Timestamp

### 2. **MongoDB Integration**
- ✅ Stores full API responses from both platforms
- ✅ Comparison metadata (poly_id, kalshi_id, market_title, category)
- ✅ Price history tracking
- ✅ Market snapshots
- ✅ Indexed for fast queries

### 3. **Continuous Tracking**
- ✅ Configurable interval (default: 5 seconds)
- ✅ Real-time price monitoring
- ✅ Automatic data collection

---

## 📊 Excel Output Format

Each Excel file contains sheets named after markets, with the following structure:

| Metric | Polymarket | Kalshi | Difference |
|--------|------------|--------|------------|
| **MARKET COMPARISON** | | | |
| Market Title | Will Xi visit the US... | Will Xi visit the US... | |
| Market ID | 0x576dd... | KXXIVISITUSA-26JAN01 | |
| | | | |
| **PRICES** | | | |
| Yes Price (%) | 5.40% | 2.00% | 3.40% |
| | | | |
| **VOLUME & LIQUIDITY** | | | |
| Total Volume ($) | $2,275 | $5,559 | $3,284 |
| Volume 24h ($) | $264 | $70 | |
| Liquidity ($) | $1,555 | $2,877 | $1,322 |
| Open Interest (contracts) | N/A | 4,375 | |
| | | | |
| **COMPARISON SUMMARY** | | | |
| Price Spread | | | 3.40% |
| Best Platform | ✓ | | |
| Arbitrage Opportunity | | | NO |
| | | | |
| Timestamp | 2025-10-06 19:15:30 | | |

---

## 💾 MongoDB Schema

### Collections

#### 1. `comparisons`
```javascript
{
  _id: ObjectId,
  poly_id: "0x576ddfc4a6f4641d33af22a70c5c533f6ff52d1b0bf3bf127ebdc30c7f573b85",
  kalshi_id: "KXXIVISITUSA-26JAN01",
  market_title: "Will XI visit the USA in 2025?",
  category: "politics",
  timestamp: ISODate("2025-10-06T19:15:30Z"),
  
  // Full API responses
  polymarket_response: { ... },
  kalshi_response: { ... },
  
  // Comparison data
  comparison: {
    poly_yes_price: 0.054,
    kalshi_yes_price: 0.02,
    price_spread: 3.4,
    best_platform: "polymarket",
    arbitrage_opportunity: false
  },
  
  // Extracted metrics
  polymarket: {
    price_yes: 0.054,
    price_no: 0.946,
    volume: 2275.206878,
    liquidity: 1555.26182,
    volume_24hr: 263.63661
  },
  kalshi: {
    price_yes: 0.02,
    price_no: 0.92,
    volume: 5559,
    volume_24h: 70,
    liquidity: 2877,
    open_interest: 4375
  },
  
  price_spread: 3.4,
  best_platform: "polymarket",
  arbitrage_opportunity: false
}
```

#### 2. `price_history`
```javascript
{
  _id: ObjectId,
  poly_id: "0x576dd...",
  kalshi_id: "KXXIVISITUSA-26JAN01",
  timestamp: ISODate("2025-10-06T19:15:30Z"),
  polymarket_prices: { yes: 0.054 },
  kalshi_prices: { yes: 0.02 }
}
```

#### 3. `market_snapshots`
```javascript
{
  _id: ObjectId,
  platform: "polymarket",
  market_id: "0x576dd...",
  timestamp: ISODate("2025-10-06T19:15:30Z"),
  data: { ... }
}
```

---

## 🚀 Usage

### Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start MongoDB (required for DB tracking)
mongod

# Run tracker (default: 5s interval, MongoDB + Excel)
python politics_tracker.py
```

### Command Line Options

```bash
# Custom interval
python politics_tracker.py --interval 10  # 10 seconds

# Disable MongoDB (Excel only)
python politics_tracker.py --no-db

# Disable Excel (MongoDB only)
python politics_tracker.py --no-excel

# Limited iterations (for testing)
python politics_tracker.py --max-iterations 5

# Combine options
python politics_tracker.py --interval 30 --no-db --max-iterations 10
```

### Configuration

Edit `market_mappings.py` to add/remove markets:

```python
"politics": [
    {
        "polymarket_id": "0x576ddfc4a6f4641d33af22a70c5c533f6ff52d1b0bf3bf127ebdc30c7f573b85",
        "kalshi_id": "KXXIVISITUSA-26JAN01",
        "description": "Will XI visit the USA in 2025?"
    },
    # Add more markets here
],
```

---

## 📁 File Structure

```
market-aggregation-service/
├── politics_tracker.py          # Main tracking script
├── db_manager.py                # MongoDB operations
├── excel_exporter.py            # Excel export with multiple sheets
├── market_mappings.py           # Manual market ID mappings
├── api_clients/
│   ├── polymarket_client.py     # Polymarket API (with volume/liquidity)
│   └── kalshi_client.py         # Kalshi API (with volume/liquidity)
├── politics_comparison.py       # One-time comparison
└── requirements.txt             # Dependencies
```

---

## 🔍 Querying MongoDB

```javascript
// Get all comparisons for a market
db.comparisons.find({
  poly_id: "0x576ddfc4a6f4641d33af22a70c5c533f6ff52d1b0bf3bf127ebdc30c7f573b85"
}).sort({ timestamp: -1 })

// Get price history
db.price_history.find({
  poly_id: "0x576ddfc4a6f4641d33af22a70c5c533f6ff52d1b0bf3bf127ebdc30c7f573b85",
  kalshi_id: "KXXIVISITUSA-26JAN01"
}).sort({ timestamp: 1 })

// Find arbitrage opportunities
db.comparisons.find({
  arbitrage_opportunity: true
}).sort({ price_spread: -1 })

// Get latest comparison for each market
db.comparisons.aggregate([
  { $sort: { timestamp: -1 } },
  { $group: {
      _id: { poly_id: "$poly_id", kalshi_id: "$kalshi_id" },
      latest: { $first: "$$ROOT" }
    }
  }
])
```

---

## 🎯 Next Steps

1. **Add more markets**: Edit `market_mappings.py`
2. **Monitor MongoDB**: Use MongoDB Compass or mongo shell
3. **Analyze data**: Query price history for trends
4. **Set alerts**: Monitor for arbitrage opportunities
5. **Visualize**: Create charts from MongoDB data

---

## 📝 Notes

- **Excel files**: Timestamped, one per iteration
- **MongoDB**: Requires `mongod` running on localhost:27017
- **Rate limits**: Be respectful of API rate limits
- **Data storage**: MongoDB will grow over time, plan for disk space

---

## ✅ What's Working

- ✅ Real-time price tracking every 5 seconds
- ✅ Multi-sheet Excel export
- ✅ Complete MongoDB integration
- ✅ Volume & liquidity comparison
- ✅ Price spread calculation
- ✅ Best platform identification
- ✅ Continuous monitoring
- ✅ Graceful shutdown (Ctrl+C)

## 🎉 System Complete!

You now have a production-ready market tracking system with comprehensive data storage and analysis capabilities!

