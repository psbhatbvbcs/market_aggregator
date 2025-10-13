"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ComparisonGroup from "./ComparisonGroup";
import CryptoComparisonGroup from "./CryptoComparisonGroup";
import TraditionalOddsCard from "./TraditionalOddsCard";
import { 
  CryptoMarketsResponse, 
  TraditionalOddsResponse, 
  PoliticsResponse,
  CryptoResponse,
  RundownResponse,
  DomeResponse
} from "@/lib/market-types";
import { RefreshCw, AlertCircle } from "lucide-react";

const API_BASE_URL = "http://localhost:8000";
const REFRESH_INTERVAL = 5000; // 5 seconds (used as fallback)

export default function MarketAggregatorDashboard() {
  const [nflCrypto, setNflCrypto] = useState<CryptoMarketsResponse | null>(null);
  const [nflTraditional, setNflTraditional] = useState<TraditionalOddsResponse | null>(null);
  const [politics, setPolitics] = useState<PoliticsResponse | null>(null);
  const [crypto, setCrypto] = useState<CryptoResponse | null>(null);
  const [rundown, setRundown] = useState<RundownResponse | null>(null);
  const [dome, setDome] = useState<DomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [domeLoading, setDomeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("dome");
  const [nflSubTab, setNflSubTab] = useState<"crypto" | "traditional">("crypto");
  const [rundownDate, setRundownDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [domeSearch, setDomeSearch] = useState({
    sport: "nfl",
    date: "",
    polymarket_market_slug: "",
    kalshi_event_ticker: "",
    searchType: "sport_date",
  });

  // Fetch NFL Crypto Markets
  const fetchNFLCrypto = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/nfl/crypto`);
      if (!response.ok) throw new Error("Failed to fetch NFL crypto markets");
      const data = await response.json();
      setNflCrypto(data);
    } catch (err) {
      console.error("Error fetching NFL crypto markets:", err);
      setError("Failed to fetch NFL crypto markets");
    }
  };

  // Fetch NFL Traditional Odds
  const fetchNFLTraditional = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/nfl/traditional`);
      if (!response.ok) throw new Error("Failed to fetch NFL traditional odds");
      const data = await response.json();
      setNflTraditional(data);
    } catch (err) {
      console.error("Error fetching NFL traditional odds:", err);
      setError("Failed to fetch NFL traditional odds");
    }
  };

  // Fetch Politics Markets
  const fetchPolitics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/politics`);
      if (!response.ok) throw new Error("Failed to fetch politics markets");
      const data = await response.json();
      setPolitics(data);
    } catch (err) {
      console.error("Error fetching politics markets:", err);
      setError("Failed to fetch politics markets");
    }
  };

  // Fetch Crypto Markets
  const fetchCrypto = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/crypto`);
      if (!response.ok) throw new Error("Failed to fetch crypto markets");
      const data = await response.json();
      setCrypto(data);
    } catch (err) {
      console.error("Error fetching crypto markets:", err);
      setError("Failed to fetch crypto markets");
    }
  };

  // Fetch Rundown Markets
  const fetchRundown = async (date?: string) => {
    try {
      const dateParam = date || rundownDate;
      const response = await fetch(`${API_BASE_URL}/rundown?date_str=${dateParam}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to fetch rundown markets");
      }
      const data = await response.json();
      setRundown(data);
    } catch (err: any) {
      console.error("Error fetching rundown markets:", err);
      setError(err.message || "Failed to fetch rundown markets");
    }
  };

  // Fetch Dome Markets
  const fetchDome = async () => {
    if (domeLoading) return;
    setDomeLoading(true);
    setError(null);
    setDome(null);

    let queryString = "";
    if (domeSearch.searchType === "sport_date") {
      if (domeSearch.sport && domeSearch.date) {
        queryString = `sport=${domeSearch.sport}&date=${domeSearch.date}`;
      } else {
        setError("Sport and date are required for this search type.");
        setDomeLoading(false);
        return;
      }
    } else {
      const slugs = domeSearch.polymarket_market_slug.trim();
      const tickers = domeSearch.kalshi_event_ticker.trim();
      if (slugs) {
        queryString += `polymarket_market_slug=${encodeURIComponent(slugs)}`;
      }
      if (tickers) {
        if (queryString) queryString += "&";
        queryString += `kalshi_event_ticker=${encodeURIComponent(tickers)}`;
      }
      if (!queryString) {
        setError("At least one slug or ticker is required.");
        setDomeLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/dome?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch dome markets");
      const data = await response.json();
      setDome(data);
    } catch (err) {
      console.error("Error fetching dome markets:", err);
      setError("Failed to fetch dome markets");
    } finally {
      setDomeLoading(false);
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    await Promise.all([
      fetchNFLCrypto(),
      fetchNFLTraditional(),
      fetchPolitics(),
      fetchCrypto()
    ]);
    
    setLastUpdate(new Date());
    setLoading(false);
  };

  // WebSocket helpers with backoff
  useEffect(() => {
    let wsCrypto: WebSocket | null = null;
    let wsTraditional: WebSocket | null = null;
    let wsPolitics: WebSocket | null = null;
    let wsRundown: WebSocket | null = null; 
    let backoffCrypto = 1000;
    let backoffTraditional = 1000;
    let backoffPolitics = 1000;
    let backoffRundown = 1000;
    const maxBackoff = 15000;
    let isUnmounting = false;

    const connect = (
      path: string,
      onMessage: (data: any) => void,
      onAssign: (ws: WebSocket) => void,
      onBackoffUpdate: (ms: number) => void,
      initialBackoff: number
    ) => {
      const ws = new WebSocket(path);
      onAssign(ws);
      ws.onopen = () => {
        onBackoffUpdate(1000);
      };
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          onMessage(data);
          setLastUpdate(new Date());
          setLoading(false);
        } catch (e) {
          // ignore parsing errors
        }
      };
      ws.onclose = () => {
        if (isUnmounting) return; // don't reconnect during unmount (React StrictMode double-invoke)
        const next = Math.min(initialBackoff * 2, maxBackoff);
        onBackoffUpdate(next);
        setTimeout(() => connect(path, onMessage, onAssign, onBackoffUpdate, next), next);
      };
      ws.onerror = () => {
        ws.close();
      };
    };

    // Connect sockets
    const wsHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    connect(
      `ws://${wsHost}:8000/ws/nfl/crypto`,
      (data) => setNflCrypto(data),
      (ws) => { wsCrypto = ws; },
      (ms) => { backoffCrypto = ms; },
      backoffCrypto
    );
    connect(
      `ws://${wsHost}:8000/ws/nfl/traditional`,
      (data) => setNflTraditional(data),
      (ws) => { wsTraditional = ws; },
      (ms) => { backoffTraditional = ms; },
      backoffTraditional
    );
    connect(
      `ws://${wsHost}:8000/ws/politics`,
      (data) => setPolitics(data),
      (ws) => { wsPolitics = ws; },
      (ms) => { backoffPolitics = ms; },
      backoffPolitics
    );
    connect(
      `ws://${wsHost}:8000/ws/crypto`,
      (data) => setCrypto(data),
      (ws) => { wsCrypto = ws; },
      (ms) => { backoffCrypto = ms; },
      backoffCrypto
    );
    connect(
      `ws://${wsHost}:8000/ws/rundown`,
      (data) => setRundown(data),
      (ws) => { wsRundown = ws; },
      (ms) => { backoffRundown = ms; },
      backoffRundown
    );

    // Fallback: initial fetch if sockets delayed
    fetchAllData();

    return () => {
      isUnmounting = true;
      if (wsCrypto && wsCrypto.readyState === WebSocket.OPEN) wsCrypto.close(1000);
      if (wsTraditional && wsTraditional.readyState === WebSocket.OPEN) wsTraditional.close(1000);
      if (wsPolitics && wsPolitics.readyState === WebSocket.OPEN) wsPolitics.close(1000);
      if (wsRundown && wsRundown.readyState === WebSocket.OPEN) wsRundown.close(1000);
    };
  }, []);

  const handleDomeSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDomeSearch(prev => ({ ...prev, [name]: value }));
  };

  const handleDomeSearchTypeChange = (value: string) => {
    setDomeSearch(prev => ({ ...prev, searchType: value }));
  };

  const handleDomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDome();
  };

  const handleRundownSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rundownDate) {
      fetchRundown(rundownDate);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Market Aggregator Dashboard</h1>
          <button className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors">
            Connect Wallet
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        {(nflCrypto || politics || crypto || dome) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">Comparisons</div>
              <div className="text-4xl font-bold">
                {(nflCrypto?.summary.total_comparisons || 0) + 
                 (politics?.summary.total_comparisons || 0) + 
                 (crypto?.summary.total_comparisons || 0) +
                 (dome?.summary.total_comparisons || 0)}
              </div>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">Polymarket</div>
              <div className="text-4xl font-bold">
                {(nflCrypto?.summary.polymarket_markets || 0)}
              </div>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">Kalshi</div>
              <div className="text-4xl font-bold">
                {(nflCrypto?.summary.kalshi_markets || 0)}
              </div>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">Arbitrage</div>
              <div className="text-4xl font-bold">
                {(nflCrypto?.summary.arbitrage_opportunities || 0) + 
                 (politics?.summary.arbitrage_opportunities || 0) + 
                 (crypto?.summary.arbitrage_opportunities || 0) +
                 (dome?.summary.arbitrage_opportunities || 0)}
              </div>
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-transparent border-0 h-auto p-0 gap-6">
              <TabsTrigger 
                value="dome" 
                className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none bg-transparent text-gray-400 border-0 px-0 pb-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-white hover:text-gray-200"
              >
                Dome
              </TabsTrigger>
              <TabsTrigger 
                value="nfl"
                className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none bg-transparent text-gray-400 border-0 px-0 pb-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-white hover:text-gray-200"
              >
                NFL
              </TabsTrigger>
              <TabsTrigger 
                value="crypto"
                className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none bg-transparent text-gray-400 border-0 px-0 pb-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-white hover:text-gray-200"
              >
                Crypto
              </TabsTrigger>
              <TabsTrigger 
                value="politics"
                className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none bg-transparent text-gray-400 border-0 px-0 pb-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-white hover:text-gray-200"
              >
                Politics
              </TabsTrigger>
              <TabsTrigger 
                value="rundown"
                className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none bg-transparent text-gray-400 border-0 px-0 pb-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-white hover:text-gray-200"
              >
                Rundown
              </TabsTrigger>
              <TabsTrigger 
                value="others"
                className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none bg-transparent text-gray-400 border-0 px-0 pb-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-white hover:text-gray-200"
              >
                Others
              </TabsTrigger>
            </TabsList>

            {/* Market Selector */}
            <select className="bg-[#1a1a1a] text-white border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-600">
              <option>Kalshi + Polymarket</option>
            </select>
          </div>

          {/* NFL Tab */}
          <TabsContent value="nfl" className="space-y-4">
            {/* NFL Crypto Markets */}
            {nflCrypto && (
              <>
                {/* Comparisons */}
                {nflCrypto.comparisons.length > 0 ? (
                  <div className="space-y-4">
                    {nflCrypto.comparisons.map((comp, idx) => (
                      <ComparisonGroup key={idx} comparison={comp} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No comparisons available at the moment
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Dome Tab */}
          <TabsContent value="dome" className="space-y-4">
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <h3 className="text-xl font-semibold text-white mb-4">Dome Market Search</h3>
              <form onSubmit={handleDomeSubmit}>
                <Tabs value={domeSearch.searchType} onValueChange={handleDomeSearchTypeChange} className="mb-4">
                  <TabsList className="bg-[#0a0a0a] border border-gray-700">
                    <TabsTrigger value="sport_date" className="data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white">By Sport & Date</TabsTrigger>
                    <TabsTrigger value="slug_ticker" className="data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white">By Slug/Ticker</TabsTrigger>
                  </TabsList>
                </Tabs>

                {domeSearch.searchType === 'sport_date' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sport" className="block text-sm font-medium text-gray-300 mb-2">Sport</label>
                      <select 
                        id="sport" 
                        name="sport" 
                        value={domeSearch.sport} 
                        onChange={handleDomeSearchChange} 
                        className="w-full p-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:border-gray-600"
                      >
                        <option value="nfl">NFL</option>
                        <option value="mlb">MLB</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                      <input 
                        type="date" 
                        id="date" 
                        name="date" 
                        value={domeSearch.date} 
                        onChange={handleDomeSearchChange} 
                        className="w-full p-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:border-gray-600" 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="polymarket_market_slug" className="block text-sm font-medium text-gray-300 mb-2">Polymarket Slugs (comma-separated)</label>
                      <input 
                        type="text" 
                        id="polymarket_market_slug" 
                        name="polymarket_market_slug" 
                        value={domeSearch.polymarket_market_slug} 
                        onChange={handleDomeSearchChange} 
                        className="w-full p-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:border-gray-600" 
                      />
                    </div>
                    <div>
                      <label htmlFor="kalshi_event_ticker" className="block text-sm font-medium text-gray-300 mb-2">Kalshi Tickers (comma-separated)</label>
                      <input 
                        type="text" 
                        id="kalshi_event_ticker" 
                        name="kalshi_event_ticker" 
                        value={domeSearch.kalshi_event_ticker} 
                        onChange={handleDomeSearchChange} 
                        className="w-full p-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:border-gray-600" 
                      />
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <button 
                    type="submit" 
                    disabled={domeLoading} 
                    className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 disabled:bg-gray-600 disabled:text-gray-400 transition-colors"
                  >
                    {domeLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>
            </div>

            {dome && (
              <>
                {dome.comparisons.length > 0 ? (
                  <div className="space-y-4">
                    {dome.comparisons.map((comp, idx) => (
                      <CryptoComparisonGroup key={idx} comparison={comp as any} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No matching markets found for the given criteria.
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Politics Tab */}
          <TabsContent value="politics" className="space-y-4">
            {politics && (
              <>
                {/* Comparisons */}
                {politics.comparisons.length > 0 ? (
                  <div className="space-y-4">
                    {politics.comparisons.map((comp, idx) => (
                      <ComparisonGroup key={idx} comparison={comp} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No politics comparisons available at the moment
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Others Tab */}
          <TabsContent value="others" className="space-y-4">
            <div className="text-center text-gray-500 py-8">
              Additional market categories will be available here soon.
            </div>
          </TabsContent>

          {/* Crypto Tab */}
          <TabsContent value="crypto" className="space-y-4">
            {crypto && (
              <>
                {/* Comparisons */}
                {crypto.comparisons.length > 0 ? (
                  <div className="space-y-4">
                    {crypto.comparisons.map((comp, idx) => (
                      <CryptoComparisonGroup key={idx} comparison={comp} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No crypto comparisons available at the moment
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Rundown Tab */}
          <TabsContent value="rundown" className="space-y-4">
            {/* Date Picker */}
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <h3 className="text-xl font-semibold text-white mb-4">Select Date for Sports Odds</h3>
              <form onSubmit={handleRundownSubmit}>
                <div className="flex items-center gap-4">
                  <label htmlFor="rundown-date" className="text-sm font-medium text-gray-300">
                    Game Date:
                  </label>
                  <input
                    type="date"
                    id="rundown-date"
                    value={rundownDate}
                    onChange={(e) => setRundownDate(e.target.value)}
                    className="p-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:border-gray-600"
                    required
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>

            {rundown && (
              <>
                {/* Events */}
                {rundown.events && rundown.events.length > 0 ? (
                  <div className="space-y-4">
                    {rundown.events.map((event) => (
                      <div key={event.event_id} className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                        <h3 className="text-lg font-semibold mb-2">{event.away_team} @ {event.home_team}</h3>
                        <div className="text-sm text-gray-400 mb-4">{new Date(event.event_date).toLocaleString()}</div>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 font-bold text-sm">
                            <span>Bookmaker</span>
                            <span className="text-right">{event.away_team}</span>
                            <span className="text-right">{event.home_team}</span>
                          </div>
                          {event.lines.map((line) => (
                            <div key={line.affiliate_name} className="grid grid-cols-3 text-sm border-t border-gray-800 pt-2">
                              <span>{line.affiliate_name}</span>
                              <span className="text-right">{line.moneyline_away > 0 ? `+${line.moneyline_away}` : line.moneyline_away}</span>
                              <span className="text-right">{line.moneyline_home > 0 ? `+${line.moneyline_home}` : line.moneyline_home}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No rundown data available at the moment. Please ensure your RAPIDAPI_KEY is set correctly.
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-6">
            <span>Live</span>
            <span>Privacy Policy</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Aggregating
            </span>
            <span>Terms of Service</span>
          </div>
          <div className="flex items-center gap-4">
            <span>$45.34</span>
            <span>0.004 POL</span>
            <span>USD</span>
            <span className="px-2 py-1 bg-gray-800 rounded">POL</span>
          </div>
        </div>
      </div>
    </div>
  );
}

