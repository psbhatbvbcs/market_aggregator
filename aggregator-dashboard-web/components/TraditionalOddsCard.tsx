"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TraditionalGame } from "@/lib/market-types";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface TraditionalOddsCardProps {
  game: TraditionalGame;
}

export default function TraditionalOddsCard({ game }: TraditionalOddsCardProps) {
  const commenceDate = game.commence_time ? new Date(game.commence_time) : null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold">{game.title}</CardTitle>
        {commenceDate && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <Calendar className="w-3 h-3" />
            {format(commenceDate, "MMM d, yyyy h:mm a")}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Best Odds */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-700">Best Odds</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">{game.best_odds.home_team}</div>
              <div className="font-bold text-lg text-green-700">
                {game.best_odds.best_home_odds > 0 ? '+' : ''}{game.best_odds.best_home_odds}
              </div>
              <div className="text-xs text-gray-500 mt-1">{game.best_odds.best_home_platform}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">{game.best_odds.away_team}</div>
              <div className="font-bold text-lg text-blue-700">
                {game.best_odds.best_away_odds > 0 ? '+' : ''}{game.best_odds.best_away_odds}
              </div>
              <div className="text-xs text-gray-500 mt-1">{game.best_odds.best_away_platform}</div>
            </div>
          </div>
        </div>

        {/* All Bookmaker Odds */}
        <div>
          <h4 className="text-sm font-semibold mb-2 text-gray-700">All Bookmakers</h4>
          <div className="space-y-2">
            {game.all_odds.map((odds, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                <span className="font-medium">{odds.bookmaker}</span>
                <div className="flex gap-3">
                  <span className={odds.home_odds === game.best_odds.best_home_odds ? 'font-bold text-green-600' : ''}>
                    {odds.home_odds > 0 ? '+' : ''}{odds.home_odds}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className={odds.away_odds === game.best_odds.best_away_odds ? 'font-bold text-blue-600' : ''}>
                    {odds.away_odds > 0 ? '+' : ''}{odds.away_odds}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

