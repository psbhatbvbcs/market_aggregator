# Market Aggregator Dashboard - Visual Guide

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Market Aggregator Dashboard                                    │
│  Last updated: 10:30:45 AM  •  Auto-refresh: 5s                │
├─────────────────────────────────────────────────────────────────┤
│  [  NFL  ] [  Politics  ] [  Others  ]  ← Main Tabs            │
└─────────────────────────────────────────────────────────────────┘
```

## NFL Tab Layout

### Crypto Markets View (Kalshi + Polymarket)

```
┌─────────────────────────────────────────────────────────────────┐
│  [ Kalshi + Polymarket ]  [ Traditional Sportsbooks ]          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─ Summary ───────────────────────────────────────────────┐   │
│  │ Comparisons: 12  Polymarket: 24  Kalshi: 30  Arbitrage: 2│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Game: Bills vs. Patriots ─────────────────────────────┐    │
│  │ Price Spread: 3.2% 🟡 Arbitrage Opportunity             │    │
│  │                                                          │    │
│  │  ┌─ Polymarket ────────┐  ┌─ Kalshi ──────────┐        │    │
│  │  │ [Best Odds]          │  │                    │        │    │
│  │  │                      │  │                    │        │    │
│  │  │ Bills:  65.2% (+187) │  │ Bills:  62.0% (+163)       │    │
│  │  │ Patriots: 34.8% (-140)│  │ Patriots: 38.0% (-152)     │    │
│  │  │                      │  │                    │        │    │
│  │  │ Vol: $125K           │  │ Vol: $89K          │        │    │
│  │  │ Liq: $45K            │  │ Liq: $32K          │        │    │
│  │  └──────────────────────┘  └────────────────────┘        │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Traditional Sportsbooks View

```
┌─────────────────────────────────────────────────────────────────┐
│  [ Kalshi + Polymarket ]  [ Traditional Sportsbooks ]          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─ Summary ───────────────────────────────────────────────┐   │
│  │ Games: 16                    Bookmakers: 8              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Bills @ Patriots ──────────────────────────────────────┐   │
│  │ 📅 Oct 8, 2025 1:00 PM                                  │   │
│  │                                                          │   │
│  │ Best Odds:                                               │   │
│  │  ┌─ Bills ─────────┐  ┌─ Patriots ────────┐            │   │
│  │  │ +185             │  │ -145               │            │   │
│  │  │ FanDuel          │  │ DraftKings         │            │   │
│  │  └──────────────────┘  └────────────────────┘            │   │
│  │                                                          │   │
│  │ All Bookmakers:                                          │   │
│  │  FanDuel       +185  |  -145                            │   │
│  │  DraftKings    +180  |  -150                            │   │
│  │  BetMGM        +175  |  -140                            │   │
│  │  ...                                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Politics Tab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [  NFL  ] [  Politics  ] [  Others  ]                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─ Summary ───────────────────────────────────────────────┐   │
│  │ Comparisons: 5                  Arbitrage: 1            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Will Xi visit the USA in 2025? ──────────────────────┐     │
│  │ Price Spread: 2.5%                                      │     │
│  │                                                          │     │
│  │  ┌─ Polymarket ────────┐  ┌─ Kalshi ──────────┐        │     │
│  │  │ [Best Odds]          │  │                    │        │     │
│  │  │                      │  │                    │        │     │
│  │  │ Yes:  42.5% (+135)   │  │ Yes:  40.0% (+150) │        │     │
│  │  │ No:   57.5% (-175)   │  │ No:   60.0% (-150) │        │     │
│  │  │                      │  │                    │        │     │
│  │  │ Vol: $2.5M           │  │ Vol: $890K         │        │     │
│  │  │ Liq: $125K           │  │ Liq: $45K          │        │     │
│  │  └──────────────────────┘  └────────────────────┘        │     │
│  └──────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Color Coding

- **🟢 Green Border**: Best odds platform (highest probability)
- **🔴 Red Border**: Lower odds platform
- **🟡 Yellow Badge**: Arbitrage opportunity detected
- **🟣 Purple Badge**: Polymarket platform
- **🔵 Blue Badge**: Kalshi platform

## Data Fields Explained

### Market Cards
- **Name**: Outcome name (team name, Yes/No, etc.)
- **Price**: Probability as percentage (e.g., 65.2%)
- **American Odds**: Traditional odds format (e.g., +187, -140)
- **Volume**: Total trading volume in thousands (e.g., $125K)
- **Liquidity**: Available liquidity in thousands (e.g., $45K)
- **Market ID**: Unique identifier for the market

### Traditional Sportsbooks
- **Best Odds**: Highest odds for each team across all bookmakers
- **Platform**: Which bookmaker offers the best odds
- **All Bookmakers**: Complete list of odds from all sources

## Auto-Refresh Indicator

The dashboard automatically refreshes data every 5 seconds:
- 🔄 Spinning icon = Currently fetching new data
- ⏱️ Timestamp = Last successful update time

## Navigation

1. **Main Tabs**: Switch between NFL, Politics, and Others
2. **NFL Sub-tabs**: Toggle between Crypto Markets and Traditional Sportsbooks
3. **Scroll**: Scroll down to see all available comparisons
4. **Responsive**: Works on desktop, tablet, and mobile

## Tips for Best Use

1. **Arbitrage Hunting**: Look for yellow "Arbitrage Opportunity" badges
2. **Best Odds**: Green borders indicate the best platform for each market
3. **Volume Check**: Higher volume = more liquid market
4. **Price Spread**: Larger spread = bigger price difference between platforms
5. **Auto-Refresh**: No need to manually refresh - data updates automatically

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| No data showing | Check backend is running on port 8000 |
| "Failed to fetch" error | Ensure API server started successfully |
| Stale data | Check browser console for errors |
| Markets not matching | Markets may be from different time periods |

## API Integration

The dashboard fetches data from these endpoints:
- `GET /nfl/crypto` - Every 5s for NFL crypto markets
- `GET /nfl/traditional` - Every 5s for traditional odds
- `GET /politics` - Every 5s for politics markets

All endpoints return JSON with timestamp for tracking updates.

