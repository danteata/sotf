"use client"

import { Input } from "@/components/ui/input"
import { SearchIcon } from "lucide-react"

export function Search() {
  return (
    <div className="relative w-full max-w-sm">
      <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input type="search" placeholder="Search or type" className="w-full pl-8 bg-[#F5F4F6] rounded-md" /> {/* updated search bar style and placeholder */}
    </div>
  )
}
