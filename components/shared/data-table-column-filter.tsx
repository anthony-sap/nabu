import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface DataTableColumnFilterProps {
  title: string;
  options?: Array<{ label: string; value: string }>;
  getOptions?: (
    searchQuery?: string,
  ) => Promise<Array<{ label: string; value: string }>>;
  selectedValue?: string;
  onValueChange: (value: string | undefined) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  defaultOption?: { label: string; value: string };
}

export function DataTableColumnFilter({
  title,
  options: staticOptions,
  getOptions,
  selectedValue,
  onValueChange,
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  defaultOption,
}: DataTableColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [dynamicOptions, setDynamicOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Use static options if provided, otherwise use dynamic options
  const options = staticOptions || dynamicOptions;

  // Load initial options when popover opens
  useEffect(() => {
    if (open && getOptions && !staticOptions && !hasLoaded) {
      setIsLoading(true);
      getOptions()
        .then((options) => {
          setDynamicOptions(options);
          setHasLoaded(true);
        })
        .catch((error) => {
          console.error("Failed to load options:", error);
          setDynamicOptions([]);
          setHasLoaded(true);
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, getOptions, staticOptions, hasLoaded]);

  // Debounced search effect
  useEffect(() => {
    if (!open || !getOptions || !hasLoaded || !searchValue) return;

    const timeoutId = setTimeout(() => {
      setIsLoading(true);
      getOptions(searchValue)
        .then(setDynamicOptions)
        .catch((error) => {
          console.error("Failed to search options:", error);
        })
        .finally(() => setIsLoading(false));
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchValue, open, getOptions, hasLoaded]);

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setSearchValue("");
      setHasLoaded(false);
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    // If we have static options, filter them locally
    if (staticOptions) {
      if (!searchValue) return staticOptions;
      return staticOptions.filter((option) =>
        option.label.toLowerCase().includes(searchValue.toLowerCase()),
      );
    }
    // If we have dynamic options, return them as-is (they're already filtered by the server)
    return dynamicOptions;
  }, [staticOptions, dynamicOptions, searchValue]);

  const selectedOption =
    options.find((option) => option.value === selectedValue) ||
    (selectedValue && defaultOption && defaultOption.value === selectedValue
      ? defaultOption
      : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[220px] justify-between", className)}
        >
          {selectedOption ? (
            <div className="flex items-center gap-2">
              <span className="truncate">{selectedOption.label}</span>
              <Badge variant="secondary" className="ml-auto">
                {title}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">Filter by {title}</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="ml-2">Loading...</span>
                </div>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              <ScrollArea className="max-h-[200px]">
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      const newValue =
                        currentValue === selectedValue
                          ? undefined
                          : currentValue;
                      onValueChange(newValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        selectedValue === option.value
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
