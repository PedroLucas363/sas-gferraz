"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Entity,
  entityLabels,
  clientSchema,
  serviceSchema,
  appointmentSchema,
  paymentSchema,
  expenseSchema,
  vehicleSchema,
  statusLabels,
  fieldLabels,
  AddressData,
  addressDataOf,
  formatAddress,
} from "@gferraz/shared";
import { api, allRows, brl, today, day } from "./api";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { AddressFields } from "./address-fields";
import { SearchSelect, searchKey } from "./ui/search-select";
import { DurationInput, nonNegative, blockSigns } from "./ui/number";
const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
const errorLabels: Record<string, string> = {
  ...fieldLabels,
  clientId: "Cliente",
  items: "Serviços contratados",
  allocations: "Distribuição entre atendimentos",
  title: "Nome do atendimento",
  startsAt: "Data e horário",
  receivedAt: "Data do recebimento",
  addressData: "Endereço",
  discount: "Desconto",
  extra: "Adicionais",
  actualDuration: "Duração realizada",
  kmPerLiter: "Consumo",
  fuelPrice: "Preço do combustível",
  annualKm: "Quilometragem anual",
  birthday: "Nascimento",
};
const schemas: any = {
  clients: clientSchema,
  services: serviceSchema,
  appointments: appointmentSchema,
  payments: paymentSchema,
  expenses: expenseSchema,
  vehicles: vehicleSchema,
};
export function RecordForm({
  entity,
  id,
  onClose,
  initial = {},
}: {
  entity: Entity;
  id?: string;
  onClose: () => void;
  initial?: Record<string, unknown>;
}) {
  const record = useQuery({
    queryKey: ["record", entity, id],
    queryFn: () => api(`records/${entity}/${id}`),
    enabled: !!id,
  });
  return (
    <Dialog
      title={`${id ? "Editar" : "Novo registro"} · ${entityLabels[entity]}`}
      onClose={onClose}
    >
      {id && record.isLoading ? (
        <p>Carregando…</p>
      ) : record.error ? (
        <p className="error">{record.error.message}</p>
      ) : (
        <Editor
          key={id || entity}
          entity={entity}
          record={record.data}
          onClose={onClose}
          initial={initial}
        />
      )}
    </Dialog>
  );
}
function Editor({
  entity,
  record,
  onClose,
  initial,
}: {
  entity: Entity;
  record?: any;
  onClose: () => void;
  initial: Record<string, unknown>;
}) {
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const defaults: any = {
    clients: {
      name: "",
      phone: "",
      email: "",
      birthday: null,
      address: "",
      notes: "",
      preferences: "",
      consentPhotos: false,
      customFields: {},
    },
    services: {
      name: "",
      category: "Maquiagem",
      price: "0",
      duration: 60,
      description: "",
    },
    appointments: {
      clientId: "",
      eventId: null,
      title: "",
      startsAt: today() + "T10:00:00-03:00",
      duration: 60,
      actualDuration: null,
      address: "",
      status: "confirmed",
      discount: "0",
      extra: "0",
      travelFee: "0",
      dueDate: today(),
      notes: "",
      items: [{ serviceId: "", quantity: 1, unitPrice: "0" }],
    },
    payments: {
      clientId: "",
      receivedAt: today(),
      method: "Pix",
      fee: "0",
      notes: "",
      allocations: [{ appointmentId: "", amount: "0" }],
    },
    expenses: {
      description: "",
      category: "Produtos",
      amount: "0",
      incurredOn: today(),
      dueDate: today(),
      paidOn: null,
      kind: "variable",
      appointmentId: null,
      notes: "",
    },
    vehicles: {
      name: "",
      year: 2016,
      fuel: "Etanol",
      kmPerLiter: "7.4",
      fuelPrice: "0",
      annualKm: 15000,
      insurance: "0",
      maintenance: "0",
      tires: "0",
      oil: "0",
      tax: "0",
      depreciation: "0",
      other: "0",
    },
  };
  const values = { ...defaults[entity], ...record, ...initial };
  for (const key of [
    "birthday",
    "dueDate",
    "receivedAt",
    "incurredOn",
    "paidOn",
  ])
    if (values[key]) values[key] = values[key].slice(0, 10);
  // A free-text address saved before the CEP lookup existed becomes the street line.
  values.addressData = addressDataOf(values.addressData, values.address);
  const [address, setAddress] = useState<AddressData>(values.addressData);
  const form = useForm<any>({
    resolver: zodResolver(schemas[entity]) as any,
    defaultValues: values,
  });
  const items = useFieldArray({ control: form.control, name: "items" });
  const allocations = useFieldArray({
    control: form.control,
    name: "allocations",
  });
  const lookups = useQuery({
    queryKey: ["lookups"],
    queryFn: async () => ({
      clients: (await allRows("clients")).sort(byName),
      services: (await allRows("services")).sort(byName),
      appointments: await allRows("appointments"),
      events: await api("events"),
    }),
  });
  const serviceOptions = [...(lookups.data?.services || [])];
  for (const item of record?.items || [])
    if (!serviceOptions.some((s) => s.id === item.serviceId))
      serviceOptions.push({
        id: item.serviceId,
        name: item.serviceName + " (histórico)",
        price: item.unitPrice,
      });
  serviceOptions.sort(byName);
  const clientOptions = (lookups.data?.clients || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    hint: c.phone || undefined,
  }));
  function clientField(onPick?: (id: string) => void) {
    return (
      <SearchSelect
        label="Cliente"
        options={clientOptions}
        value={watch.clientId || ""}
        onChange={(id) => {
          form.setValue("clientId", id, { shouldValidate: true });
          onPick?.(id);
        }}
      />
    );
  }
  const watch = form.watch();
  // Date and time are typed apart and joined into startsAt (São Paulo, UTC-3, no daylight saving).
  const [when, setWhen] = useState(() => {
    const local = record
      ? new Date(new Date(record.startsAt).getTime() - 3 * 3600000)
          .toISOString()
          .slice(0, 16)
      : today() + "T10:00";
    return { date: local.slice(0, 10), time: local.slice(11, 16) };
  });
  useEffect(() => {
    if (entity === "appointments" && when.date && when.time)
      form.setValue("startsAt", `${when.date}T${when.time}:00-03:00`);
  }, [entity, form, when]);
  const [eventName, setEventName] = useState("");
  // Same rule as the server: case, accents and spacing do not make a new name.
  const nameKey = (v: string) => searchKey(v).replace(/\s+/g, " ");
  const eventTwin: { id: string; name: string } | undefined = eventName.trim()
    ? (lookups.data?.events || []).find(
        (e: { name: string }) => nameKey(e.name) === nameKey(eventName),
      )
    : undefined;
  function applyAddress(next: AddressData) {
    setAddress(next);
    form.setValue("addressData", next);
    form.setValue("address", formatAddress(next));
  }
  async function copyClientAddress(clientId: string) {
    if (!clientId) return;
    try {
      const c = await api(`records/clients/${clientId}`);
      applyAddress(addressDataOf(c.addressData, c.address));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  // "R$" sits inside the box so money fields line up with their neighbours.
  const money = (input: ReactNode) => (
    <span className="money-input">
      <span aria-hidden="true">R$</span>
      {input}
    </span>
  );
  function field(
    key: string,
    label: string,
    type = "text",
    opts?: { money?: boolean; required?: boolean },
  ) {
    const input = (
      <input
        aria-label={label}
        type={type}
        step={opts?.money ? "0.01" : key === "kmPerLiter" ? "0.001" : undefined}
        {...(type === "number" ? nonNegative : {})}
        {...form.register(key, {
          valueAsNumber: ["year", "annualKm"].includes(key),
          setValueAs: type === "date" ? (v) => v || null : undefined,
        })}
        required={opts?.required}
      />
    );
    return (
      <label key={key}>
        {label}
        {opts?.money ? money(input) : input}
      </label>
    );
  }
  function duration(key: string, label: string, nullable = false) {
    return (
      <DurationInput
        key={key}
        label={label}
        value={watch[key]}
        onChange={(m) =>
          form.setValue(key, m === null && !nullable ? 0 : m, {
            shouldValidate: true,
          })
        }
      />
    );
  }
  function select(
    key: string,
    label: string,
    options: any[],
    nullable = false,
    onPick?: (value: string) => void,
  ) {
    return (
      <label>
        {label}
        <select
          aria-label={label}
          {...form.register(key, {
            setValueAs: (v) => (nullable ? v || null : v),
            onChange: (e) => onPick?.(e.target.value),
          })}
        >
          <option value="">Selecione</option>
          {options.map((x) => (
            <option key={x.id || x[0]} value={x.id || x[0]}>
              {x.name || x[1]}
            </option>
          ))}
        </select>
      </label>
    );
  }
  async function submit(v: any) {
    setError("");
    setBusy(true);
    try {
      await api(`records/${entity}${record ? "/" + record.id : ""}`, {
        method: record ? "PATCH" : "POST",
        body: JSON.stringify(record ? { version: record.version, data: v } : v),
      });
      await cache.invalidateQueries();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} className="record-form">
      {entity === "clients" && (
        <>
          <div className="form-grid">
            {field("name", "Nome completo", "text", { required: true })}
            {field("phone", "Telefone / WhatsApp")}
            {field("email", "E-mail", "email")}
            {field("birthday", "Nascimento", "date")}
          </div>
          <AddressFields
            legend="Endereço"
            value={address}
            onChange={applyAddress}
          />
          <label>
            Preferências e sensibilidades autorizadas
            <textarea {...form.register("preferences")} />
          </label>
          <label className="check">
            <input type="checkbox" {...form.register("consentPhotos")} />
            Consentimento para armazenar fotografias privadas
          </label>
          <label>
            Campos personalizados (um campo por linha, no formato nome: valor)
            <textarea
              defaultValue={Object.entries(values.customFields)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")}
              onChange={(e) => {
                const obj: Record<string, string> = {};
                for (const l of e.target.value.split("\n")) {
                  const i = l.indexOf(":");
                  if (i > 0) obj[l.slice(0, i).trim()] = l.slice(i + 1).trim();
                }
                form.setValue("customFields", obj);
              }}
            />
          </label>
        </>
      )}
      {entity === "services" && (
        <>
          <div className="form-grid">
            {field("name", "Nome do serviço", "text", { required: true })}
            {field("category", "Categoria", "text", { required: true })}
            {field("price", "Preço de referência", "number", { money: true })}
            {duration("duration", "Duração prevista (horas:minutos)")}
          </div>
          <label>
            Descrição
            <textarea {...form.register("description")} />
          </label>
        </>
      )}
      {entity === "appointments" && (
        <>
          {
            // A new appointment starts at the client's own address.
            clientField(
              (id) => !formatAddress(address) && copyClientAddress(id),
            )
          }
          <div className="form-grid">
            {field("title", "Nome do atendimento", "text", { required: true })}
            <label>
              Data
              <input
                type="date"
                aria-label="Data"
                required
                value={when.date}
                onChange={(e) => setWhen({ ...when, date: e.target.value })}
              />
            </label>
            <label>
              Horário
              <input
                type="time"
                aria-label="Horário"
                required
                step={60}
                value={when.time}
                onChange={(e) => setWhen({ ...when, time: e.target.value })}
              />
            </label>
            {duration("duration", "Duração prevista (horas:minutos)")}
            {duration(
              "actualDuration",
              "Duração realizada (horas:minutos)",
              true,
            )}
            {select("status", "Situação", Object.entries(statusLabels))}
            {field("dueDate", "Vencimento do saldo", "date")}
          </div>
          <AddressFields
            legend="Endereço do atendimento"
            value={address}
            onChange={applyAddress}
          />
          {watch.clientId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => copyClientAddress(watch.clientId)}
            >
              Usar o endereço da cliente
            </Button>
          )}
          {select(
            "eventId",
            "Evento em grupo (opcional)",
            lookups.data?.events || [],
            true,
          )}
          <details>
            <summary>Criar um evento</summary>
            <div className="form-row">
              <input
                aria-label="Nome do evento"
                placeholder="Nome do evento"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!!eventTwin || eventName.trim().length < 2}
                onClick={async () => {
                  try {
                    const e = await api("events", {
                      method: "POST",
                      body: JSON.stringify({ name: eventName }),
                    });
                    await cache.invalidateQueries({ queryKey: ["lookups"] });
                    form.setValue("eventId", e.id);
                    setEventName("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Criar e vincular
              </Button>
            </div>
            {eventTwin && (
              <p role="alert" className="error">
                Já existe o evento “{eventTwin.name}”.{" "}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    form.setValue("eventId", eventTwin.id);
                    setEventName("");
                  }}
                >
                  Vincular a ele
                </Button>
              </p>
            )}
          </details>
          <h3>Serviços contratados</h3>
          {items.fields.map((f, i) => (
            <div className="item-row" key={f.id}>
              <label>
                Serviço
                <select
                  aria-label="Serviço"
                  {...form.register(`items.${i}.serviceId`)}
                  onChange={(e) => {
                    form.setValue(`items.${i}.serviceId`, e.target.value);
                    const s = serviceOptions.find(
                      (s) => s.id === e.target.value,
                    );
                    if (s) form.setValue(`items.${i}.unitPrice`, s.price);
                  }}
                >
                  <option value="">Selecione</option>
                  {serviceOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantidade
                <input
                  type="number"
                  min="1"
                  onKeyDown={blockSigns}
                  {...form.register(`items.${i}.quantity`, {
                    valueAsNumber: true,
                  })}
                />
              </label>
              <label>
                Valor unitário
                {money(
                  <input
                    type="number"
                    step="0.01"
                    {...nonNegative}
                    {...form.register(`items.${i}.unitPrice`)}
                  />,
                )}
              </label>
              <Button
                type="button"
                variant="ghost"
                onClick={() => items.remove(i)}
              >
                Remover
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              items.append({ serviceId: "", quantity: 1, unitPrice: "0" })
            }
          >
            Adicionar serviço
          </Button>
          <div className="form-grid">
            {field("discount", "Desconto", "number", { money: true })}
            {field("extra", "Adicionais", "number", { money: true })}
            {field("travelFee", "Deslocamento cobrado", "number", {
              money: true,
            })}
          </div>
          <p className="muted">
            O valor final e o saldo serão calculados pelo servidor ao salvar. O
            preço do atendimento é independente do catálogo.
          </p>
        </>
      )}
      {entity === "payments" && (
        <>
          {clientField()}
          <div className="form-grid">
            {field("receivedAt", "Data efetiva do recebimento", "date")}
            {select(
              "method",
              "Forma de pagamento",
              ["Pix", "Dinheiro", "Cartão", "Transferência", "Outro"].map(
                (v) => [v, v],
              ),
            )}
            {field("fee", "Taxa de cartão / financeira", "number", {
              money: true,
            })}
          </div>
          <h3>Distribuição entre atendimentos</h3>
          {allocations.fields.map((f, i) => (
            <div className="item-row" key={f.id}>
              <label>
                Atendimento
                <select
                  aria-label="Atendimento"
                  {...form.register(`allocations.${i}.appointmentId`)}
                >
                  <option value="">Selecione</option>
                  {[...(lookups.data?.appointments || [])]
                    .sort((a, b) =>
                      String(b.date).localeCompare(String(a.date)),
                    )
                    .filter(
                      (a) =>
                        a.clientId === watch.clientId &&
                        !["cancelled", "quote", "no_show"].includes(a.status),
                    )
                    .map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.title} · {a.date} · saldo {brl(a.pending)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Valor recebido
                {money(
                  <input
                    type="number"
                    step="0.01"
                    {...nonNegative}
                    {...form.register(`allocations.${i}.amount`)}
                  />,
                )}
              </label>
              <Button
                type="button"
                variant="ghost"
                onClick={() => allocations.remove(i)}
              >
                Remover
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              allocations.append({ appointmentId: "", amount: "0" })
            }
          >
            Adicionar alocação
          </Button>
        </>
      )}
      {entity === "expenses" && (
        <>
          <div className="form-grid">
            {field("description", "Descrição", "text", { required: true })}
            {field("category", "Categoria", "text", { required: true })}
            {field("amount", "Valor", "number", { money: true })}
            {select("kind", "Tipo", [
              ["fixed", "Fixa"],
              ["variable", "Variável"],
            ])}
            {field("incurredOn", "Data de competência", "date")}
            {field("dueDate", "Vencimento", "date")}
            {field("paidOn", "Data do pagamento (vazio = a pagar)", "date")}
          </div>
          {select(
            "appointmentId",
            "Vincular ao atendimento (opcional)",
            (lookups.data?.appointments || [])
              .map((a) => ({
                id: a.id,
                name: a.clientName + " · " + a.title + " · " + day(a.date),
              }))
              .sort(byName),
            true,
          )}
        </>
      )}
      {entity === "vehicles" && (
        <>
          <div className="form-grid">
            {field("name", "Marca / modelo", "text", { required: true })}
            {field("year", "Ano", "number")}
            {field("fuel", "Combustível")}
            {field("kmPerLiter", "Consumo (km/L)", "number")}
            {field("fuelPrice", "Preço do combustível / litro", "number", {
              money: true,
            })}
            {field("annualKm", "Quilometragem anual", "number")}
          </div>
          <p>
            Informe os custos <strong>anuais</strong> abaixo. Estes valores são
            estimativas para orçamento e não geram despesas.
          </p>
          <div className="form-grid">
            {Object.entries({
              insurance: "Seguro anual",
              maintenance: "Manutenção anual",
              tires: "Pneus / provisão anual",
              oil: "Óleo / provisão anual",
              tax: "IPVA e licenciamento anuais",
              depreciation: "Depreciação anual",
              other: "Outros custos anuais",
            }).map(([k, v]) => field(k, v, "number", { money: true }))}
          </div>
        </>
      )}
      {["clients", "appointments", "payments", "expenses"].includes(entity) && (
        <label>
          Observações
          <textarea {...form.register("notes")} />
        </label>
      )}
      {Object.keys(form.formState.errors).length > 0 && (
        <p role="alert" className="error">
          Revise:{" "}
          {Object.keys(form.formState.errors)
            .map((k) => errorLabels[k] || k)
            .join(", ")}
          . Verifique valores, datas e seleções obrigatórias.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={busy} type="submit">
          {busy ? "Salvando…" : "Salvar registro"}
        </Button>
      </div>
    </form>
  );
}
