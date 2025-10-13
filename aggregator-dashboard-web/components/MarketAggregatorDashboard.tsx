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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Market Aggregator Dashboard</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {lastUpdate && (
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            )}
          </div>
          <span className="text-gray-400">•</span>
          <span>Auto-refresh: 5s</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 max-w-lg">
          <TabsTrigger value="dome">Dome</TabsTrigger>
          <TabsTrigger value="nfl">NFL</TabsTrigger>
          <TabsTrigger value="politics">Politics</TabsTrigger>
          <TabsTrigger value="crypto">Crypto</TabsTrigger>
          <TabsTrigger value="rundown">Rundown</TabsTrigger>
          <TabsTrigger value="others">Others</TabsTrigger>
          
        </TabsList>

        {/* NFL Tab */}
        <TabsContent value="nfl" className="space-y-4">
          {/* NFL Sub-tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setNflSubTab("crypto")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                nflSubTab === "crypto"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Kalshi + Polymarket
            </button>
            <button
              onClick={() => setNflSubTab("traditional")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                nflSubTab === "traditional"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Traditional Sportsbooks
            </button>
          </div>

          {/* NFL Crypto Markets */}
          {nflSubTab === "crypto" && (
            <div>
              {nflCrypto && (
                <>
                  {/* Summary */}
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Comparisons</div>
                          <div className="text-2xl font-bold">{nflCrypto.summary.total_comparisons}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Polymarket</div>
                          <div className="text-2xl font-bold text-purple-600">{nflCrypto.summary.polymarket_markets}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Kalshi</div>
                          <div className="text-2xl font-bold text-blue-600">{nflCrypto.summary.kalshi_markets}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Arbitrage</div>
                          <div className="text-2xl font-bold text-yellow-600">{nflCrypto.summary.arbitrage_opportunities}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comparisons */}
                  {nflCrypto.comparisons.length > 0 ? (
                    <div className="space-y-6">
                      {nflCrypto.comparisons.map((comp, idx) => (
                        <ComparisonGroup key={idx} comparison={comp} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-gray-500">
                        No comparisons available at the moment
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* NFL Traditional Odds */}
          {nflSubTab === "traditional" && (
            <div>
              {nflTraditional && (
                <>
                  {/* Summary */}
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Games</div>
                          <div className="text-2xl font-bold">{nflTraditional.summary.total_games}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Bookmakers</div>
                          <div className="text-2xl font-bold">{nflTraditional.summary.bookmakers}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Games */}
                  {nflTraditional.games.length > 0 ? (
                    <div>
                      {nflTraditional.games.map((game, idx) => (
                        <TraditionalOddsCard key={idx} game={game} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-gray-500">
                        No games available at the moment
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* Dome Tab */}
        <TabsContent value="dome" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dome Market Search</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDomeSubmit}>
                <Tabs value={domeSearch.searchType} onValueChange={handleDomeSearchTypeChange} className="mb-4">
                  <TabsList>
                    <TabsTrigger value="sport_date">By Sport & Date</TabsTrigger>
                    <TabsTrigger value="slug_ticker">By Slug/Ticker</TabsTrigger>
                  </TabsList>
                </Tabs>

                {domeSearch.searchType === 'sport_date' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sport" className="block text-sm font-medium text-gray-700">Sport</label>
                      <select id="sport" name="sport" value={domeSearch.sport} onChange={handleDomeSearchChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                        <option value="nfl">NFL</option>
                        <option value="mlb">MLB</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                      <input type="date" id="date" name="date" value={domeSearch.date} onChange={handleDomeSearchChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="polymarket_market_slug" className="block text-sm font-medium text-gray-700">Polymarket Slugs (comma-separated)</label>
                      <input type="text" id="polymarket_market_slug" name="polymarket_market_slug" value={domeSearch.polymarket_market_slug} onChange={handleDomeSearchChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label htmlFor="kalshi_event_ticker" className="block text-sm font-medium text-gray-700">Kalshi Tickers (comma-separated)</label>
                      <input type="text" id="kalshi_event_ticker" name="kalshi_event_ticker" value={domeSearch.kalshi_event_ticker} onChange={handleDomeSearchChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <button type="submit" disabled={domeLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400">
                    {domeLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {dome && (
            <>
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Comparisons</div>
                      <div className="text-2xl font-bold">{dome.summary.total_comparisons}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Arbitrage</div>
                      <div className="text-2xl font-bold text-yellow-600">{dome.summary.arbitrage_opportunities}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {dome.comparisons.length > 0 ? (
                <div className="space-y-6">
                  {dome.comparisons.map((comp, idx) => (
                    <CryptoComparisonGroup key={idx} comparison={comp as any} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No matching markets found for the given criteria.
                  </CardContent>
                </Card>
              )}
            </>
          )}

        </TabsContent>

        {/* Politics Tab */}
        <TabsContent value="politics" className="space-y-4">
          {politics && (
            <>
              {/* Summary */}
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Comparisons</div>
                      <div className="text-2xl font-bold">{politics.summary.total_comparisons}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Arbitrage</div>
                      <div className="text-2xl font-bold text-yellow-600">{politics.summary.arbitrage_opportunities}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparisons */}
              {politics.comparisons.length > 0 ? (
                <div className="space-y-6">
                  {politics.comparisons.map((comp, idx) => (
                    <ComparisonGroup key={idx} comparison={comp} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No politics comparisons available at the moment
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Others Tab */}
        <TabsContent value="others" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Other Markets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Additional market categories will be available here soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Crypto Tab */}
        <TabsContent value="crypto" className="space-y-4">
          {crypto && (
            <>
              {/* Summary */}
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Comparisons</div>
                      <div className="text-2xl font-bold">{crypto.summary.total_comparisons}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Arbitrage</div>
                      <div className="text-2xl font-bold text-yellow-600">{crypto.summary.arbitrage_opportunities}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparisons */}
              {crypto.comparisons.length > 0 ? (
                <div className="space-y-6">
                  {crypto.comparisons.map((comp, idx) => (
                    <CryptoComparisonGroup key={idx} comparison={comp} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No crypto comparisons available at the moment
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Rundown Tab */}
        <TabsContent value="rundown" className="space-y-4">
          {/* Date Picker */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Select Date for Sports Odds</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRundownSubmit}>
                <div className="flex items-center gap-4">
                  <label htmlFor="rundown-date" className="text-sm font-medium text-gray-700">
                    Game Date:
                  </label>
                  <input
                    type="date"
                    id="rundown-date"
                    value={rundownDate}
                    onChange={(e) => setRundownDate(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Search
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {rundown && (
            <>
              {/* Summary */}
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Events</div>
                      <div className="text-2xl font-bold">{rundown.summary?.total_events || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Bookmakers</div>
                      <div className="text-2xl font-bold">{rundown.summary?.total_bookmakers || 0}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Events */}
              {rundown.events && rundown.events.length > 0 ? (
                <div className="space-y-6">
                  {rundown.events.map((event) => (
                    <Card key={event.event_id}>
                      <CardHeader>
                        <CardTitle>{event.away_team} @ {event.home_team}</CardTitle>
                        <div className="text-sm text-gray-500">{new Date(event.event_date).toLocaleString()}</div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 font-bold text-sm">
                            <span>Bookmaker</span>
                            <span className="text-right">{event.away_team}</span>
                            <span className="text-right">{event.home_team}</span>
                          </div>
                          {event.lines.map((line) => (
                            <div key={line.affiliate_name} className="grid grid-cols-3 text-sm border-t pt-2">
                              <span>{line.affiliate_name}</span>
                              <span className="text-right">{line.moneyline_away > 0 ? `+${line.moneyline_away}` : line.moneyline_away}</span>
                              <span className="text-right">{line.moneyline_home > 0 ? `+${line.moneyline_home}` : line.moneyline_home}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No rundown data available at the moment. Please ensure your RAPIDAPI_KEY is set correctly.
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

