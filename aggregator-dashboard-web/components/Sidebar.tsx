"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutGrid, Clock, Menu } from "lucide-react"

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="bg-black text-white w-16 flex flex-col items-center py-4 space-y-8">
      <button className="text-gray-400 hover:text-white">
        <Menu size={24} />
      </button>
      <div className="flex flex-col items-center space-y-6">
        <Link href="/">
          <div
            className={`p-2 rounded-lg ${
              pathname === "/" ? "bg-white text-black" : "text-gray-400"
            } hover:bg-gray-700 hover:text-white`}
          >
            <LayoutGrid size={24} />
          </div>
        </Link>
        <Link href="/history">
          <div
            className={`p-2 rounded-lg ${
              pathname === "/history" ? "bg-white text-black" : "text-gray-400"
            } hover:bg-gray-700 hover:text-white`}
          >
            <Clock size={24} />
          </div>
        </Link>
      </div>
    </aside>
  )
}
