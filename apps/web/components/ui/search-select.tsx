"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchOption = { id: string; name: string; hint?: string };

/** Lower case without accents, so "aurea" finds "Áurea". */
export const searchKey = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * A select that can be typed into. Empty, it lists every option; typing filters the list
 * after a short pause. The value is always one of the options' ids (or "").
 */
export function SearchSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Digite para buscar",
  delay = 200,
}: {
  label: string;
  options: SearchOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  delay?: number;
}) {
  const id = useId();
  const selected = options.find((o) => o.id === value);
  const [text, setText] = useState(selected?.name ?? "");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  // Keep the box in sync when the value is changed from outside (e.g. a reset or a late load).
  useEffect(() => {
    if (!open) setText(selected?.name ?? "");
  }, [selected?.name, open]);

  // Debounce: filter only after the user pauses typing.
  useEffect(() => {
    const t = setTimeout(() => setTerm(text), delay);
    return () => clearTimeout(t);
  }, [text, delay]);

  const shown = useMemo(() => {
    const k = searchKey(term);
    // While the box shows the chosen name, list everything instead of only that name.
    if (!k || (selected && term === selected.name)) return options;
    const digits = term.replace(/\D/g, "");
    return options.filter(
      (o) =>
        searchKey(o.name).includes(k) ||
        (digits.length >= 3 &&
          (o.hint || "").replace(/\D/g, "").includes(digits)),
    );
  }, [term, options, selected]);

  function pick(o: SearchOption | undefined) {
    if (!o) return;
    onChange(o.id);
    setText(o.name);
    setTerm(o.name);
    setOpen(false);
  }

  return (
    <div
      className="search-select"
      ref={box}
      onBlur={(e) => {
        if (box.current?.contains(e.relatedTarget as Node)) return;
        setOpen(false);
        // Leaving the box with unfinished text restores the chosen name.
        setText(selected?.name ?? "");
      }}
    >
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id + "-list"}
        aria-autocomplete="list"
        aria-activedescendant={
          open && shown[active] ? `${id}-${active}` : undefined
        }
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onFocus={(e) => {
          setOpen(true);
          setActive(0);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
          if (!e.target.value) onChange("");
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            pick(shown[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setText(selected?.name ?? "");
          }
        }}
      />
      {open && (
        <ul id={id + "-list"} role="listbox" className="search-select-list">
          {shown.length === 0 && (
            <li className="muted" aria-disabled="true">
              Nada encontrado para “{text}”
            </li>
          )}
          {shown.map((o, i) => (
            <li
              key={o.id}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.id === value}
              className={i === active ? "active" : undefined}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
            >
              {o.name}
              {o.hint && <small>{o.hint}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
