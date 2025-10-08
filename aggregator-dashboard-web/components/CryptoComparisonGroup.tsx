"use client";

import { CryptoComparison } from "@/lib/market-types";
import MarketCard from "./MarketCard";
import { AlertCircle } from "lucide-react";

interface CryptoComparisonGroupProps {
  comparison: CryptoComparison;
}

export default function CryptoComparisonGroup({ comparison }: CryptoComparisonGroupProps) {
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

      {/* Market Cards: Polymarket + Kalshi + Limitless */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {comparison.polymarket && (
          <MarketCard
            platform="polymarket"
            data={comparison.polymarket}
            isBest={comparison.best_platform === "polymarket"}
          />
        )}
        {comparison.kalshi && (
          <MarketCard
            platform="kalshi"
            data={comparison.kalshi}
            isBest={comparison.best_platform === "kalshi"}
          />
        )}
        {comparison.limitless && (
          <MarketCard
            platform="limitless"
            data={comparison.limitless}
            isBest={comparison.best_platform === "limitless"}
          />
        )}
      </div>
    </div>
  );
}
