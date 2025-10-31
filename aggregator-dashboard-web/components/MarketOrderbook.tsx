interface OrderbookEntry {
  price: string
  amount: string
  total: string
}

interface MarketOrderbookProps {
  platform: string
  status: "Active" | "Inactive"
  liquidity: string
  volume: string
  yesPercentage: number
  noPercentage: number
  orderbook?: OrderbookEntry[]
}

const defaultOrderbook: OrderbookEntry[] = [
  { price: "4034.89", amount: "10.00", total: "12.22" },
  { price: "4034.89", amount: "10.00", total: "12.22" },
  { price: "4034.89", amount: "10.00", total: "12.22" },
  { price: "4034.89", amount: "10.00", total: "12.22" },
  { price: "4034.89", amount: "10.00", total: "12.22" },
  { price: "4034.89", amount: "10.00", total: "12.22" }
]

export default function MarketOrderbook({
  platform,
  status,
  liquidity,
  volume,
  yesPercentage,
  noPercentage,
  orderbook = defaultOrderbook
}: MarketOrderbookProps) {
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Platform Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{platform}</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-400 text-sm">{status}</span>
          </div>
        </div>

        {/* Liquidity and Volume */}
        <div className="space-y-2 mb-4">
          <div>
            <div className="text-xs text-gray-400">Liquidity</div>
            <div className="text-sm font-medium">{liquidity}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Volume</div>
            <div className="text-sm font-medium">{volume}</div>
          </div>
        </div>

        {/* Yes/No Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold text-sm">
            Yes ({yesPercentage}%)
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold text-sm">
            No ({noPercentage}%)
          </button>
        </div>
      </div>

      {/* Order Book */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium">Order Book</h4>
          <div className="flex items-center gap-2">
            <button className="text-gray-400 hover:text-white">
              <span className="text-xs">−</span> 0.01 <span className="text-xs">+</span>
            </button>
            <button className="text-gray-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Order Book Table */}
        <div className="bg-black rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-2 px-3">PRICE</th>
                <th className="text-center py-2 px-3">AMOUNT</th>
                <th className="text-right py-2 px-3">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {orderbook.map((entry, index) => (
                <tr key={index} className="border-b border-gray-800">
                  <td className="py-1 px-3 text-red-400 font-mono">{entry.price}</td>
                  <td className="py-1 px-3 text-center font-mono">{entry.amount}</td>
                  <td className="py-1 px-3 text-right font-mono">{entry.total}</td>
                </tr>
              ))}
              {/* Spread indicator */}
              <tr>
                <td colSpan={3} className="py-2 px-3 text-center">
                  <div className="bg-red-900 text-red-400 text-xs py-1 px-2 rounded flex items-center justify-center gap-1">
                    <span className="font-mono">4034.89</span>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </td>
              </tr>
              {/* Green entries below spread */}
              <tr className="border-b border-gray-800">
                <td className="py-1 px-3 text-green-400 font-mono">4034.89</td>
                <td className="py-1 px-3 text-center font-mono">10.00</td>
                <td className="py-1 px-3 text-right font-mono">12.22</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-1 px-3 text-green-400 font-mono">4034.89</td>
                <td className="py-1 px-3 text-center font-mono">10.00</td>
                <td className="py-1 px-3 text-right font-mono">12.22</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
