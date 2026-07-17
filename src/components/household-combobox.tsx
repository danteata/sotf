"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface HouseholdOption {
  _id: string
  name: string
  members: Array<{ _id: string }>
}

interface HouseholdComboboxProps {
  households: HouseholdOption[] | undefined
  value: string
  onSelect: (householdId: string) => void
  placeholder?: string
  className?: string
}

/** Searchable single-select for picking a household — a Command/Popover
 * combobox rather than a plain Select, since a real org can have dozens of
 * households and scrolling a flat dropdown doesn't scale. */
export function HouseholdCombobox({
  households,
  value,
  onSelect,
  placeholder = "Choose a household…",
  className,
}: HouseholdComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = households?.find((h) => h._id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="flex items-center gap-2 truncate">
            <Home className="h-4 w-4 text-muted-foreground shrink-0" />
            {selected ? (
              <span className="truncate">
                {selected.name} ({selected.members.length})
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search households…" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {households === undefined ? "Loading…" : "No households found."}
            </CommandEmpty>
            <CommandGroup>
              {households?.map((h) => (
                <CommandItem
                  key={h._id}
                  value={h.name}
                  onSelect={() => {
                    onSelect(h._id)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === h._id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">{h.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {h.members.length}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
