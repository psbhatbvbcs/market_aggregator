"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutGrid, Clock, Menu } from "lucide-react"

export default function Sidebar() {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <aside className={`bg-black text-white flex flex-col py-4 transition-all duration-300 ${
      isExpanded ? "w-64" : "w-16"
    }`}>
      <div className={`${isExpanded ? "px-4" : ""} flex ${isExpanded ? "justify-start" : "justify-center"} mb-8`}>
        <button 
          onClick={toggleSidebar}
          className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700"
        >
          <Menu size={24} />
        </button>
      </div>
      
      <div className={`flex flex-col ${isExpanded ? "items-start px-4" : "items-center"} space-y-6`}>
        <Link href="/" className={isExpanded ? "w-full" : ""}>
          <div
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              pathname === "/" ? "bg-white text-black" : "text-gray-400"
            } hover:bg-gray-700 hover:text-white ${isExpanded ? "w-full justify-start" : "justify-center"}`}
          >
            <LayoutGrid size={24} />
            {isExpanded && <span className="text-sm font-medium">Dashboard</span>}
          </div>
        </Link>
        
        <Link href="/history" className={isExpanded ? "w-full" : ""}>
          <div
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              pathname === "/history" ? "bg-white text-black" : "text-gray-400"
            } hover:bg-gray-700 hover:text-white ${isExpanded ? "w-full justify-start" : "justify-center"}`}
          >
            <Clock size={24} />
            {isExpanded && <span className="text-sm font-medium">Historical Data</span>}
          </div>
        </Link>
      </div>
    </aside>
  )
}
