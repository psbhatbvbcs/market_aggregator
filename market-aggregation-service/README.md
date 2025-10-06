# Market Aggregation Service

A standalone service that aggregates prediction markets from Polymarket and Kalshi, comparing prices in real-time to find the best odds.

## Features

- **Multi-Platform Support**: Aggregates markets from Polymarket and Kalshi
- **Real-Time Price Comparison**: Updates every 5 seconds with delta tracking
- **Smart Market Matching**: Fuzzy matching to identify similar markets across platforms
- **Best Odds Detection**: Automatically identifies the platform with the best odds
- **Price History**: Tracks price changes over time
- **REST API**: Query aggregated data via HTTP endpoints

## Installation

```bash
cd market-aggregation-service
pip install -r requirements.txt
```

## Configuration

Optional - Create a `.env` file for Kalshi authentication:

```
KALSHI_API_KEY=your_kalshi_api_key
KALSHI_PRIVATE_KEY_PATH=./rsa_key
```

Note: Most features work without authentication, but some Kalshi markets may require an API key.

## Usage

### Quick Start - Compare All Markets

```bash
python main.py single          # One-time comparison
python main.py tracker         # Continuous (every 5s)
python main.py api            # REST API server
```

### Sport-Specific Comparisons

**NFL Markets (Polymarket vs Kalshi):**
```bash
python nfl_comparison.py
```

**Any Sport (Configurable):**
```bash
python compare_sport.py NFL
python compare_sport.py NBA    # Add config in sports_config.py first
```

### Politics Markets with Manual Mapping

For politics markets (where wording differs significantly across platforms):

**1. Search and find market IDs:**
```bash
python add_politics_mapping.py
```

**2. Add mappings to `market_mappings.py`:**
```python
"politics": [
    {
        "polymarket_id": "0xabc123...",
        "kalshi_id": "KXPRES-2024-...",
        "description": "2024 Presidential Winner"
    },
],
```

**3. Run comparison:**
```bash
python politics_comparison.py
```

### Continuous Tracking (Every 5 Seconds)

Track markets continuously with MongoDB and Excel export:

**Prerequisites:**
```bash
# Install dependencies
pip install -r requirements.txt

# Start MongoDB (if not running)
mongod
```

**Start Tracker:**
```bash
# Default: 5 second interval, MongoDB + Excel enabled
python politics_tracker.py

# Custom interval (10 seconds)
python politics_tracker.py --interval 10

# Disable MongoDB (Excel only)
python politics_tracker.py --no-db

# Disable Excel (MongoDB only)
python politics_tracker.py --no-excel

# Run for limited iterations (e.g., 10)
python politics_tracker.py --max-iterations 10
```

**Features:**
- 📊 **Excel Export**: Creates timestamped Excel files with multiple sheets (one per market)
- 💾 **MongoDB**: Stores full API responses, comparisons, and price history
- ⏱️ **Real-time**: Updates every 5 seconds (configurable)
- 📈 **Price History**: Track price changes over time

**Run Example Demo:**
```bash
python example.py
```

## API Endpoints

- `GET /markets` - Get all aggregated markets
- `GET /markets/compare/{market_id}` - Get price comparison for a specific market
- `GET /markets/best-odds` - Get markets with the best odds across platforms
- `GET /platforms/{platform}/markets` - Get markets from a specific platform

## Architecture

- `models.py` - Data models for unified market representation
- `api_clients/` - Platform-specific API clients
- `aggregator.py` - Market aggregation and matching logic
- `price_tracker.py` - Real-time price tracking with 5-second intervals
- `api_server.py` - REST API for querying aggregated data
- `main.py` - Main entry point

## Market Matching

The service uses fuzzy matching to identify similar markets across platforms:
- Normalized title comparison
- Team name extraction and matching
- Event date/time proximity
- Category matching (sports, politics, etc.)

