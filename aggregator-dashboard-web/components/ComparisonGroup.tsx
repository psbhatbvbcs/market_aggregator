"use client";

import { Comparison } from "@/lib/market-types";
import { AlertCircle } from "lucide-react";

interface ComparisonGroupProps {
  comparison: Comparison;
}

export default function ComparisonGroup({ comparison }: ComparisonGroupProps) {
  // Determine category based on title or other context
  const getCategory = () => {
    if (comparison.title.toLowerCase().includes('nfl') || 
        comparison.title.toLowerCase().includes('vikings') ||
        comparison.title.toLowerCase().includes('chiefs') ||
        comparison.title.toLowerCase().includes('eagles')) {
      return 'NFL';
    }
    if (comparison.title.toLowerCase().includes('trump') || 
        comparison.title.toLowerCase().includes('harris') ||
        comparison.title.toLowerCase().includes('election') ||
        comparison.title.toLowerCase().includes('lord miles')) {
      return 'Politics';
    }
    return null;
  };

  const category = getCategory();

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

      {/* Platforms Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>
        )}
      </div>
    </div>
  );
}

