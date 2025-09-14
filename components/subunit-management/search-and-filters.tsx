'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Grid3X3, List } from 'lucide-react'

interface SearchAndFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterType: 'all' | 'administrative' | 'ministry'
  onFilterTypeChange: (value: 'all' | 'administrative' | 'ministry') => void
  filterInheritance: 'all' | 'direct' | 'inherited' | 'template'
  onFilterInheritanceChange: (value: 'all' | 'direct' | 'inherited' | 'template') => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
}

export function SearchAndFilters({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterInheritance,
  onFilterInheritanceChange,
  viewMode,
  onViewModeChange
}: SearchAndFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sub-units..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="administrative">Administrative</SelectItem>
                <SelectItem value="ministry">Ministry</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterInheritance} onValueChange={onFilterInheritanceChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="inherited">Inherited</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
