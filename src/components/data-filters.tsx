"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";

export interface FilterConfig {
  key: string;
  label: string;
  type: "select";
  options: { value: string; label: string }[];
}

interface DataFiltersProps {
  filters: FilterConfig[];
  onFiltersChange: (filters: Record<string, string>) => void;
}

export function DataFilters({ filters, onFiltersChange }: DataFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const handleFilterChange = (key: string, value: string) => {
    const next = { ...activeFilters };
    if (value && value !== "__ALL__") next[key] = value;
    else delete next[key];
    setActiveFilters(next);
    onFiltersChange(next);
  };

  const handleClear = () => {
    setActiveFilters({});
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="w-4 h-4 text-muted-foreground" />
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={activeFilters[filter.key] || ""}
          onValueChange={(value) => handleFilterChange(filter.key, value)}
        >
          <SelectTrigger aria-label={filter.label} className="h-8 w-[180px] text-sm">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Vše</SelectItem>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleClear}>
          <X className="w-3 h-3 mr-1" />
          Vymazat filtry
        </Button>
      )}
    </div>
  );
}
