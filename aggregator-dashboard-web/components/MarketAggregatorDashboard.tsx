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
  DomeResponse,
  OthersResponse,
  OthersComparison,
  CombinedNFLResponse
} from "@/lib/market-types";
import { RefreshCw, AlertCircle } from "lucide-react";

const API_BASE_URL = "http://localhost:8000";
const REFRESH_INTERVAL = 5000; // 5 seconds (used as fallback)

export default function MarketAggregatorDashboard() {
  const [nflCrypto, setNflCrypto] = useState<CryptoMarketsResponse | null>(null);
  const [nflTraditional, setNflTraditional] = useState<TraditionalOddsResponse | null>(null);
  const [nflCombined, setNflCombined] = useState<CombinedNFLResponse | null>(null);
  const [politics, setPolitics] = useState<PoliticsResponse | null>(null);
  const [crypto, setCrypto] = useState<CryptoResponse | null>(null);
  const [others, setOthers] = useState<OthersResponse | null>(null);
  const [rundown, setRundown] = useState<RundownResponse | null>(null);
  const [dome, setDome] = useState<DomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [domeLoading, setDomeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("nfl");
  const [nflSubTab, setNflSubTab] = useState<"crypto" | "traditional" | "combined">("combined");
  const [othersOffset, setOthersOffset] = useState(0);
  const OTHERS_LIMIT = 10;
  const [rundownDate, setRundownDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nflCombinedDate, setNflCombinedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [domeSport, setDomeSport] = useState("nfl");
  const [domeDate, setDomeDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  // Fetch NFL Combined (Dome + Rundown)
  const fetchNFLCombined = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/nfl/combined?date=${nflCombinedDate}`);
      if (!response.ok) throw new Error("Failed to fetch NFL combined markets");
      const data = await response.json();
      setNflCombined(data);
    } catch (err) {
      console.error("Error fetching NFL combined markets:", err);
      setError("Failed to fetch NFL combined markets");
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

  // Fetch Others Markets
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

    if (!domeSport || !domeDate) {
      setError("Sport and date are required.");
      setDomeLoading(false);
      return;
    }

    try {
      const queryString = `sport=${domeSport}&date=${domeDate}`;
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

  // Fetch data based on active tab
  const fetchCurrentTabData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === "nfl") {
        if (nflSubTab === "crypto") {
          await fetchNFLCrypto();
        } else if (nflSubTab === "traditional") {
          await fetchNFLTraditional();
        } else if (nflSubTab === "combined") {
          await fetchNFLCombined();
        }
      } else if (activeTab === "politics") {
        await fetchPolitics();
      } else if (activeTab === "crypto") {
        await fetchCrypto();
      } else if (activeTab === "others") {
        await fetchOthers();
      } else if (activeTab === "dome") {
        // Dome is fetched on-demand via form submission
      } else if (activeTab === "rundown") {
        // Rundown is fetched on-demand via form submission
      }
    } catch (err) {
      console.error("Error fetching tab data:", err);
    }

    setLastUpdate(new Date());
    setLoading(false);
  };

  // Initial data fetch when tab changes
  useEffect(() => {
    fetchCurrentTabData();
  }, [activeTab, nflSubTab, nflCombinedDate]);

  // Poll for current tab data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCurrentTabData();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [activeTab, nflSubTab, nflCombinedDate]);

  // Fetch Others data when offset changes
  useEffect(() => {
    if (activeTab === "others") {
      fetchOthers();
    }
  }, [othersOffset]);

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
            {/* NFL Sub-tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setNflSubTab("combined")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  nflSubTab === "combined" ? "bg-white text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                All Providers
              </button>
              <button
                onClick={() => setNflSubTab("crypto")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  nflSubTab === "crypto" ? "bg-white text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Crypto Only
              </button>
              <button
                onClick={() => setNflSubTab("traditional")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  nflSubTab === "traditional" ? "bg-white text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Traditional Only
              </button>
            </div>

            {/* Combined View */}
            {nflSubTab === "combined" && (
              <>
                <div className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-800 mb-4">
                  <div className="flex items-center gap-4">
                    <label htmlFor="nfl-combined-date" className="text-sm font-medium text-gray-300">
                      Game Date:
                    </label>
                    <input
                      type="date"
                      id="nfl-combined-date"
                      value={nflCombinedDate}
                      onChange={(e) => setNflCombinedDate(e.target.value)}
                      className="p-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:border-gray-600"
                    />
                  </div>
                </div>
                
                {nflCombined && nflCombined.games.length > 0 ? (
                  <div className="space-y-4">
                    {nflCombined.games.map((game, idx) => (
                      <div key={idx} className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                        <h3 className="text-xl font-semibold mb-4">
                          {game.teams.team1.toUpperCase()} vs {game.teams.team2.toUpperCase()}
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {/* Polymarket */}
                          {game.polymarket && (
                            <div className="border-l-4 border-blue-500 pl-4">
                              <div className="font-semibold text-blue-400 mb-2">Polymarket</div>
                              <div className="flex gap-4">
                                {game.polymarket.outcomes.map((outcome, i) => (
                                  <div key={i} className="flex-1">
                                    <div className="text-sm text-gray-400">{outcome.name}</div>
                                    <div className="text-lg font-bold">{(outcome.price * 100).toFixed(1)}%</div>
                                    <div className="text-sm text-gray-500">{outcome.american_odds}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Kalshi */}
                          {game.kalshi && (
                            <div className="border-l-4 border-green-500 pl-4">
                              <div className="font-semibold text-green-400 mb-2">Kalshi</div>
                              <div className="flex gap-4">
                                {game.kalshi.outcomes.map((outcome, i) => (
                                  <div key={i} className="flex-1">
                                    <div className="text-sm text-gray-400">{outcome.name}</div>
                                    <div className="text-lg font-bold">{(outcome.price * 100).toFixed(1)}%</div>
                                    <div className="text-sm text-gray-500">{outcome.american_odds}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Traditional Sportsbooks */}
                          {game.traditional_odds && game.traditional_odds.length > 0 && (
                            <div className="border-l-4 border-yellow-500 pl-4">
                              <div className="font-semibold text-yellow-400 mb-2">Traditional Sportsbooks</div>
                              <div className="space-y-2">
                                {game.traditional_odds.map((line, i) => (
                                  <div key={i} className="flex justify-between items-center">
                                    <div className="text-sm font-medium">{line.affiliate_name}</div>
                                    <div className="flex gap-4">
                                      <div className="text-sm">
                                        <span className="text-gray-400">Away: </span>
                                        <span className="font-bold">{line.moneyline_away > 0 ? `+${line.moneyline_away}` : line.moneyline_away}</span>
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-gray-400">Home: </span>
                                        <span className="font-bold">{line.moneyline_home > 0 ? `+${line.moneyline_home}` : line.moneyline_home}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {game.arbitrage_opportunity && (
                          <div className="mt-4 text-sm text-yellow-400 font-semibold">
                            ⚡ Arbitrage Opportunity (Spread: {game.price_spread.toFixed(2)}%)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No combined NFL markets available for this date
                  </div>
                )}
              </>
            )}

            {/* Crypto Only View */}
            {nflSubTab === "crypto" && nflCrypto && (
              <>
                {nflCrypto.comparisons.length > 0 ? (
                  <div className="space-y-4">
                    {nflCrypto.comparisons.map((comp, idx) => (
                      <ComparisonGroup key={idx} comparison={comp} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No crypto comparisons available at the moment
                  </div>
                )}
              </>
            )}

            {/* Traditional Only View */}
            {nflSubTab === "traditional" && nflTraditional && (
              <>
                {nflTraditional.games.length > 0 ? (
                  <div className="space-y-4">
                    {nflTraditional.games.map((game, idx) => (
                      <TraditionalOddsCard key={idx} game={game} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No traditional odds available at the moment
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Dome Tab */}
          <TabsContent value="dome" className="space-y-4">
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <h3 className="text-xl font-semibold text-white mb-4">Select Sport & Date for Dome Markets</h3>
              <form onSubmit={handleDomeSubmit}>
                <div className="flex items-center gap-4">
                  <label htmlFor="dome-sport" className="text-sm font-medium text-gray-300">
                    Sport:
                  </label>
                  <select
                    id="dome-sport"
                    value={domeSport}
                    onChange={(e) => setDomeSport(e.target.value)}
                    className="p-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:border-gray-600"
                    required
                  >
                    <option value="nfl">NFL</option>
                    <option value="mlb">MLB</option>
                  </select>
                  <label htmlFor="dome-date" className="text-sm font-medium text-gray-300">
                    Game Date:
                  </label>
                  <input
                    type="date"
                    id="dome-date"
                    value={domeDate}
                    onChange={(e) => setDomeDate(e.target.value)}
                    className="p-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:border-gray-600"
                    required
                  />
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

