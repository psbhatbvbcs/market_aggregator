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
  DomeResponse,
  OthersResponse,
  OthersComparison,
  CombinedNFLResponse,
} from "@/lib/market-types";
import { RefreshCw, AlertCircle } from "lucide-react";

const API_BASE_URL = "http://localhost:8000";
const REFRESH_INTERVAL = 5000; // 5 seconds (used as fallback)

export default function MarketAggregatorDashboard() {
  const [nflCrypto, setNflCrypto] = useState<CryptoMarketsResponse | null>(
    null
  );
  const [nflTraditional, setNflTraditional] =
    useState<TraditionalOddsResponse | null>(null);
  const [nflCombined, setNflCombined] = useState<CombinedNFLResponse | null>(
    null
  );
  const [politics, setPolitics] = useState<PoliticsResponse | null>(null);
  const [crypto, setCrypto] = useState<CryptoResponse | null>(null);
  const [others, setOthers] = useState<OthersResponse | null>(null);
  const [dome, setDome] = useState<DomeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [domeLoading, setDomeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("nfl");
  const [nflSubTab, setNflSubTab] = useState<
    "crypto" | "traditional" | "combined"
  >("combined");
  const [othersOffset, setOthersOffset] = useState(0);
  const OTHERS_LIMIT = 10;
  const [nflCombinedDate, setNflCombinedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Combined NFL view mode
  const [nflCombinedView, setNflCombinedView] = useState<"table" | "cards">(
    "table"
  );

  // Per-game market visibility (Polymarket, Kalshi, Sportsbooks)
  const [marketVisibility, setMarketVisibility] = useState<
    Record<
      number,
      {
        polymarket: boolean;
        kalshi: boolean;
        sportsbooks: boolean;
        open: boolean;
      }
    >
  >({});

  // Per-game sportsbook filters (by affiliate_name)
  const [sportsbookFilters, setSportsbookFilters] = useState<
    Record<number, Record<string, boolean>>
  >({});

  const getVisibilityFor = (idx: number) => {
    return (
      marketVisibility[idx] || {
        polymarket: true,
        kalshi: true,
        sportsbooks: true,
        open: false,
      }
    );
  };

  const toggleVisibility = (
    idx: number,
    key: "polymarket" | "kalshi" | "sportsbooks"
  ) => {
    setMarketVisibility((prev) => {
      const current = getVisibilityFor(idx);
      return { ...prev, [idx]: { ...current, [key]: !current[key] } };
    });
  };

  const toggleDropdown = (idx: number) => {
    setMarketVisibility((prev) => {
      const current = getVisibilityFor(idx);
      return { ...prev, [idx]: { ...current, open: !current.open } };
    });
  };

  const ensureSportsbookFilters = (idx: number, affiliates: string[]) => {
    setSportsbookFilters((prev) => {
      if (prev[idx]) return prev;
      const initial: Record<string, boolean> = {};
      affiliates.forEach((name) => {
        if (name) initial[name] = true;
      });
      return { ...prev, [idx]: initial };
    });
  };

  const toggleSportsbook = (idx: number, name: string) => {
    setSportsbookFilters((prev) => {
      const current = prev[idx] || {};
      return { ...prev, [idx]: { ...current, [name]: !current[name] } };
    });
  };

  const setAllSportsbooks = (idx: number, names: string[], value: boolean) => {
    setSportsbookFilters((prev) => {
      const updated: Record<string, boolean> = {};
      names.forEach((n) => (updated[n] = value));
      return { ...prev, [idx]: updated };
    });
  };

  // Helper to get Kalshi odds matched to teams
  const getKalshiOddsForTeams = (kalshiData: any, team1: string, team2: string) => {
    if (!kalshiData || !kalshiData.market_id || !kalshiData.outcomes || kalshiData.outcomes.length < 2) {
      return { team1Odds: '-', team2Odds: '-' };
    }

    // Parse market_id like "KXNFLGAME-25OCT23MINLAC-LAC"
    const marketId = kalshiData.market_id;
    const parts = marketId.split('-');
    
    if (parts.length < 2) {
      return { team1Odds: '-', team2Odds: '-' };
    }

    // Last part is the team code that "Yes" is for
    const yesTeamCode = parts[parts.length - 1];
    
    // Find team names that match this code
    const yesTeamNames = NFL_TEAM_ABBREV[yesTeamCode] || [];
    
    const yesOutcome = kalshiData.outcomes.find((o: any) => o.name.toLowerCase().includes('yes'));
    const noOutcome = kalshiData.outcomes.find((o: any) => o.name.toLowerCase().includes('no'));
    
    if (!yesOutcome || !noOutcome) {
      return { team1Odds: '-', team2Odds: '-' };
    }

    // Check which team matches the "Yes" outcome
    const team1Lower = team1.toLowerCase();
    const team2Lower = team2.toLowerCase();
    
    const matchesTeam1 = yesTeamNames.some(name =>
      team1Lower.includes(name.toLowerCase()) || name.toLowerCase().includes(team1Lower)
    );
    const matchesTeam2 = yesTeamNames.some(name =>
      team2Lower.includes(name.toLowerCase()) || name.toLowerCase().includes(team2Lower)
    );

    if (matchesTeam1) {
      return {
        team1Odds: yesOutcome.american_odds,
        team2Odds: noOutcome.american_odds
      };
    } else if (matchesTeam2) {
      return {
        team1Odds: noOutcome.american_odds,
        team2Odds: yesOutcome.american_odds
      };
    }

    // Fallback
    return { team1Odds: '-', team2Odds: '-' };
  };

  // NFL team abbreviations for Kalshi matching
  const NFL_TEAM_ABBREV: Record<string, string[]> = {
    'ARI': ['Cardinals', 'Arizona'],
    'ATL': ['Falcons', 'Atlanta'],
    'BAL': ['Ravens', 'Baltimore'],
    'BUF': ['Bills', 'Buffalo'],
    'CAR': ['Panthers', 'Carolina'],
    'CHI': ['Bears', 'Chicago'],
    'CIN': ['Bengals', 'Cincinnati'],
    'CLE': ['Browns', 'Cleveland'],
    'DAL': ['Cowboys', 'Dallas'],
    'DEN': ['Broncos', 'Denver'],
    'DET': ['Lions', 'Detroit'],
    'GB': ['Packers', 'Green Bay'],
    'HOU': ['Texans', 'Houston'],
    'IND': ['Colts', 'Indianapolis'],
    'JAX': ['Jaguars', 'Jacksonville'],
    'KC': ['Chiefs', 'Kansas City'],
    'LV': ['Raiders', 'Las Vegas'],
    'LAC': ['Chargers', 'Los Angeles Chargers', 'LA Chargers'],
    'LAR': ['Rams', 'Los Angeles Rams', 'LA Rams'],
    'MIA': ['Dolphins', 'Miami'],
    'MIN': ['Vikings', 'Minnesota'],
    'NE': ['Patriots', 'New England'],
    'NO': ['Saints', 'New Orleans'],
    'NYG': ['Giants', 'New York Giants', 'NY Giants'],
    'NYJ': ['Jets', 'New York Jets', 'NY Jets'],
    'PHI': ['Eagles', 'Philadelphia'],
    'PIT': ['Steelers', 'Pittsburgh'],
    'SF': ['49ers', 'San Francisco'],
    'SEA': ['Seahawks', 'Seattle'],
    'TB': ['Buccaneers', 'Tampa Bay'],
    'TEN': ['Titans', 'Tennessee'],
    'WAS': ['Commanders', 'Washington']
  };

  // Normalize team names for consistent display
  const normalizeTeamName = (name: string) => {
    const teamMap: Record<string, string> = {
      // Buffalo Bills variations
      buf: "Buffalo Bills",
      buff: "Buffalo Bills",
      bills: "Buffalo Bills",
      "buffalo bills": "Buffalo Bills",
      buffalo: "Buffalo Bills",

      // Carolina Panthers variations
      car: "Carolina Panthers",
      panthers: "Carolina Panthers",
      "carolina panthers": "Carolina Panthers",
      carolina: "Carolina Panthers",

      // Chicago Bears variations
      chi: "Chicago Bears",
      bears: "Chicago Bears",
      "chicago bears": "Chicago Bears",
      chicago: "Chicago Bears",

      // Baltimore Ravens variations
      bal: "Baltimore Ravens",
      ravens: "Baltimore Ravens",
      "baltimore ravens": "Baltimore Ravens",
      baltimore: "Baltimore Ravens",

      // Kansas City Chiefs variations
      kc: "Kansas City Chiefs",
      chiefs: "Kansas City Chiefs",
      "kansas city chiefs": "Kansas City Chiefs",
      "kansas city": "Kansas City Chiefs",

      // Philadelphia Eagles variations
      phi: "Philadelphia Eagles",
      eagles: "Philadelphia Eagles",
      "philadelphia eagles": "Philadelphia Eagles",
      philadelphia: "Philadelphia Eagles",

      // Dallas Cowboys variations
      dal: "Dallas Cowboys",
      cowboys: "Dallas Cowboys",
      "dallas cowboys": "Dallas Cowboys",
      dallas: "Dallas Cowboys",

      // New England Patriots variations
      ne: "New England Patriots",
      patriots: "New England Patriots",
      "new england patriots": "New England Patriots",
      "new england": "New England Patriots",

      // Pittsburgh Steelers variations
      pit: "Pittsburgh Steelers",
      steelers: "Pittsburgh Steelers",
      "pittsburgh steelers": "Pittsburgh Steelers",
      pittsburgh: "Pittsburgh Steelers",

      // Green Bay Packers variations
      gb: "Green Bay Packers",
      packers: "Green Bay Packers",
      "green bay packers": "Green Bay Packers",
      "green bay": "Green Bay Packers",

      // Minnesota Vikings variations
      min: "Minnesota Vikings",
      vikings: "Minnesota Vikings",
      "minnesota vikings": "Minnesota Vikings",
      minnesota: "Minnesota Vikings",

      // Detroit Lions variations
      det: "Detroit Lions",
      lions: "Detroit Lions",
      "detroit lions": "Detroit Lions",
      detroit: "Detroit Lions",

      // Atlanta Falcons variations
      atl: "Atlanta Falcons",
      falcons: "Atlanta Falcons",
      "atlanta falcons": "Atlanta Falcons",
      atlanta: "Atlanta Falcons",

      // New Orleans Saints variations
      no: "New Orleans Saints",
      saints: "New Orleans Saints",
      "new orleans saints": "New Orleans Saints",
      "new orleans": "New Orleans Saints",

      // Tampa Bay Buccaneers variations
      tb: "Tampa Bay Buccaneers",
      buccaneers: "Tampa Bay Buccaneers",
      "tampa bay buccaneers": "Tampa Bay Buccaneers",
      "tampa bay": "Tampa Bay Buccaneers",
      tampa: "Tampa Bay Buccaneers",

      // Arizona Cardinals variations
      ari: "Arizona Cardinals",
      cardinals: "Arizona Cardinals",
      "arizona cardinals": "Arizona Cardinals",
      arizona: "Arizona Cardinals",

      // Los Angeles Rams variations
      lar: "Los Angeles Rams",
      rams: "Los Angeles Rams",
      "los angeles rams": "Los Angeles Rams",
      "los angeles": "Los Angeles Rams",

      // San Francisco 49ers variations
      sf: "San Francisco 49ers",
      "49ers": "San Francisco 49ers",
      "san francisco 49ers": "San Francisco 49ers",
      "san francisco": "San Francisco 49ers",

      // Seattle Seahawks variations
      sea: "Seattle Seahawks",
      seahawks: "Seattle Seahawks",
      "seattle seahawks": "Seattle Seahawks",
      seattle: "Seattle Seahawks",

      // New York Giants variations
      nyg: "New York Giants",
      giants: "New York Giants",
      "new york giants": "New York Giants",

      // New York Jets variations
      nyj: "New York Jets",
      jets: "New York Jets",
      "new york jets": "New York Jets",

      // Washington Commanders variations
      was: "Washington Commanders",
      commanders: "Washington Commanders",
      "washington commanders": "Washington Commanders",
      washington: "Washington Commanders",

      // Cincinnati Bengals variations
      cin: "Cincinnati Bengals",
      bengals: "Cincinnati Bengals",
      "cincinnati bengals": "Cincinnati Bengals",
      cincinnati: "Cincinnati Bengals",

      // Cleveland Browns variations
      cle: "Cleveland Browns",
      browns: "Cleveland Browns",
      "cleveland browns": "Cleveland Browns",
      cleveland: "Cleveland Browns",

      // Houston Texans variations
      hou: "Houston Texans",
      texans: "Houston Texans",
      "houston texans": "Houston Texans",
      houston: "Houston Texans",

      // Indianapolis Colts variations
      ind: "Indianapolis Colts",
      colts: "Indianapolis Colts",
      "indianapolis colts": "Indianapolis Colts",
      indianapolis: "Indianapolis Colts",

      // Jacksonville Jaguars variations
      jax: "Jacksonville Jaguars",
      jaguars: "Jacksonville Jaguars",
      "jacksonville jaguars": "Jacksonville Jaguars",
      jacksonville: "Jacksonville Jaguars",

      // Tennessee Titans variations
      ten: "Tennessee Titans",
      titans: "Tennessee Titans",
      "tennessee titans": "Tennessee Titans",
      tennessee: "Tennessee Titans",

      // Denver Broncos variations
      den: "Denver Broncos",
      broncos: "Denver Broncos",
      "denver broncos": "Denver Broncos",
      denver: "Denver Broncos",

      // Las Vegas Raiders variations
      lv: "Las Vegas Raiders",
      raiders: "Las Vegas Raiders",
      "las vegas raiders": "Las Vegas Raiders",
      "las vegas": "Las Vegas Raiders",

      // Los Angeles Chargers variations
      lac: "Los Angeles Chargers",
      chargers: "Los Angeles Chargers",
      "los angeles chargers": "Los Angeles Chargers",

      // Miami Dolphins variations
      mia: "Miami Dolphins",
      dolphins: "Miami Dolphins",
      "miami dolphins": "Miami Dolphins",
      miami: "Miami Dolphins",
    };

    const normalized = name.toLowerCase().trim();
    return teamMap[normalized] || name;
  };

  const [domeSport, setDomeSport] = useState("nfl");
  const [domeDate, setDomeDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Fetch NFL Crypto Markets
  const fetchNFLCrypto = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/nfl/crypto`);
      if (!response.ok) throw new Error("Failed to fetch NFL crypto markets");
      const data = await response.json();
      setNflCrypto(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching NFL crypto markets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch NFL crypto markets");
      throw err;
    }
  };

  // Fetch NFL Traditional Odds
  const fetchNFLTraditional = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/nfl/traditional`);
      if (!response.ok) throw new Error("Failed to fetch NFL traditional odds");
      const data = await response.json();
      setNflTraditional(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching NFL traditional odds:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch NFL traditional odds");
      throw err;
    }
  };

  // Fetch NFL Combined (Dome + Traditional)
  const fetchNFLCombined = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/nfl/combined?date=${nflCombinedDate}`
      );
      if (!response.ok) throw new Error("Failed to fetch NFL combined markets");
      const data = await response.json();
      setNflCombined(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching NFL combined markets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch NFL combined markets");
      throw err;
    }
  };

  // Fetch Politics Markets
  const fetchPolitics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/politics`);
      if (!response.ok) throw new Error("Failed to fetch politics markets");
      const data = await response.json();
      setPolitics(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching politics markets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch politics markets");
      throw err;
    }
  };

  // Fetch Crypto Markets
  const fetchCrypto = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/crypto`);
      if (!response.ok) throw new Error("Failed to fetch crypto markets");
      const data = await response.json();
      setCrypto(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching crypto markets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch crypto markets");
      throw err;
    }
  };

  // Fetch Others Markets
  const fetchOthers = async () => {
    try {
      const params = new URLSearchParams({
        limit: String(OTHERS_LIMIT),
        offset: String(othersOffset),
      });
      const response = await fetch(
        `${API_BASE_URL}/others?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch others markets");
      const data: any = await response.json();
      if (data && data.error) {
        setError(String(data.error));
        return;
      }
      setOthers(data as OthersResponse);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching others markets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch others markets");
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
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching dome markets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch dome markets");
    } finally {
      setDomeLoading(false);
    }
  };

  // Fetch data based on active tab
  const fetchCurrentTabData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
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
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching tab data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Manual refresh handler
  const handleRefresh = () => {
    fetchCurrentTabData(true);
  };

  // Initial data fetch ONLY when tab or sub-tab changes
  useEffect(() => {
    // Only fetch if we don't already have data for this tab
    const shouldFetch = 
      (activeTab === "nfl" && nflSubTab === "crypto" && !nflCrypto) ||
      (activeTab === "nfl" && nflSubTab === "traditional" && !nflTraditional) ||
      (activeTab === "nfl" && nflSubTab === "combined" && !nflCombined) ||
      (activeTab === "politics" && !politics) ||
      (activeTab === "crypto" && !crypto) ||
      (activeTab === "others" && !others);
    
    if (shouldFetch) {
      fetchCurrentTabData();
    }
  }, [activeTab, nflSubTab]);

  // Fetch when date changes for NFL combined
  useEffect(() => {
    if (activeTab === "nfl" && nflSubTab === "combined") {
      fetchNFLCombined();
    }
  }, [nflCombinedDate]);

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


  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">
            Market Aggregator Dashboard
          </h1>
          <div className="flex items-center gap-4">
            {/* Last Update Time */}
            {lastUpdate && (
              <div className="text-sm text-gray-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors">
              Connect Wallet
            </button>
          </div>
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
                {nflCrypto?.summary.polymarket_markets || 0}
              </div>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">Kalshi</div>
              <div className="text-4xl font-bold">
                {nflCrypto?.summary.kalshi_markets || 0}
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
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
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
                  nflSubTab === "combined"
                    ? "bg-white text-black"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                All Providers
              </button>
              <button
                onClick={() => setNflSubTab("crypto")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  nflSubTab === "crypto"
                    ? "bg-white text-black"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Crypto Only
              </button>
              <button
                onClick={() => setNflSubTab("traditional")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  nflSubTab === "traditional"
                    ? "bg-white text-black"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
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
                    <label
                      htmlFor="nfl-combined-date"
                      className="text-sm font-medium text-gray-300"
                    >
                      Game Date:
                    </label>
                    <input
                      type="date"
                      id="nfl-combined-date"
                      value={nflCombinedDate}
                      onChange={(e) => setNflCombinedDate(e.target.value)}
                      className="p-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:border-gray-600"
                    />
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => setNflCombinedView("table")}
                        className={`px-3 py-2 rounded-md text-sm ${
                          nflCombinedView === "table"
                            ? "bg-white text-black"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        Table
                      </button>
                      <button
                        onClick={() => setNflCombinedView("cards")}
                        className={`px-3 py-2 rounded-md text-sm ${
                          nflCombinedView === "cards"
                            ? "bg-white text-black"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        Cards
                      </button>
                    </div>
                  </div>
                </div>

                {nflCombined && nflCombined.games.length > 0 ? (
                  <div className="space-y-4">
                    {nflCombined.games.map((game, idx) => (
                      <div
                        key={idx}
                        className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 relative"
                      >
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <h3 className="text-xl font-semibold">
                            {game.teams.team1.toUpperCase()} vs{" "}
                            {game.teams.team2.toUpperCase()}
                          </h3>
                          <div className="relative">
                            <button
                              onClick={() => {
                                const names = (game.traditional_odds || []).map(
                                  (l) => l.affiliate_name
                                );
                                ensureSportsbookFilters(idx, names);
                                toggleDropdown(idx);
                              }}
                              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg"
                            >
                              Filter markets
                            </button>
                            {getVisibilityFor(idx).open && (
                              <div className="absolute right-0 mt-2 w-56 bg-[#0f0f0f] border border-gray-800 rounded-lg shadow-lg z-10 p-2">
                                <div className="px-2 py-1 text-xs text-gray-400">
                                  Toggle visibility
                                </div>
                                <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-800 rounded">
                                  <input
                                    type="checkbox"
                                    checked={getVisibilityFor(idx).polymarket}
                                    onChange={() =>
                                      toggleVisibility(idx, "polymarket")
                                    }
                                  />
                                  <span>Polymarket</span>
                                </label>
                                <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-800 rounded">
                                  <input
                                    type="checkbox"
                                    checked={getVisibilityFor(idx).kalshi}
                                    onChange={() =>
                                      toggleVisibility(idx, "kalshi")
                                    }
                                  />
                                  <span>Kalshi</span>
                                </label>
                                <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-800 rounded">
                                  <input
                                    type="checkbox"
                                    checked={getVisibilityFor(idx).sportsbooks}
                                    onChange={() =>
                                      toggleVisibility(idx, "sportsbooks")
                                    }
                                  />
                                  <span>Sportsbooks</span>
                                </label>
                                {getVisibilityFor(idx).sportsbooks && (
                                  <>
                                    <div className="my-2 border-t border-gray-800" />
                                    <div className="flex items-center justify-between px-2 py-1">
                                      <div className="text-xs text-gray-400">
                                        Sportsbooks
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          className="text-xs text-gray-300 hover:text-white"
                                          onClick={() =>
                                            setAllSportsbooks(
                                              idx,
                                              (game.traditional_odds || []).map(
                                                (l) => l.affiliate_name
                                              ),
                                              true
                                            )
                                          }
                                        >
                                          Select all
                                        </button>
                                        <button
                                          className="text-xs text-gray-300 hover:text-white"
                                          onClick={() =>
                                            setAllSportsbooks(
                                              idx,
                                              (game.traditional_odds || []).map(
                                                (l) => l.affiliate_name
                                              ),
                                              false
                                            )
                                          }
                                        >
                                          Clear all
                                        </button>
                                      </div>
                                    </div>
                                    <div className="max-h-60 overflow-auto">
                                      {Array.from(
                                        new Set(
                                          (game.traditional_odds || []).map(
                                            (l) => l.affiliate_name
                                          )
                                        )
                                      ).map((name) => (
                                        <label
                                          key={name}
                                          className="flex items-center gap-2 px-2 py-2 hover:bg-gray-800 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={Boolean(
                                              (sportsbookFilters[idx] || {})[
                                                name
                                              ]
                                            )}
                                            onChange={() =>
                                              toggleSportsbook(idx, name)
                                            }
                                          />
                                          <span>{name}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {nflCombinedView === "table" ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-300 border-b border-gray-800">
                                  <th className="py-2 pr-6">Provider</th>
                                  <th className="py-2 pr-6">Outcome 1</th>
                                  <th className="py-2 pr-6">Odds</th>
                                  <th className="py-2 pr-6">Outcome 2</th>
                                  <th className="py-2 pr-6">Odds</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getVisibilityFor(idx).polymarket &&
                                  game.polymarket && (
                                    <tr className="border-b border-gray-800">
                                      <td className="py-2 pr-6 text-blue-400 font-semibold">
                                        Polymarket
                                      </td>
                                      <td className="py-2 pr-6">
                                        {game.polymarket.outcomes[0]
                                          ? normalizeTeamName(
                                              game.polymarket.outcomes[0].name
                                            )
                                          : "-"}
                                      </td>
                                      <td className="py-2 pr-6">
                                        {game.polymarket.outcomes[0]
                                          ? game.polymarket.outcomes[0]
                                              .american_odds
                                          : "-"}
                                      </td>
                                      <td className="py-2 pr-6">
                                        {game.polymarket.outcomes[1]
                                          ? normalizeTeamName(
                                              game.polymarket.outcomes[1].name
                                            )
                                          : "-"}
                                      </td>
                                      <td className="py-2 pr-6">
                                        {game.polymarket.outcomes[1]
                                          ? game.polymarket.outcomes[1]
                                              .american_odds
                                          : "-"}
                                      </td>
                                    </tr>
                                  )}

                                {getVisibilityFor(idx).kalshi &&
                                  game.kalshi && (() => {
                                    const kalshiOdds = getKalshiOddsForTeams(
                                      game.kalshi,
                                      normalizeTeamName(game.teams.team1),
                                      normalizeTeamName(game.teams.team2)
                                    );
                                    return (
                                      <tr className="border-b border-gray-800">
                                        <td className="py-2 pr-6 text-green-400 font-semibold">
                                          Kalshi
                                        </td>
                                        <td className="py-2 pr-6">
                                          {normalizeTeamName(game.teams.team1)}
                                        </td>
                                        <td className="py-2 pr-6">
                                          {kalshiOdds.team1Odds}
                                        </td>
                                        <td className="py-2 pr-6">
                                          {normalizeTeamName(game.teams.team2)}
                                        </td>
                                        <td className="py-2 pr-6">
                                          {kalshiOdds.team2Odds}
                                        </td>
                                      </tr>
                                    );
                                  })()}

                                {getVisibilityFor(idx).sportsbooks &&
                                  game.traditional_odds &&
                                  game.traditional_odds.length > 0 && (
                                    <>
                                      {game.traditional_odds
                                        .filter((line) => {
                                          const filters =
                                            sportsbookFilters[idx];
                                          if (!filters) return true;
                                          return (
                                            filters[line.affiliate_name] !==
                                            false
                                          );
                                        })
                                        .map((line, i) => (
                                          <tr
                                            key={i}
                                            className="border-b border-gray-800"
                                          >
                                            <td className="py-2 pr-6 text-yellow-400 font-semibold">
                                              {line.affiliate_name}
                                            </td>
                                            <td className="py-2 pr-6">
                                              {normalizeTeamName(
                                                game.teams.team1
                                              )}
                                            </td>
                                            <td className="py-2 pr-6">
                                              {line.moneyline_away > 0
                                                ? `+${line.moneyline_away}`
                                                : line.moneyline_away}
                                            </td>
                                            <td className="py-2 pr-6">
                                              {normalizeTeamName(
                                                game.teams.team2
                                              )}
                                            </td>
                                            <td className="py-2 pr-6">
                                              {line.moneyline_home > 0
                                                ? `+${line.moneyline_home}`
                                                : line.moneyline_home}
                                            </td>
                                          </tr>
                                        ))}
                                    </>
                                  )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <div className="flex gap-4 min-w-full pb-2">
                              {getVisibilityFor(idx).polymarket &&
                                game.polymarket && (
                                  <div className="min-w-[260px] bg-[#111] border border-gray-800 rounded-lg p-4">
                                    <div className="text-blue-400 font-semibold mb-4">
                                      Polymarket
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {game.polymarket.outcomes.map(
                                        (outcome, i) => (
                                          <button
                                            key={i}
                                            className={`py-3 px-4 rounded-lg font-semibold text-sm ${
                                              outcome.name
                                                .toLowerCase()
                                                .includes("yes")
                                                ? "bg-green-600 hover:bg-green-700"
                                                : "bg-red-600 hover:bg-red-700"
                                            } text-white transition-colors`}
                                          >
                                            {normalizeTeamName(outcome.name)} (
                                            {outcome.american_odds})
                                          </button>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              {getVisibilityFor(idx).kalshi && game.kalshi && (() => {
                                const kalshiOdds = getKalshiOddsForTeams(
                                  game.kalshi,
                                  normalizeTeamName(game.teams.team1),
                                  normalizeTeamName(game.teams.team2)
                                );
                                return (
                                  <div className="min-w-[260px] bg-[#111] border border-gray-800 rounded-lg p-4">
                                    <div className="text-green-400 font-semibold mb-4">
                                      Kalshi
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        className={`py-3 px-4 rounded-lg font-semibold text-sm bg-green-600 hover:bg-green-700 text-white transition-colors`}
                                      >
                                        {normalizeTeamName(game.teams.team1)} (
                                        {kalshiOdds.team1Odds})
                                      </button>
                                      <button
                                        className={`py-3 px-4 rounded-lg font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors`}
                                      >
                                        {normalizeTeamName(game.teams.team2)} (
                                        {kalshiOdds.team2Odds})
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                              {getVisibilityFor(idx).sportsbooks &&
                                game.traditional_odds &&
                                game.traditional_odds.length > 0 && (
                                  <>
                                    {game.traditional_odds
                                      .filter((line) => {
                                        const filters = sportsbookFilters[idx];
                                        if (!filters) return true;
                                        return (
                                          filters[line.affiliate_name] !== false
                                        );
                                      })
                                      .map((line, i) => (
                                        <div
                                          key={i}
                                          className="min-w-[260px] bg-[#111] border border-gray-800 rounded-lg p-4"
                                        >
                                          <div className="text-yellow-400 font-semibold mb-4">
                                            {line.affiliate_name}
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <button className="py-3 px-4 rounded-lg font-semibold text-sm bg-green-600 hover:bg-green-700 text-white transition-colors">
                                              {normalizeTeamName(
                                                game.teams.team1
                                              )}{" "}
                                              (
                                              {line.moneyline_away > 0
                                                ? `+${line.moneyline_away}`
                                                : line.moneyline_away}
                                              )
                                            </button>
                                            <button className="py-3 px-4 rounded-lg font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors">
                                              {normalizeTeamName(
                                                game.teams.team2
                                              )}{" "}
                                              (
                                              {line.moneyline_home > 0
                                                ? `+${line.moneyline_home}`
                                                : line.moneyline_home}
                                              )
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                  </>
                                )}
                            </div>
                          </div>
                        )}

                        {game.arbitrage_opportunity && (
                          <div className="mt-4 text-sm text-yellow-400 font-semibold">
                            ⚡ Arbitrage Opportunity (Spread:{" "}
                            {game.price_spread.toFixed(2)}%)
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
              <h3 className="text-xl font-semibold text-white mb-4">
                Select Sport & Date for Dome Markets
              </h3>
              <form onSubmit={handleDomeSubmit}>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="dome-sport"
                    className="text-sm font-medium text-gray-300"
                  >
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
                  <label
                    htmlFor="dome-date"
                    className="text-sm font-medium text-gray-300"
                  >
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
                    className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 disabled:bg-gray-600 disabled:text-gray-400 transition-colors flex items-center gap-2"
                  >
                    {domeLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {domeLoading ? "Searching..." : "Search"}
                  </button>
                  {dome && !domeLoading && (
                    <button
                      type="button"
                      onClick={fetchDome}
                      disabled={domeLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  )}
                </div>
              </form>
            </div>

            {dome && (
              <>
                {dome.comparisons.length > 0 ? (
                  <div className="space-y-4">
                    {dome.comparisons.map((comp, idx) => (
                      <CryptoComparisonGroup
                        key={idx}
                        comparison={comp as any}
                      />
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
                        <div className="text-2xl font-bold">
                          {others.summary?.total_comparisons ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Arbitrage</div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {others.summary?.arbitrage_opportunities ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Limit</div>
                        <div className="text-xl">
                          {others.limit ?? OTHERS_LIMIT}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Offset</div>
                        <div className="text-xl">
                          {others.offset ?? othersOffset}
                        </div>
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
                      const next = Math.max(0, othersOffset - OTHERS_LIMIT);
                      setOthersOffset(next);
                      fetchOthers();
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      othersOffset === 0
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={othersOffset === 0}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      const next = othersOffset + OTHERS_LIMIT;
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
