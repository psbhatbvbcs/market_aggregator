# Market Aggregation Service

A standalone service that aggregates prediction markets from Polymarket, Kalshi, and Limitless, comparing prices in real-time to find the best odds.

## Features

- **Multi-Platform Support**: Aggregates markets from Polymarket, Kalshi, and Limitless
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

Create a `.env` file:

```
KALSHI_API_KEY=your_kalshi_api_key
KALSHI_PRIVATE_KEY_PATH=./rsa_key
LIMITLESS_WALLET_ADDRESS=your_wallet_address
```

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

