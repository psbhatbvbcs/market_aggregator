"use client"

import { Comparison, CryptoComparison } from "@/lib/market-types"
import MarketOrderbook from "./MarketOrderbook"

interface MarketWithOrderbookProps {
  comparison: Comparison | CryptoComparison
}

export default function MarketWithOrderbook({ comparison }: MarketWithOrderbookProps) {
  // Determine category based on title or other context
  const getCategory = () => {
    if (comparison.title.toLowerCase().includes('nfl') || 
        comparison.title.toLowerCase().includes('vikings') ||
        comparison.title.toLowerCase().includes('chiefs') ||
        comparison.title.toLowerCase().includes('eagles')) {
      return 'NFL'
    }
    if (comparison.title.toLowerCase().includes('trump') || 
        comparison.title.toLowerCase().includes('harris') ||
        comparison.title.toLowerCase().includes('election') ||
        comparison.title.toLowerCase().includes('lord miles')) {
      return 'Politics'
    }
    return 'Other'
  }

  const category = getCategory()

  // Get mock data for platforms
  const getPlatformData = (platform: "Polymarket" | "Kalshi" | "Limitless") => {
    if (platform === "Polymarket" && comparison.polymarket) {
      return {
        liquidity: "$5.4M",
        volume: "$354K", 
        yesPercentage: Math.round((comparison.polymarket.outcomes[0]?.price || 0.5) * 100),
        noPercentage: Math.round((comparison.polymarket.outcomes[1]?.price || 0.5) * 100)
      }
    }
    
    if (platform === "Kalshi" && comparison.kalshi) {
      return {
        liquidity: "$3.4M",
        volume: "$128K",
        yesPercentage: Math.round((comparison.kalshi.outcomes[0]?.price || 0.5) * 100),
        noPercentage: Math.round((comparison.kalshi.outcomes[1]?.price || 0.5) * 100)
      }
    }

    if (platform === "Limitless" && 'limitless' in comparison && comparison.limitless) {
      return {
        liquidity: "$2.1M", 
        volume: "$95K",
        yesPercentage: Math.round((comparison.limitless.outcomes[0]?.price || 0.5) * 100),
        noPercentage: Math.round((comparison.limitless.outcomes[1]?.price || 0.5) * 100)
      }
    }

    // Default data
    return {
      liquidity: "$2.1M", 
      volume: "$95K",
      yesPercentage: 72,
      noPercentage: 28
    }
  }

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
      {/* Market Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
            9
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-1">{comparison.title}</h2>
            <span className="text-gray-400 text-sm">{category}</span>
            
            {/* Arbitrage Alert */}
            {comparison.arbitrage_opportunity && (
              <div className="mt-2 text-sm text-yellow-400 font-semibold flex items-center gap-2">
                <span>⚡</span>
                Arbitrage Opportunity (Spread: {comparison.price_spread.toFixed(2)}%)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orderbook Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Polymarket Orderbook */}
          {comparison.polymarket && (
            <MarketOrderbook
              platform="Polymarket"
              status="Active"
              {...getPlatformData("Polymarket")}
            />
          )}

          {/* Kalshi Orderbook */}
          {comparison.kalshi && (
            <MarketOrderbook
              platform="Kalshi"
              status="Active"
              {...getPlatformData("Kalshi")}
            />
          )}

          {/* Limitless Orderbook */}
          {'limitless' in comparison && comparison.limitless && (
            <MarketOrderbook
              platform="Limitless"
              status="Active"
              {...getPlatformData("Limitless")}
            />
          )}
        </div>
      </div>
    </div>
  )
}
