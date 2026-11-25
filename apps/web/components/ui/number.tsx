"use client";
import { useEffect, useState, type KeyboardEvent } from "react";

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

/** Types "0130" as "01:30": digits only, colon after the hours, at most 4 digits. */
export function maskHhmm(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, d.length - 2)}:${d.slice(-2)}`;
}
/** "1:30", "01:30", "130" or "90" (minutes) to minutes; null when empty or invalid. */
export function parseHhmm(v: string) {
  const t = v.trim();
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const d = t.replace(/\D/g, "");
  if (!d) return null;
  // Up to two digits is a number of minutes; more is hours and minutes.
  return d.length <= 2
    ? Number(d)
    : Number(d.slice(0, -2)) * 60 + Number(d.slice(-2));
}

/**
 * Duration as hours:minutes (00:00), kept as minutes. A plain text box with a mask, so it reads
 * the same on every phone and computer (the native time field shows AM/PM in some languages).
 * Arrow keys add or remove 5 minutes.
 */
export function DurationInput({
  label,
  value,
  onChange,
  hint,
  action,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (minutes: number | null) => void;
  hint?: string;
  action?: { label: string; onClick: () => void };
}) {
  const [text, setText] = useState(toHhmm(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(toHhmm(value));
  }, [value, editing]);
  const commit = (t: string) => {
    const m = parseHhmm(t);
    onChange(m === null ? null : Math.min(m, 1440));
  };
  return (
    <label>
      {label}
      <input
        aria-label={label}
        inputMode="numeric"
        placeholder="00:00"
        maxLength={5}
        value={text}
        onFocus={() => setEditing(true)}
        onChange={(e) => {
          const t = maskHhmm(e.target.value);
          setText(t);
          commit(t);
        }}
        onBlur={() => {
          setEditing(false);
          setText(toHhmm(value));
        }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          const next = Math.max(
            0,
            Math.min(1440, (value ?? 0) + (e.key === "ArrowUp" ? 5 : -5)),
          );
          onChange(next);
          setText(toHhmm(next));
        }}
      />
      {(hint || action) && (
        <small>
          {hint}{" "}
          {action && (
            <button type="button" className="link" onClick={action.onClick}>
              {action.label}
            </button>
          )}
        </small>
      )}
    </label>
  );
}

/** `value` after it stops changing for `ms` milliseconds (compared by content). */
export function useDebounced<T>(value: T, ms = 300): T {
  const key = JSON.stringify(value);
  const [settled, setSettled] = useState(key);
  useEffect(() => {
    const t = setTimeout(() => setSettled(key), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return JSON.parse(settled ?? "null") as T;
}
