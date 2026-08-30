import { useEffect, useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { searchCoastalZones, type LazioCoastalZone } from "../lib/lazioCoastalZones";

type CoastalZoneComboboxProps = {
  value: string;
  provinceCode: string;
  onChange: (value: string, provinceCode?: string) => void;
};

export function CoastalZoneCombobox({ value, provinceCode, onChange }: CoastalZoneComboboxProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestions = useMemo(
    () => searchCoastalZones(value, value.trim() ? "" : provinceCode),
    [provinceCode, value],
  );

  useEffect(() => setActiveIndex(-1), [value]);

  function choose(zone: LazioCoastalZone) {
    onChange(zone.value, zone.provinceCode);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current < suggestions.length - 1 ? current + 1 : 0);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current > 0 ? current - 1 : suggestions.length - 1);
    } else if (event.key === "Enter" && open && suggestions.length) {
      event.preventDefault();
      choose(suggestions[activeIndex >= 0 ? activeIndex : 0]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showOptions = open && suggestions.length > 0;
  return (
    <div
      className="zone-combobox"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <input
        aria-activedescendant={showOptions && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={showOptions}
        autoComplete="off"
        maxLength={160}
        placeholder="Scrivi, es. Ostia o Fregene"
        role="combobox"
        type="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {showOptions && (
        <div className="zone-combobox-options" id={listboxId} role="listbox">
          {suggestions.map((zone, index) => (
            <button
              className={`zone-combobox-option ${index === activeIndex ? "is-active" : ""}`}
              id={`${listboxId}-option-${index}`}
              key={`${zone.provinceCode}-${zone.value}`}
              role="option"
              aria-selected={index === activeIndex}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(zone)}
            >
              <strong>{zone.value}</strong>
              <span>{zone.municipality} · {zone.provinceCode}</span>
            </button>
          ))}
        </div>
      )}
      <span className="field-help">Se non trovi la località, scrivila e controlla la provincia.</span>
    </div>
  );
}
