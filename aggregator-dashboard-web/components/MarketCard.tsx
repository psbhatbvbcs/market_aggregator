"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketData } from "@/lib/market-types";
import { TrendingUp, DollarSign, Droplet } from "lucide-react";

interface MarketCardProps {
  platform: "polymarket" | "kalshi";
  data: MarketData;
  isBest: boolean;
  // Optional team context & per-team best list for granular highlighting
  teamNormalized?: string;
  teamDisplay?: string;
  perTeamBest?: Array<{
    team_normalized: string;
    best_platform: "polymarket" | "kalshi";
    best_source: "polymarket_team" | "kalshi_yes" | "opponent_no";
    best_price: number;
  }>;
}

export default function MarketCard({ platform, data, isBest, teamNormalized, teamDisplay, perTeamBest }: MarketCardProps) {
  const platformName = platform === "polymarket" ? "Polymarket" : "Kalshi";
  const platformColor = platform === "polymarket" ? "bg-purple-500" : "bg-blue-500";
  const textColor = "text-red-600";
  const bgColor = "bg-red-50";

  // Determine which outcome(s) in this card are best for this team
  const bestForThisTeam = teamNormalized && perTeamBest
    ? perTeamBest.find(b => b.team_normalized === teamNormalized)
    : undefined;
  
  return (
    <Card className={`'border-red-300 ${bgColor} transition-all`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            <span className={`inline-block px-2 py-1 rounded text-white text-sm ${platformColor}`}>
              {platformName}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Team label (for Kalshi team cards) */}
        {teamDisplay && (
          <div className="mb-2 text-sm font-semibold text-gray-700">{teamDisplay}</div>
        )}

        {/* Outcomes */}
        <div className="space-y-2 mb-4">
          {data.outcomes.map((outcome, idx) => (
            <div key={idx} className={`flex justify-between items-center p-2 bg-white rounded ${
              bestForThisTeam && (
                (platform === 'polymarket' && bestForThisTeam.best_platform === 'polymarket' && idx === 0 /* approximate mapping */) ||
                (platform === 'kalshi' && bestForThisTeam.best_platform === 'kalshi' && (
                  (bestForThisTeam.best_source === 'kalshi_yes' && outcome.name.toLowerCase().includes('yes')) ||
                  (bestForThisTeam.best_source === 'opponent_no' && outcome.name.toLowerCase().includes('no'))
                ))
              ) ? '' : ''
            }`}>
              <span className={`font-medium text-sm ${textColor}`}>{outcome.name}</span>
              <div className="text-right">
                <div className={`font-bold text-lg ${textColor}`}>{(outcome.price * 100).toFixed(1)}%</div>
                <div className={`text-xs text-red-500`}>{outcome.american_odds}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1">
            <DollarSign className={`w-3 h-3 text-red-500`} />
            <div>
              <div className="text-gray-500">Volume</div>
              <div className={`font-semibold ${textColor}`}>${(data.volume / 1000).toFixed(1)}K</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Droplet className={`w-3 h-3 text-red-500`} />
            <div>
              <div className="text-gray-500">Liquidity</div>
              <div className={`font-semibold ${textColor}`}>${(data.liquidity / 1000).toFixed(1)}K</div>
            </div>
          </div>
        </div>

        {/* Market ID */}
        <div className="mt-3 pt-3 border-t text-xs text-gray-400 truncate">
          ID: {data.market_id}
        </div>
      </CardContent>
    </Card>
  );
}

