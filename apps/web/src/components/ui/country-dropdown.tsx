"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { countries } from "country-data-list";
import { CheckIcon, ChevronDown, Globe } from "lucide-react";
import type React from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CircleFlag } from "react-circle-flags";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface Country {
  alpha2: string;
  alpha3: string;
  countryCallingCodes: string[];
  currencies: string[];
  emoji?: string;
  ioc: string;
  languages: string[];
  name: string;
  status: string;
}

interface CountryDropdownProps {
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (countryName: string) => void;
  options?: Country[];
  placeholder?: string;
  slim?: boolean;
}

const CountryDropdownComponent = (
  {
    options = countries.all.filter(
      (country: Country) =>
        country.emoji && country.status !== "deleted" && country.ioc !== "PRK",
    ),
    onChange,
    defaultValue,
    disabled = false,
    placeholder = "Select a country",
    slim = false,
    ...props
  }: CountryDropdownProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
) => {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(
    undefined,
  );
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (defaultValue) {
      // Try to find by alpha3 code first, then by name
      let initialCountry = options.find(
        (country) => country.alpha3 === defaultValue,
      );

      if (!initialCountry) {
        initialCountry = options.find(
          (country) =>
            country.name.toLowerCase() === defaultValue.toLowerCase(),
        );
      }

      if (initialCountry) {
        setSelectedCountry(initialCountry);
      } else {
        // Reset selected country if defaultValue is not found
        setSelectedCountry(undefined);
      }
    } else {
      // Reset selected country if defaultValue is undefined or null
      setSelectedCountry(undefined);
    }
  }, [defaultValue, options]);

  useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  const handleSelect = useCallback(
    (country: Country) => {
      setSelectedCountry(country);
      onChange?.(country.name);
      setOpen(false);
    },
    [onChange],
  );

  const normalizedOptions = useMemo(
    () =>
      options.filter(
        (country) => country.name && country.alpha2 && country.emoji,
      ),
    [options],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return normalizedOptions;
    }

    return normalizedOptions.filter(
      (country) =>
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.alpha3.toLowerCase().includes(normalizedQuery) ||
        country.alpha2.toLowerCase().includes(normalizedQuery) ||
        country.countryCallingCodes.some((code) =>
          code.toLowerCase().includes(normalizedQuery),
        ),
    );
  }, [normalizedOptions, searchValue]);

  const listRef = useRef<HTMLDivElement>(null);

  const initialVirtualRect = useMemo(
    () => ({
      height: slim ? 180 : 240,
      width: 0,
    }),
    [slim],
  );

  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => (slim ? 36 : 44),
    overscan: 8,
    initialRect: initialVirtualRect,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const shouldRenderFallback =
    filteredOptions.length > 0 && virtualItems.length === 0;

  const triggerClasses = cn(
    "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-primary text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
    slim === true && "w-20",
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        className={triggerClasses}
        disabled={disabled}
        ref={ref}
        type="button"
        {...props}
      >
        {selectedCountry ? (
          <div className="flex w-0 grow items-center gap-2 overflow-hidden">
            <div className="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <CircleFlag
                countryCode={selectedCountry.alpha2.toLowerCase()}
                height={20}
              />
            </div>
            {slim === false && (
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {selectedCountry.name}
              </span>
            )}
          </div>
        ) : (
          <span>{slim === false ? placeholder : <Globe size={20} />}</span>
        )}
        <ChevronDown size={16} />
      </PopoverTrigger>
      <PopoverContent
        className="min-w-[--radix-popper-anchor-width] p-0"
        collisionPadding={10}
        side="bottom"
      >
        <Command className="max-h-[300px] w-full" shouldFilter={false}>
          <div className="border-b bg-popover">
            <CommandInput
              onValueChange={setSearchValue}
              placeholder="Search country..."
              value={searchValue}
            />
          </div>
          <CommandList>
            {filteredOptions.length === 0 ? (
              <CommandEmpty>No country found.</CommandEmpty>
            ) : (
              <div className="max-h-[240px] overflow-y-auto" ref={listRef}>
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    position: "relative",
                    width: "100%",
                  }}
                >
                  {(shouldRenderFallback
                    ? filteredOptions.slice(0, 20).map((option, index) => ({
                        key: option.alpha3 || option.alpha2,
                        index,
                        size: slim ? 36 : 44,
                        start: (slim ? 36 : 44) * index,
                        option,
                      }))
                    : virtualItems.map((virtualItem) => ({
                        key:
                          filteredOptions[virtualItem.index]?.alpha3 ||
                          filteredOptions[virtualItem.index]?.alpha2,
                        index: virtualItem.index,
                        size: virtualItem.size,
                        start: virtualItem.start,
                        option: filteredOptions[virtualItem.index],
                      }))
                  )
                    .filter((item) => item.option)
                    .map(({ key, option, size, start }) => {
                      const commandValue = [
                        option.name,
                        option.alpha2,
                        option.alpha3,
                        ...option.countryCallingCodes,
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <CommandItem
                          className="flex w-full items-center gap-2"
                          key={key}
                          onSelect={() => handleSelect(option)}
                          style={{
                            height: `${size}px`,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${start}px)`,
                          }}
                          value={commandValue}
                        >
                          <div className="flex w-0 grow items-center gap-2 overflow-hidden">
                            <span className="text-base">{option.emoji}</span>
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                              {option.name}
                            </span>
                          </div>
                          <CheckIcon
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0",
                              option.name === selectedCountry?.name
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                </div>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

CountryDropdownComponent.displayName = "CountryDropdownComponent";

export const CountryDropdown = forwardRef(CountryDropdownComponent);
