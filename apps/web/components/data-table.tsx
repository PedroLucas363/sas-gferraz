"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Entity,
  Query,
  entityFields,
  fieldLabels,
  statusLabels,
  querySchema,
} from "@gferraz/shared";
import { api, queryString, display } from "./api";
import { Button } from "./ui/button";
import {
  Search,
  SlidersHorizontal,
  Download,
  ArrowUpDown,
  Save,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
export function DataTable({
  entity,
  query,
  onQuery,
  onOpen,
  readonly = false,
}: {
  entity: Entity;
  query: Query;
  onQuery: (q: Query) => void;
  onOpen?: (id: string) => void;
  readonly?: boolean;
}) {
  const cache = useQueryClient();
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [selectedView, setSelectedView] = useState("");
  const data = useQuery({
    queryKey: ["table", entity, query],
    queryFn: () => api(`data/${entity}?q=${queryString(query)}`),
  });
  const views = useQuery({
    queryKey: ["views", entity],
    queryFn: () => api(`views?entity=${entity}`),
  });
  const update = (v: Partial<Query>) =>
    onQuery(
      querySchema.parse({ ...query, ...v, page: "page" in v ? v.page : 0 }),
    );
  const columns: ColumnDef<any>[] = entityFields[entity].map((id) => ({
    id,
    accessorKey: id,
    header: fieldLabels[id] || id,
    cell: (ctx) =>
      id === "status" ? (
        <span
          className={`badge ${ctx.getValue() === "completed" || ctx.getValue() === "Pago" ? "success" : ""}`}
        >
          {statusLabels[String(ctx.getValue())] ||
            String(ctx.getValue() || "—")}
        </span>
      ) : (
        display(id, ctx.getValue())
      ),
    size: query.columnSizing[id] || 155,
  }));
  const table = useReactTable({
    data: data.data?.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    columnResizeMode: "onChange",
    state: {
      sorting: query.sort,
      columnVisibility: query.columns,
      columnOrder: query.columnOrder,
      columnSizing: query.columnSizing,
    },
    onSortingChange: (next) =>
      update({ sort: typeof next === "function" ? next(query.sort) : next }),
    onColumnSizingChange: (next) =>
      update({
        columnSizing:
          typeof next === "function" ? next(query.columnSizing) : next,
      }),
  });
  async function action(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await cache.invalidateQueries({ queryKey: ["views"] });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const fields = entityFields[entity];
  return (
    <section className="panel table-panel">
      <div className="table-tools">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Pesquisar registros"
            placeholder="Buscar nos registros…"
            value={query.search}
            onChange={(e) => update({ search: e.target.value })}
          />
        </div>
        <div className="tools">
          <Button variant="outline" onClick={() => setAdvanced(!advanced)}>
            <SlidersHorizontal size={16} /> Configurar
          </Button>
          <a
            className="button outline"
            href={`/api/export/${entity}?q=${queryString(query)}&format=csv`}
          >
            <Download size={16} /> CSV
          </a>
          <a
            className="button outline"
            href={`/api/export/${entity}?q=${queryString(query)}&format=xlsx`}
          >
            XLSX
          </a>
        </div>
      </div>
      {!readonly && (
        <div className="view-bar">
          <label>
            Visualização{" "}
            <select
              aria-label="Visualização"
              value={selectedView}
              onChange={(e) => {
                setSelectedView(e.target.value);
                const v = views.data?.find((x: any) => x.id === e.target.value);
                if (v) onQuery(querySchema.parse(v.query));
              }}
            >
              <option value="">Consulta atual</option>
              {views.data?.map((v: any) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <input
            aria-label="Nome da visualização"
            placeholder="Nome da visualização"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            variant="ghost"
            onClick={() =>
              action(async () => {
                if (!name.trim()) throw new Error("Informe um nome");
                await api("views", {
                  method: "POST",
                  body: JSON.stringify({ name, entity, query }),
                });
                setName("");
              })
            }
          >
            <Save size={15} /> Salvar nova
          </Button>
          {selectedView && (
            <>
              <Button
                variant="ghost"
                onClick={() =>
                  action(async () => {
                    const v = views.data.find(
                      (v: any) => v.id === selectedView,
                    );
                    await api(`views/${v.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        name: name || v.name,
                        query,
                        version: v.version,
                      }),
                    });
                    setName("");
                  })
                }
              >
                Atualizar / renomear
              </Button>
              <Button
                variant="ghost"
                title="Duplicar visualização"
                onClick={() =>
                  action(() => {
                    const v = views.data.find(
                      (v: any) => v.id === selectedView,
                    );
                    return api("views", {
                      method: "POST",
                      body: JSON.stringify({
                        name: (name || v.name) + " — cópia",
                        entity,
                        query,
                      }),
                    });
                  })
                }
              >
                <Copy size={15} />
              </Button>
              <Button
                variant="ghost"
                title="Excluir visualização"
                onClick={() =>
                  action(async () => {
                    await api(`views/${selectedView}`, { method: "DELETE" });
                    setSelectedView("");
                  })
                }
              >
                <Trash2 size={15} />
              </Button>
            </>
          )}
        </div>
      )}
      {advanced && (
        <div className="table-config">
          <div className="form-row">
            <label>
              De
              <input
                type="date"
                value={query.from || ""}
                onChange={(e) => update({ from: e.target.value || undefined })}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={query.to || ""}
                onChange={(e) => update({ to: e.target.value || undefined })}
              />
            </label>
            <label>
              Agrupar por
              <select
                value={query.groupBy || ""}
                onChange={(e) => update({ groupBy: e.target.value || null })}
              >
                <option value="">Sem agrupamento</option>
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {fieldLabels[f] || f}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Combinar filtros
              <select
                value={query.logic}
                onChange={(e) =>
                  update({ logic: e.target.value as "and" | "or" })
                }
              >
                <option value="and">Todas as condições (E)</option>
                <option value="or">Qualquer condição (OU)</option>
              </select>
            </label>
          </div>
          {query.filters.map((f, i) => (
            <div className="filter-row" key={i}>
              <select
                aria-label="Campo do filtro"
                value={f.field}
                onChange={(e) =>
                  update({
                    filters: query.filters.map((v, j) =>
                      i === j ? { ...v, field: e.target.value } : v,
                    ),
                  })
                }
              >
                {[...fields, "clientId", "id"].map((k) => (
                  <option key={k} value={k}>
                    {fieldLabels[k] || k}
                  </option>
                ))}
              </select>
              <select
                aria-label="Operador do filtro"
                value={f.op}
                onChange={(e) =>
                  update({
                    filters: query.filters.map((v, j) =>
                      i === j
                        ? {
                            ...v,
                            op: e.target.value as any,
                            value: e.target.value === "between" ? ["", ""] : "",
                          }
                        : v,
                    ),
                  })
                }
              >
                {Object.entries({
                  eq: "Igual a",
                  ne: "Diferente de",
                  contains: "Contém",
                  gt: "Maior que",
                  lt: "Menor que",
                  between: "Entre",
                  empty: "Vazio",
                  not_empty: "Não vazio",
                }).map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </select>
              {!["empty", "not_empty"].includes(f.op) &&
                (f.op === "between" ? (
                  [0, 1].map((k) => (
                    <input
                      key={k}
                      aria-label={k ? "Limite final" : "Limite inicial"}
                      value={Array.isArray(f.value) ? f.value[k] : ""}
                      onChange={(e) => {
                        const val = Array.isArray(f.value)
                          ? [...f.value]
                          : ["", ""];
                        val[k] = e.target.value;
                        update({
                          filters: query.filters.map((v, j) =>
                            i === j ? { ...v, value: val } : v,
                          ),
                        });
                      }}
                    />
                  ))
                ) : (
                  <input
                    aria-label="Valor do filtro"
                    value={String(f.value ?? "")}
                    onChange={(e) =>
                      update({
                        filters: query.filters.map((v, j) =>
                          i === j ? { ...v, value: e.target.value } : v,
                        ),
                      })
                    }
                  />
                ))}
              <Button
                variant="ghost"
                aria-label="Remover filtro"
                onClick={() =>
                  update({ filters: query.filters.filter((_, j) => j !== i) })
                }
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                filters: [
                  ...query.filters,
                  { field: fields[0], op: "contains", value: "" },
                ],
              })
            }
          >
            Adicionar condição
          </Button>
          <details>
            <summary>Colunas visíveis e ordem</summary>
            <div className="column-picker">
              {(query.columnOrder.length ? query.columnOrder : fields)
                .filter((k) => fields.includes(k))
                .map((k, i, order) => (
                  <div key={k}>
                    <label>
                      <input
                        type="checkbox"
                        checked={query.columns[k] !== false}
                        onChange={(e) =>
                          update({
                            columns: {
                              ...query.columns,
                              [k]: e.target.checked,
                            },
                          })
                        }
                      />
                      {fieldLabels[k] || k}
                    </label>
                    <button
                      type="button"
                      aria-label={`Mover ${k} para cima`}
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...order];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        update({ columnOrder: next });
                      }}
                    >
                      ↑
                    </button>
                  </div>
                ))}
            </div>
          </details>
          <p className="muted">
            Clique nos cabeçalhos para ordenar. Use Shift para combinar colunas.
            Arraste as bordas para ajustar as larguras.
          </p>
        </div>
      )}
      {(error || data.error) && (
        <p role="alert" className="error">
          {error || (data.error as Error)?.message}
        </p>
      )}
      {data.isLoading ? (
        <p className="empty">Carregando registros…</p>
      ) : (
        <>
          <div className="table-scroll">
            <table style={{ width: table.getTotalSize() }}>
              <thead>
                {table.getHeaderGroups().map((g) => (
                  <tr key={g.id}>
                    {g.headers.map((h) => (
                      <th
                        key={h.id}
                        style={{ width: h.getSize(), position: "relative" }}
                      >
                        <button onClick={h.column.getToggleSortingHandler()}>
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                          <ArrowUpDown size={12} />
                          {h.column.getIsSorted() === "asc"
                            ? "↑"
                            : h.column.getIsSorted() === "desc"
                              ? "↓"
                              : ""}
                        </button>
                        <div
                          onMouseDown={h.getResizeHandler()}
                          onTouchStart={h.getResizeHandler()}
                          className="resizer"
                        />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    tabIndex={onOpen ? 0 : undefined}
                    onKeyDown={(e) =>
                      e.key === "Enter" && onOpen?.(row.original.id)
                    }
                    onClick={() => onOpen?.(row.original.id)}
                    className={onOpen ? "clickable" : ""}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.data?.total && (
              <div className="empty">
                <strong>Nenhum registro encontrado</strong>
                <p>Cadastre um registro ou ajuste os filtros para começar.</p>
              </div>
            )}
          </div>
          <div className="table-footer">
            <span>
              {data.data?.total || 0} registros · página {query.page + 1}
            </span>
            <div className="tools">
              <select
                aria-label="Registros por página"
                value={query.pageSize}
                onChange={(e) => update({ pageSize: Number(e.target.value) })}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <Button
                variant="ghost"
                aria-label="Página anterior"
                disabled={!query.page}
                onClick={() => update({ page: query.page - 1 })}
              >
                <ChevronLeft size={18} />
              </Button>
              <Button
                variant="ghost"
                aria-label="Próxima página"
                disabled={(query.page + 1) * query.pageSize >= data.data?.total}
                onClick={() => update({ page: query.page + 1 })}
              >
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>
          {!!Object.keys(data.data?.totals || {}).length && (
            <div className="totals">
              {Object.entries(data.data.totals).map(([k, v]) => (
                <span key={k}>
                  {fieldLabels[k]} <strong>{display(k, v)}</strong>
                </span>
              ))}
            </div>
          )}
          {query.groupBy && (
            <div className="groups">
              {Object.entries(data.data?.groups || {}).map(
                ([key, value]: any) => (
                  <div className="group" key={key}>
                    <strong>{statusLabels[key] || key}</strong>
                    <span>{value.count} registros</span>
                    {Object.entries(value.totals).map(([k, v]) => (
                      <span key={k}>
                        {fieldLabels[k]}: {display(k, v)}
                      </span>
                    ))}
                  </div>
                ),
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
