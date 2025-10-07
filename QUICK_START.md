# Quick Start Guide - Market Aggregator Dashboard

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
cd /Users/musketeer/Vritti/market_aggregator
./setup_dashboard.sh
```

### Step 2: Start the Dashboard
```bash
./start_dashboard.sh
```

### Step 3: Open Your Browser
Navigate to: **http://localhost:3000**

That's it! The dashboard will auto-refresh every 5 seconds with live market data.

---

## 📋 What You'll See

### NFL Tab
- **Kalshi + Polymarket Button**: Compare crypto prediction markets
  - Shows side-by-side market comparisons
  - Green borders = best odds
  - Arbitrage opportunities highlighted
  
- **Traditional Sportsbooks Button**: Compare traditional bookmaker odds
  - Best odds across FanDuel, DraftKings, BetMGM, etc.
  - All bookmaker odds listed

### Politics Tab
- Compare Polymarket vs Kalshi for politics markets
- Manually mapped markets (add more in `market_mappings.py`)

### Others Tab
- Placeholder for future market categories

---

## 🎯 Key Features

✅ **Auto-Refresh**: Data updates every 5 seconds automatically  
✅ **Color Coding**: Green for best platform, red for worse  
✅ **Arbitrage Detection**: Highlights profitable opportunities  
✅ **Multi-Platform**: Polymarket, Kalshi, traditional sportsbooks  
✅ **Real-Time**: Live data from all sources  

---

## 🛠️ Manual Start (if needed)

**Terminal 1 - Backend:**
```bash
cd market-aggregation-service
python api_server.py
```
→ Runs on http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd aggregator-dashboard-web
npm run dev
```
→ Runs on http://localhost:3000

---

## 📁 Files Created

### Backend (FastAPI)
- `market-aggregation-service/api_server.py` - REST API server

### Frontend (Next.js)
- `aggregator-dashboard-web/lib/market-types.ts` - TypeScript types
- `aggregator-dashboard-web/components/MarketAggregatorDashboard.tsx` - Main dashboard
- `aggregator-dashboard-web/components/ComparisonGroup.tsx` - Comparison layout
- `aggregator-dashboard-web/components/MarketCard.tsx` - Platform cards
- `aggregator-dashboard-web/components/TraditionalOddsCard.tsx` - Sportsbook cards

### Documentation
- `DASHBOARD_README.md` - Full documentation
- `DASHBOARD_GUIDE.md` - Visual guide with examples
- `QUICK_START.md` - This file

### Scripts
- `setup_dashboard.sh` - Install all dependencies
- `start_dashboard.sh` - Start both backend and frontend
- `market-aggregation-service/test_api.py` - Test API endpoints

---

## 🧪 Test the API

To verify the backend is working:
```bash
cd market-aggregation-service
python test_api.py
```

Or visit: http://localhost:8000/docs for interactive API documentation

---

## ⚙️ Configuration

### Change Refresh Interval
Edit `components/MarketAggregatorDashboard.tsx`:
```typescript
const REFRESH_INTERVAL = 5000; // milliseconds
```

### Add Politics Markets
Edit `market-aggregation-service/market_mappings.py`:
```python
MANUAL_MAPPINGS = {
    'politics': [
        {
            'polymarket_id': 'your-poly-id',
            'kalshi_id': 'YOUR-KALSHI-TICKER',
            'description': 'Your Market Title'
        }
    ]
}
```

### Change API Keys
Edit `market-aggregation-service/api_server.py`:
```python
odds_api_key = "your-odds-api-key"
```

Or set environment variables in `.env` file.

---

## 🐛 Troubleshooting

**Backend won't start?**
- Check Python dependencies: `pip install -r requirements.txt`
- Verify port 8000 is available

**Frontend won't start?**
- Check Node dependencies: `npm install`
- Verify port 3000 is available

**No data showing?**
- Ensure backend is running first
- Check browser console for errors
- Verify API endpoints work: http://localhost:8000/

**Data not refreshing?**
- Check browser console for fetch errors
- Verify backend is responding
- Check network tab in dev tools

---

## 📊 API Endpoints

| Endpoint | Description | Response |
|----------|-------------|----------|
| `GET /` | API info | Overview |
| `GET /nfl/crypto` | NFL Polymarket + Kalshi | Comparisons array |
| `GET /nfl/traditional` | NFL traditional odds | Games array |
| `GET /politics` | Politics comparisons | Comparisons array |

---

## 🎓 Next Steps

1. ✅ Get the dashboard running
2. ✅ Explore the three tabs
3. ✅ Watch for arbitrage opportunities (yellow badges)
4. ✅ Add your own politics market mappings
5. ✅ Customize the refresh interval
6. ✅ Check out the full docs in DASHBOARD_README.md

---

## 💡 Pro Tips

- Look for **yellow badges** = arbitrage opportunities
- **Green borders** = best odds for that outcome
- Higher **volume** = more liquid markets
- Larger **price spread** = bigger opportunity
- Check **traditional sportsbooks** for different odds format

---

## 📞 Support

For issues or questions:
1. Check DASHBOARD_README.md for detailed docs
2. Check DASHBOARD_GUIDE.md for visual examples
3. Test API with: `python test_api.py`
4. Check browser console for errors

Enjoy tracking markets! 🎉

