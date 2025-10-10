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
  OthersResponse,
  OthersComparison,
} from "@/lib/market-types";
import { RefreshCw, AlertCircle } from "lucide-react";

const API_BASE_URL = "http://localhost:8000";
const REFRESH_INTERVAL = 5000; // 5 seconds (used as fallback)

export default function MarketAggregatorDashboard() {
  const [nflCrypto, setNflCrypto] = useState<CryptoMarketsResponse | null>(null);
  const [nflTraditional, setNflTraditional] = useState<TraditionalOddsResponse | null>(null);
  const [politics, setPolitics] = useState<PoliticsResponse | null>(null);
  const [crypto, setCrypto] = useState<CryptoResponse | null>(null);
  const [others, setOthers] = useState<OthersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("nfl");
  const [nflSubTab, setNflSubTab] = useState<"crypto" | "traditional">("crypto");
  const [othersOffset, setOthersOffset] = useState(0);
  const OTHERS_LIMIT = 10;

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

  // Fetch Others (from our API server which proxies and normalizes)
  const fetchOthers = async () => {
    try {
      const params = new URLSearchParams({ limit: String(OTHERS_LIMIT), offset: String(othersOffset) });
      const response = await fetch(`${API_BASE_URL}/others?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch others markets");
      const data: any = await response.json();
      if (data && data.error) {
        setError(String(data.error));
        return;
      }
      setOthers(data as OthersResponse);
    } catch (err) {
      console.error("Error fetching others markets:", err);
      setError("Failed to fetch others markets");
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
      fetchCrypto(),
      fetchOthers()
    ]);
    
    setLastUpdate(new Date());
    setLoading(false);
  };

  // Polling: fetch active tab every 10s
  useEffect(() => {
    let interval: any;
    const tick = async () => {
      try {
        if (activeTab === "nfl") {
          if (nflSubTab === "crypto") await fetchNFLCrypto();
          else await fetchNFLTraditional();
        } else if (activeTab === "politics") {
          await fetchPolitics();
        } else if (activeTab === "crypto") {
          await fetchCrypto();
        } else if (activeTab === "others") {
          await fetchOthers();
        }
        setLastUpdate(new Date());
        setLoading(false);
      } catch (_) {}
    };
    // initial
    tick();
    interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, [activeTab, nflSubTab, othersOffset]);

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
          <span>Auto-refresh: 10s</span>
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
        <TabsList className="grid w-full grid-cols-5 max-w-md">
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
          {others && others.summary && (
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
                      <div className="text-2xl font-bold">{others.summary?.total_comparisons ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Arbitrage</div>
                      <div className="text-2xl font-bold text-yellow-600">{others.summary?.arbitrage_opportunities ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Limit</div>
                      <div className="text-xl">{others.limit ?? OTHERS_LIMIT}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Offset</div>
                      <div className="text-xl">{others.offset ?? othersOffset}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparisons */}
              {others.comparisons && others.comparisons.length > 0 ? (
                <div className="space-y-6">
                  {others.comparisons.map((comp, idx) => (
                    <ComparisonGroup key={idx} comparison={comp as any} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No other comparisons available at the moment
                  </CardContent>
                </Card>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => {
                    const next = Math.max(0, othersOffset - OTHERS_LIMIT)
                    setOthersOffset(next);
                    fetchOthers();
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${othersOffset === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  disabled={othersOffset === 0}
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    const next = othersOffset + OTHERS_LIMIT
                    setOthersOffset(next);
                    fetchOthers();
                  }}
                  className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Next
                </button>
              </div>
            </>
          )}
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

