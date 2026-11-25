"use client";
import { useRef, useState } from "react";
import { AddressData, formatAddress } from "@gferraz/shared";
import { api } from "./api";

const maskCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
};

/** Address by CEP: typing the eight digits fills street, district, city and state. Every field stays editable. */
export function AddressFields({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: AddressData;
  onChange: (next: AddressData) => void;
}) {
  const [status, setStatus] = useState<{
    kind: "idle" | "loading" | "found" | "error";
    text: string;
  }>({ kind: "idle", text: "" });
  const latest = useRef(value);
  latest.current = value;
  const searched = useRef(value.cep.replace(/\D/g, ""));
  const numberInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<AddressData>) =>
    onChange({ ...latest.current, ...patch });

  async function lookup(digits: string) {
    searched.current = digits;
    setStatus({ kind: "loading", text: "Buscando endereço…" });
    try {
      const found = await api(`cep/${digits}`);
      // Ignore an answer for a CEP that is no longer the one typed.
      if (latest.current.cep.replace(/\D/g, "") !== digits) return;
      set({
        cep: found.cep,
        street: found.street || latest.current.street,
        district: found.district || latest.current.district,
        city: found.city,
        state: found.state,
      });
      setStatus({
        kind: "found",
        text: found.street
          ? "Endereço preenchido. Informe o número."
          : "Cidade preenchida. Este CEP não traz a rua: complete o endereço.",
      });
      numberInput.current?.focus();
    } catch (e) {
      setStatus({ kind: "error", text: (e as Error).message });
    }
  }
  const text = (
    key: keyof AddressData,
    label: string,
    props: React.ComponentProps<"input"> = {},
  ) => (
    <label className={`address-${key}`}>
      {label}
      <input
        aria-label={label}
        value={value[key]}
        onChange={(e) => set({ [key]: e.target.value })}
        {...props}
      />
    </label>
  );
  const line = formatAddress(value);
  return (
    <fieldset className="address">
      <legend>{legend}</legend>
      <div className="address-grid">
        <label className="address-cep">
          CEP
          <input
            aria-label="CEP"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            maxLength={9}
            value={value.cep}
            onChange={(e) => {
              const cep = maskCep(e.target.value);
              set({ cep });
              const digits = cep.replace(/\D/g, "");
              if (digits.length === 8 && digits !== searched.current)
                lookup(digits);
              if (digits.length < 8) {
                searched.current = "";
                setStatus({ kind: "idle", text: "" });
              }
            }}
          />
        </label>
        {text("street", "Rua / avenida", { autoComplete: "address-line1" })}
        {text("number", "Número", { ref: numberInput, inputMode: "numeric" })}
        {text("complement", "Complemento", {
          placeholder: "Apto, bloco, salão…",
        })}
        {text("district", "Bairro")}
        {text("city", "Cidade", { autoComplete: "address-level2" })}
        {text("state", "UF", {
          maxLength: 2,
          autoComplete: "address-level1",
          onChange: (e) => set({ state: e.target.value.toUpperCase() }),
        })}
      </div>
      <p
        role="status"
        className={`address-status ${status.kind === "error" ? "is-error" : ""}`}
      >
        {status.text ||
          (line
            ? `Endereço completo: ${line}`
            : "Digite o CEP para preencher o endereço automaticamente.")}
      </p>
    </fieldset>
  );
}
