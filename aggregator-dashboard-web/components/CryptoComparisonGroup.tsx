"use client";

import { CryptoComparison } from "@/lib/market-types";
import { AlertCircle } from "lucide-react";

interface CryptoComparisonGroupProps {
  comparison: CryptoComparison;
}

export default function CryptoComparisonGroup({ comparison }: CryptoComparisonGroupProps) {
  const getCategory = () => {
    if (comparison.title.toLowerCase().includes('btc') || 
        comparison.title.toLowerCase().includes('eth') ||
        comparison.title.toLowerCase().includes('bitcoin') ||
        comparison.title.toLowerCase().includes('ethereum')) {
      return 'Crypto';
    }
    return null;
  };

  const category = getCategory();

  // Extract team names from Polymarket outcomes for sports matches
  const extractTeamNames = () => {
    if (!comparison.polymarket || !comparison.polymarket.outcomes) return null;
    
    const outcomes = comparison.polymarket.outcomes;
    if (outcomes.length === 2) {
      return {
        team1: outcomes[0].name,
        team2: outcomes[1].name
      };
    }
    return null;
  };

  // NFL team abbreviation to full name mapping
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
    'LAC': ['Chargers', 'Los Angeles', 'LA Chargers'],
    'LAR': ['Rams', 'LA Rams'],
    'LV': ['Raiders', 'Las Vegas'],
    'MIA': ['Dolphins', 'Miami'],
    'MIN': ['Vikings', 'Minnesota'],
    'NE': ['Patriots', 'New England'],
    'NO': ['Saints', 'New Orleans'],
    'NYG': ['Giants', 'New York', 'NY Giants'],
    'NYJ': ['Jets', 'NY Jets'],
    'PHI': ['Eagles', 'Philadelphia'],
    'PIT': ['Steelers', 'Pittsburgh'],
    'SF': ['49ers', 'San Francisco'],
    'SEA': ['Seahawks', 'Seattle'],
    'TB': ['Buccaneers', 'Tampa Bay', 'Bucs'],
    'TEN': ['Titans', 'Tennessee'],
    'WAS': ['Commanders', 'Washington']
  };

  // Match Kalshi outcomes to Polymarket teams by parsing Kalshi market_id
  const matchKalshiToPolymarket = () => {
    if (!comparison.polymarket || !comparison.kalshi || 
        !comparison.polymarket.outcomes || !comparison.kalshi.outcomes ||
        comparison.polymarket.outcomes.length !== 2 || comparison.kalshi.outcomes.length !== 2) {
      return null;
    }

    const polyTeam1 = comparison.polymarket.outcomes[0];
    const polyTeam2 = comparison.polymarket.outcomes[1];
    const kalshiOutcome1 = comparison.kalshi.outcomes[0]; // "Yes"
    const kalshiOutcome2 = comparison.kalshi.outcomes[1]; // "No"

    // Extract the team code from Kalshi market_id
    // Format: KXNFLGAME-25OCT23MINLAC-LAC
    // The code after the last dash is the team that "Yes" is for
    const marketId = comparison.kalshi.market_id;
    const lastDashIndex = marketId.lastIndexOf('-');
    if (lastDashIndex === -1) {
      return null;
    }

    const teamCode = marketId.substring(lastDashIndex + 1);
    const teamNames = NFL_TEAM_ABBREV[teamCode];
    
    if (!teamNames) {
      return null;
    }

    // Find which Polymarket team matches this code
    const team1NameLower = polyTeam1.name.toLowerCase();
    const team2NameLower = polyTeam2.name.toLowerCase();
    
    const matchesTeam1 = teamNames.some(name => 
      team1NameLower.includes(name.toLowerCase()) || name.toLowerCase().includes(team1NameLower)
    );
    const matchesTeam2 = teamNames.some(name => 
      team2NameLower.includes(name.toLowerCase()) || name.toLowerCase().includes(team2NameLower)
    );

    if (matchesTeam1) {
      // Kalshi "Yes" is for team1, "No" is inverse (so use "Yes" price for team1)
      return {
        team1: { name: polyTeam1.name, odds: kalshiOutcome1.price },
        team2: { name: polyTeam2.name, odds: kalshiOutcome2.price }
      };
    } else if (matchesTeam2) {
      // Kalshi "Yes" is for team2, so swap
      return {
        team1: { name: polyTeam1.name, odds: kalshiOutcome2.price },
        team2: { name: polyTeam2.name, odds: kalshiOutcome1.price }
      };
    }

    return null;
  };

  const teamNames = extractTeamNames();
  const kalshiMatched = matchKalshiToPolymarket();

  const formatVolume = (volume: number | string) => {
    const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (numVolume >= 1000) {
      return `$${Math.floor(numVolume / 1000)}K`;
    }
    return `$${numVolume}`;
  };

  const formatLiquidity = (liquidity: number) => {
    if (liquidity >= 1000000) {
      return `$${(liquidity / 1000000).toFixed(1)}M`;
    }
    if (liquidity >= 1000) {
      return `$${(liquidity / 1000).toFixed(1)}K`;
    }
    return `$${liquidity}`;
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
      {/* Question with icon and category */}
      <div className="mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm">👤</span>
        </div>
        <div className="flex-1">
          <h3 className="text-white font-medium mb-1">{comparison.title}</h3>
          {category && (
            <span className="text-xs text-gray-400">{category}</span>
          )}
        </div>
      </div>

      {/* Platforms Grid */}
      <div className={`grid grid-cols-1 ${comparison.limitless ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
        {/* Polymarket */}
        {comparison.polymarket && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold">Polymarket</h4>
              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                Active
              </span>
            </div>
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Liquidity</div>
              <div className="text-white font-semibold">{formatLiquidity(comparison.polymarket.liquidity)}</div>
            </div>
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Volume</div>
              <div className="text-white font-semibold">{formatVolume(comparison.polymarket.volume)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {comparison.polymarket.outcomes.map((outcome, idx) => (
                <button
                  key={idx}
                  className={`py-3 px-4 rounded-lg font-semibold text-sm ${
                    outcome.name.toLowerCase().includes('yes')
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white transition-colors`}
                >
                  {outcome.name} ({(outcome.price * 100).toFixed(0)}%)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Kalshi */}
        {comparison.kalshi && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold">Kalshi</h4>
              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                Active
              </span>
            </div>
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Liquidity</div>
              <div className="text-white font-semibold">{formatLiquidity(comparison.kalshi.liquidity)}</div>
            </div>
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Volume</div>
              <div className="text-white font-semibold">{formatVolume(comparison.kalshi.volume)}</div>
            </div>
            {comparison.kalshi_by_team && comparison.kalshi_by_team.length > 0 ? (
              <div className="space-y-3">
                {comparison.kalshi_by_team.map((teamData, teamIdx) => (
                  <div key={teamIdx} className="space-y-2">
                    <div className="text-sm font-medium text-gray-300">{teamData.team_display}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {teamData.yes && (
                        <button
                          className="py-3 px-4 rounded-lg font-semibold text-sm bg-green-600 hover:bg-green-700 text-white transition-colors"
                        >
                          Yes ({(teamData.yes.price * 100).toFixed(0)}%)
                        </button>
                      )}
                      {teamData.no && (
                        <button
                          className="py-3 px-4 rounded-lg font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors"
                        >
                          No ({(teamData.no.price * 100).toFixed(0)}%)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : kalshiMatched ? (
              <div className="grid grid-cols-2 gap-2">
                <button className="py-3 px-4 rounded-lg font-semibold text-sm bg-green-600 hover:bg-green-700 text-white transition-colors">
                  {kalshiMatched.team1.name} ({(kalshiMatched.team1.odds * 100).toFixed(0)}%)
                </button>
                <button className="py-3 px-4 rounded-lg font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors">
                  {kalshiMatched.team2.name} ({(kalshiMatched.team2.odds * 100).toFixed(0)}%)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {comparison.kalshi.outcomes.map((outcome, idx) => (
                  <button
                    key={idx}
                    className={`py-3 px-4 rounded-lg font-semibold text-sm ${
                      outcome.name.toLowerCase().includes('yes')
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white transition-colors`}
                  >
                    {outcome.name} ({(outcome.price * 100).toFixed(0)}%)
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Limitless */}
        {comparison.limitless && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold">Limitless</h4>
              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                Active
              </span>
            </div>
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Liquidity</div>
              <div className="text-white font-semibold">{formatLiquidity(comparison.limitless.liquidity)}</div>
            </div>
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Volume</div>
              <div className="text-white font-semibold">{formatVolume(comparison.limitless.volume)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {comparison.limitless.outcomes.map((outcome, idx) => (
                <button
                  key={idx}
                  className={`py-3 px-4 rounded-lg font-semibold text-sm ${
                    outcome.name.toLowerCase().includes('yes')
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white transition-colors`}
                >
                  {outcome.name} ({(outcome.price * 100).toFixed(0)}%)
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
