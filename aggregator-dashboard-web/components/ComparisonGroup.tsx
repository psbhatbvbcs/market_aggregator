"use client";

import { Comparison } from "@/lib/market-types";
import MarketCard from "./MarketCard";
import { AlertCircle } from "lucide-react";

interface ComparisonGroupProps {
  comparison: Comparison;
}

export default function ComparisonGroup({ comparison }: ComparisonGroupProps) {
  return (
    <div className="mb-6">
      {/* Title */}
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-xl font-bold text-gray-800">{comparison.title}</h3>
        {comparison.arbitrage_opportunity && (
          <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
            <AlertCircle className="w-3 h-3" />
            Arbitrage Opportunity
          </span>
        )}
      </div>

      {/* Spread Info */}
      <div className="mb-3 text-sm text-gray-600">
        Price Spread: <span className="font-bold text-lg text-blue-600">{comparison.price_spread.toFixed(2)}%</span>
      </div>

      {/* Market Cards: Polymarket + Kalshi */}
      <div className={`grid gap-4 ${comparison.kalshi_by_team ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
        {comparison.polymarket && (
          <MarketCard
            platform="polymarket"
            data={comparison.polymarket}
            isBest={comparison.best_platform === "polymarket"}
            perTeamBest={comparison.per_team_best}
          />
        )}
        {/* New NFL layout: two Kalshi team cards if available */}
        {comparison.kalshi_by_team?.map((kt, idx) => (
          <MarketCard
            key={kt.market_id}
            platform="kalshi"
            data={{
              market_id: kt.market_id,
              outcomes: [
                kt.yes ? kt.yes : { name: "Yes", price: 0, american_odds: "" },
                kt.no ? kt.no : { name: "No", price: 0, american_odds: "" }
              ],
              volume: kt.volume,
              liquidity: kt.liquidity,
              start_time: kt.start_time,
            }}
            isBest={comparison.best_platform === "kalshi"}
            teamNormalized={kt.team_normalized}
            teamDisplay={kt.team_display}
            perTeamBest={comparison.per_team_best}
          />
        ))}
        {/* Legacy politics layout: single Kalshi card */}
        {!comparison.kalshi_by_team && comparison.kalshi && (
          <MarketCard
            platform="kalshi"
            data={comparison.kalshi}
            isBest={comparison.best_platform === "kalshi"}
          />
        )}
      </div>

      {/* Best Odds Summary per Team */}
      {comparison.per_team_best && comparison.per_team_best.length > 0 && (
        <div className="mt-4 p-4 rounded border bg-white">
          <div className="text-center text-sm font-semibold text-gray-700 mb-3">Best Odds (per team)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {comparison.per_team_best.map((b) => {
              const platformStyles = b.best_platform === 'polymarket'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700';
              const platformLabel = b.best_platform.toUpperCase();
              const sourceLabel = b.best_source === 'polymarket_team' ? 'Team' : (b.best_source === 'kalshi_yes' ? 'YES' : 'Opp NO');
              return (
                <div key={b.team_normalized} className="p-3 rounded bg-gray-50 text-center">
                  <div className="text-base font-bold text-gray-900 mb-1">{b.team_display || b.team_normalized}</div>
                  <div className="inline-flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${platformStyles}`}>{platformLabel}</span>
                    <span className="text-sm font-semibold text-gray-900">{(b.best_price * 100).toFixed(1)}%</span>
                    <span className="text-xs text-gray-500">({b.best_american_odds})</span>
                    <span className="text-xs text-gray-400">{sourceLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

