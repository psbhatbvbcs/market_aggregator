# Market Aggregator Dashboard

A real-time dashboard for comparing prediction markets across multiple platforms (Polymarket, Kalshi, and traditional sportsbooks).

## Features

- **NFL Markets**
  - Crypto Markets: Compare Polymarket + Kalshi odds
  - Traditional Sportsbooks: Compare traditional bookmaker odds via The Odds API
- **Politics Markets**: Compare Polymarket + Kalshi politics predictions
- **Auto-refresh**: Data updates every 5 seconds
- **Visual Indicators**: Green highlights for best odds, red for worse
- **Arbitrage Detection**: Automatically flags arbitrage opportunities

## Architecture

### Backend (FastAPI)
- `market-aggregation-service/api_server.py` - REST API server
- Endpoints:
  - `GET /nfl/crypto` - NFL markets from Polymarket + Kalshi
  - `GET /nfl/traditional` - NFL odds from traditional sportsbooks
  - `GET /politics` - Politics markets from Polymarket + Kalshi

### Frontend (Next.js)
- `aggregator-dashboard-web/` - React/Next.js dashboard
- Components:
  - `MarketAggregatorDashboard.tsx` - Main dashboard with tabs
  - `ComparisonGroup.tsx` - Comparison card groups
  - `MarketCard.tsx` - Individual platform market cards
  - `TraditionalOddsCard.tsx` - Traditional sportsbook odds cards

## Setup

### 1. Backend Setup

```bash
cd market-aggregation-service

# Install Python dependencies
pip install -r requirements.txt

# Set up environment variables (optional)
cp config.example .env
# Edit .env with your API keys if needed
```

### 2. Frontend Setup

```bash
cd aggregator-dashboard-web

# Install Node dependencies
npm install
```

## Running the Application

### Option 1: Manual Start

**Terminal 1 - Start Backend:**
```bash
cd market-aggregation-service
python api_server.py
```
Backend will run on http://localhost:8000

**Terminal 2 - Start Frontend:**
```bash
cd aggregator-dashboard-web
npm run dev
```
Frontend will run on http://localhost:3000

### Option 2: Quick Start Script

```bash
# Make the script executable (first time only)
chmod +x start_dashboard.sh

# Run both backend and frontend
./start_dashboard.sh
```

## Usage

1. Open your browser to http://localhost:3000
2. Navigate between tabs:
   - **NFL**: View NFL game comparisons
     - Click "Kalshi + Polymarket" for crypto markets
     - Click "Traditional Sportsbooks" for bookmaker odds
   - **Politics**: View politics market comparisons
   - **Others**: Placeholder for future markets
3. Data auto-refreshes every 5 seconds
4. Green borders indicate the best odds
5. Yellow badges indicate arbitrage opportunities

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

## Configuration

### Backend Configuration

Edit `market-aggregation-service/config` or set environment variables:
- `KALSHI_API_KEY` - Kalshi API key (optional)
- `ODDS_API_KEY` - The Odds API key (hardcoded in api_server.py)

### Frontend Configuration

Edit the API base URL in `aggregator-dashboard-web/components/MarketAggregatorDashboard.tsx`:
```typescript
const API_BASE_URL = "http://localhost:8000";
```

## Data Sources

- **Polymarket**: Prediction markets with high liquidity
- **Kalshi**: CFTC-regulated prediction markets
- **Traditional Sportsbooks**: Via The Odds API (FanDuel, DraftKings, etc.)

## Filtering Logic

### NFL Crypto Markets
- Only includes markets with spread ≤ 0.05 (liquid markets)
- Only binary markets (2 outcomes)
- Future games only (within 2 hours from now)

### Politics Markets
- Manually mapped market pairs
- Add mappings in `market-aggregation-service/market_mappings.py`

## Troubleshooting

### Backend Issues

**"No markets found"**
- Check if games are scheduled for the current week
- Verify API keys are set correctly
- Check backend logs for API errors

**CORS errors**
- Ensure backend is running on port 8000
- Check CORS settings in `api_server.py`

### Frontend Issues

**"Failed to fetch"**
- Ensure backend is running
- Check API_BASE_URL in dashboard component
- Verify no firewall blocking localhost:8000

**Data not refreshing**
- Check browser console for errors
- Verify backend is responding to API calls
- Check network tab in browser dev tools

## Development

### Adding New Market Categories

1. Add endpoint in `api_server.py`:
```python
@app.get("/new-category")
async def get_new_category():
    # Fetch and return data
    pass
```

2. Update types in `lib/market-types.ts`

3. Add tab in `MarketAggregatorDashboard.tsx`

4. Create new card component if needed

### Customizing Refresh Interval

Edit in `MarketAggregatorDashboard.tsx`:
```typescript
const REFRESH_INTERVAL = 5000; // Change to desired milliseconds
```

## Future Enhancements

- [ ] Historical price charts
- [ ] Push notifications for arbitrage
- [ ] More market categories (UFC, NBA, etc.)
- [ ] Export to CSV/Excel
- [ ] User-defined market mappings
- [ ] Mobile responsive improvements
- [ ] Dark mode

## License

MIT

