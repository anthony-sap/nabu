import { useEffect, useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";

export interface DataTableHeaderSearchProps {
  initialValue?: string;
  onChange?: (value: string) => void;
}

export function DataTableHeaderSearch({
  initialValue,
  onChange,
}: DataTableHeaderSearchProps) {
  const [searchText, setSearchText] = useState(initialValue ?? "");
  const { debounceFunction } = useDebounce();

  useEffect(() => {
    setSearchText(initialValue ?? "");
  }, [initialValue]);

  return (
    <Input
      placeholder="Search..."
      value={searchText}
      onChange={(event) => {
        const value = event?.target?.value || "";
        setSearchText(value);
        if (onChange) {
          debounceFunction({
            callback: () => {
              onChange(value);
            },
            delay: 400,
          });
        }
      }}
      className="max-w-xs"
    />
  );
}
