"use client";
import type { KeyboardEvent } from "react";

/** Keys that would let a number field hold a negative or an exponent ("-", "+", "e"). */
export function blockSigns(e: KeyboardEvent<HTMLInputElement>) {
  if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
}

/** Spread on every amount, quantity or distance field: no negatives by keyboard or spinner. */
export const nonNegative = { min: 0, onKeyDown: blockSigns } as const;

export const toHhmm = (minutes: number | null | undefined) =>
  minutes === null || minutes === undefined || Number.isNaN(minutes)
    ? ""
    : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const fromHhmm = (v: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Duration typed or picked as hours:minutes (00:00) and kept as minutes. */
export function DurationInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (minutes: number | null) => void;
  hint?: string;
}) {
  return (
    <label>
      {label}
      <input
        type="time"
        aria-label={label}
        step={60}
        value={toHhmm(value)}
        onChange={(e) => onChange(fromHhmm(e.target.value))}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
