"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ComparisonGroup from "./ComparisonGroup";
import TraditionalOddsCard from "./TraditionalOddsCard";
import { 
  CryptoMarketsResponse, 
  TraditionalOddsResponse, 
  PoliticsResponse 
} from "@/lib/market-types";
import { RefreshCw, AlertCircle } from "lucide-react";

const API_BASE_URL = "http://localhost:8000";
const REFRESH_INTERVAL = 5000; // 5 seconds (used as fallback)

export default function MarketAggregatorDashboard() {
  const [nflCrypto, setNflCrypto] = useState<CryptoMarketsResponse | null>(null);
  const [nflTraditional, setNflTraditional] = useState<TraditionalOddsResponse | null>(null);
  const [politics, setPolitics] = useState<PoliticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("nfl");
  const [nflSubTab, setNflSubTab] = useState<"crypto" | "traditional">("crypto");

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

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    await Promise.all([
      fetchNFLCrypto(),
      fetchNFLTraditional(),
      fetchPolitics()
    ]);
    
    setLastUpdate(new Date());
    setLoading(false);
  };

  // WebSocket helpers with backoff
  useEffect(() => {
    let wsCrypto: WebSocket | null = null;
    let wsTraditional: WebSocket | null = null;
    let wsPolitics: WebSocket | null = null;
    let backoffCrypto = 1000;
    let backoffTraditional = 1000;
    let backoffPolitics = 1000;
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

    // Fallback: initial fetch if sockets delayed
    fetchAllData();

    return () => {
      isUnmounting = true;
      if (wsCrypto && wsCrypto.readyState === WebSocket.OPEN) wsCrypto.close(1000);
      if (wsTraditional && wsTraditional.readyState === WebSocket.OPEN) wsTraditional.close(1000);
      if (wsPolitics && wsPolitics.readyState === WebSocket.OPEN) wsPolitics.close(1000);
    };
  }, []);

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
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="nfl">NFL</TabsTrigger>
          <TabsTrigger value="politics">Politics</TabsTrigger>
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
      </Tabs>
    </div>
  );
}

