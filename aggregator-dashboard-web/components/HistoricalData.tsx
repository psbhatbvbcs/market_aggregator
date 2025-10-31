import { Search } from "lucide-react"

const mockData = [
  {
    prediction: "What did say as a kid when asked...",
    venue: "Kalshi",
    yesMid: "234c",
    yesBid: "234c",
    yesAsk: "234c",
    noMid: "234c",
    noBid: "234c",
    noAsk: "234c",
    spread: "234c",
    volume: "234c",
    oi: "234c",
  },
  {
    prediction: "What's your very first memory?",
    venue: "Limitless",
    yesMid: "121c",
    yesBid: "121c",
    yesAsk: "121c",
    noMid: "121c",
    noBid: "121c",
    noAsk: "121c",
    spread: "121c",
    volume: "121c",
    oi: "121c",
  },
  {
    prediction: "If you could visit one planet, whic...",
    venue: "Polymarket",
    yesMid: "-",
    yesBid: "623c",
    yesAsk: "623c",
    noMid: "623c",
    noBid: "623c",
    noAsk: "623c",
    spread: "-",
    volume: "623c",
    oi: "623c",
  },
  {
    prediction: "What makes you happiest?",
    venue: "Kalshi",
    yesMid: "190c",
    yesBid: "190c",
    yesAsk: "190c",
    noMid: "-",
    noBid: "190c",
    noAsk: "-",
    spread: "190c",
    volume: "190c",
    oi: "190c",
  },
]

export default function HistoricalData() {
  return (
    <div className="bg-black text-white p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Historical Data</h1>
        <button className="bg-gray-800 text-white px-4 py-2 rounded-lg">
          Connect Wallet
        </button>
      </div>
      <div className="flex items-center mb-6 space-x-8">
        <div className="flex space-x-6 border-b border-gray-700">
          <button className="text-white pb-2 border-b-2 border-white">
            All Markets
          </button>
          <button className="text-gray-400 pb-2">Sports</button>
          <button className="text-gray-400 pb-2">Crypto</button>
          <button className="text-gray-400 pb-2">Politics</button>
          <button className="text-gray-400 pb-2">GeoPolitics</button>
          <button className="text-gray-400 pb-2">Others</button>
        </div>
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Markets or Predictions"
            className="bg-gray-800 text-white w-full pl-10 pr-4 py-2 rounded-lg"
          />
        </div>
        <div className="relative">
          <select className="bg-gray-800 text-white px-4 py-2 rounded-lg appearance-none">
            <option>Kalshi + Polymarket + 1</option>
          </select>
        </div>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="py-2">Predictions</th>
            <th>Venue</th>
            <th>Yes Mid</th>
            <th>Yes Bid</th>
            <th>Yes Ask</th>
            <th>No Mid</th>
            <th>No Bid</th>
            <th>No Ask</th>
            <th>Spread</th>
            <th>Volume</th>
            <th>OI</th>
          </tr>
        </thead>
        <tbody>
          {mockData.map((row, i) => (
            <tr key={i} className="border-b border-gray-800">
              <td className="py-4">{row.prediction}</td>
              <td>{row.venue}</td>
              <td>{row.yesMid}</td>
              <td>{row.yesBid}</td>
              <td>{row.yesAsk}</td>
              <td>{row.noMid}</td>
              <td>{row.noBid}</td>
              <td>{row.noAsk}</td>
              <td>{row.spread}</td>
              <td>{row.volume}</td>
              <td>{row.oi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
