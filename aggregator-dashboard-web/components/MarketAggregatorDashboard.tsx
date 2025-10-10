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
  RundownResponse,
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
  const [rundown, setRundown] = useState<RundownResponse | null>(null);
  const [rundownDate, setRundownDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [rundownSportId, setRundownSportId] = useState<number>(2); // 2=NFL default
  const [rundownLoading, setRundownLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("nfl");
  const [nflSubTab, setNflSubTab] = useState<"crypto" | "traditional">("crypto");
  const [othersOffset, setOthersOffset] = useState(0);
  const OTHERS_LIMIT = 10;

  // Helpers: American odds utils for highlighting best price (lowest implied probability)
  const americanToImpliedProb = (odds: number | null | undefined) => {
    if (odds === null || odds === undefined || Number.isNaN(odds)) return Infinity;
    const o = Number(odds);
    if (o === 0) return Infinity;
    if (o > 0) return 100 / (o + 100);
    return (-o) / ((-o) + 100);
  };

  const getBestMoneyline = (values: Array<{ affiliate_name: string; value: number | null | undefined }>) => {
    let best = { affiliate_name: "", value: null as number | null };
    let bestProb = Infinity;
    for (const v of values) {
      if (v.value === null || v.value === undefined) continue;
      const p = americanToImpliedProb(v.value);
      if (p < bestProb) {
        bestProb = p;
        best = { affiliate_name: v.affiliate_name, value: v.value };
      }
    }
    return best;
  };

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

  // Fetch Rundown data
  const fetchRundown = async (dateOverride?: string, sportOverride?: number) => {
    try {
      const dateToUse = dateOverride ?? rundownDate;
      const sportToUse = sportOverride ?? rundownSportId;
      setRundownLoading(true);
      const params = new URLSearchParams({ date: dateToUse, sport_id: String(sportToUse) });
      const response = await fetch(`${API_BASE_URL}/rundown?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch rundown data");
      const data = await response.json();
      setRundown(data);
    } catch (err) {
      console.error("Error fetching rundown data:", err);
      setError("Failed to fetch rundown data");
    }
    setRundownLoading(false);
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
        } else if (activeTab === "rundown") {
          await fetchRundown();
        }
        setLastUpdate(new Date());
        setLoading(false);
      } catch (_) {}
    };
    // initial
    tick();
    interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, [activeTab, nflSubTab, othersOffset, rundownDate, rundownSportId]);

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

              {/* Date selector + Events */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Select date</span>
                  <input
                    type="date"
                    value={rundownDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRundownDate(v);
                      fetchRundown(v, undefined);
                    }}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sport</span>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {[{ id: 2, name: 'NFL' }, { id: 3, name: 'MLB' }, { id: 4, name: 'NBA' }, { id: 6, name: 'NHL' }].map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setRundownSportId(s.id);
                          fetchRundown(undefined, s.id);
                        }}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${rundownSportId === s.id ? 'bg-white shadow text-gray-900' : 'text-gray-700 hover:text-gray-900'}`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Events */}
              {rundownLoading ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">Loading…</CardContent>
                </Card>
              ) : rundown.events && rundown.events.length > 0 ? (
                <div className="space-y-6">
                  {rundown.events
                    .filter((e) => (e.event_date || "").slice(0, 10) === rundownDate)
                    .map((event) => {
                    const uniqAffiliates = Array.from(new Set(event.lines.map(l => l.affiliate_name)));
                    const bestAway = getBestMoneyline(event.lines.map(l => ({ affiliate_name: l.affiliate_name, value: l.moneyline_away })));
                    const bestHome = getBestMoneyline(event.lines.map(l => ({ affiliate_name: l.affiliate_name, value: l.moneyline_home })));
                    // Stable alphabetical order for bookmakers
                    const sortedLines = [...event.lines].sort((a, b) => a.affiliate_name.localeCompare(b.affiliate_name));

                    return (
                      <Card key={event.event_id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>{event.away_team} @ {event.home_team}</CardTitle>
                              <div className="text-sm text-gray-500">{new Date(event.event_date).toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">Best Away: {bestAway.value !== null ? (bestAway.value! > 0 ? `+${bestAway.value}` : bestAway.value) : "--"} {bestAway.affiliate_name && `(${bestAway.affiliate_name})`}</span>
                              <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-medium">Best Home: {bestHome.value !== null ? (bestHome.value! > 0 ? `+${bestHome.value}` : bestHome.value) : "--"} {bestHome.affiliate_name && `(${bestHome.affiliate_name})`}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-gray-600">
                                  <th className="text-left py-2 pr-4 w-40">Bookmaker</th>
                                  <th className="text-center py-2 pr-4">{event.away_team}</th>
                                  <th className="text-center py-2 pr-4">{event.home_team}</th>
                                  {/* dynamic spacer to mimic richer grids */}
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {sortedLines.map((line) => {
                                  const away = line.moneyline_away;
                                  const home = line.moneyline_home;
                                  const highlightAway = bestAway.value !== null && away === bestAway.value;
                                  const highlightHome = bestHome.value !== null && home === bestHome.value;
                                  return (
                                    <tr key={line.affiliate_name} className="align-middle">
                                      <td className="py-2 pr-4 text-gray-800 font-medium whitespace-nowrap">{line.affiliate_name}</td>
                                      <td className={`py-2 pr-4 text-center ${highlightAway ? "bg-yellow-50 text-yellow-800 font-semibold rounded" : ""}`}>
                                        {away === null || away === undefined ? "--" : away > 0 ? `+${away}` : away}
                                      </td>
                                      <td className={`py-2 pr-4 text-center ${highlightHome ? "bg-yellow-50 text-yellow-800 font-semibold rounded" : ""}`}>
                                        {home === null || home === undefined ? "--" : home > 0 ? `+${home}` : home}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {rundown.events.filter((e) => (e.event_date || "").slice(0,10) === rundownDate).length === 0 && (
                    <Card>
                      <CardContent className="py-8 text-center text-gray-500">
                        No events found for {rundownDate}.
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    {rundownLoading ? 'Loading…' : 'No games at the moment'}
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

