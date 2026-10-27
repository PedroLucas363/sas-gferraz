"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Sparkles,
  Wallet,
  Receipt,
  Car,
  FileBarChart,
  Upload,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { Entity, entityLabels, querySchema, Query } from "@gferraz/shared";
import { api, today, ApiError } from "./api";
import { DataTable } from "./data-table";
import { Dashboard } from "./dashboard";
import { RecordForm } from "./record-form";
import { Detail } from "./details";
import { Imports } from "./imports";
import { Agenda } from "./agenda";
import { Settings } from "./settings";
import { Button } from "./ui/button";
const nav = [
  ["dashboard", "Visão geral", LayoutDashboard],
  ["clients", "Clientes", Users],
  ["agenda", "Agenda", CalendarDays],
  ["appointments", "Atendimentos", Sparkles],
  ["services", "Catálogo de serviços", Sparkles],
  ["payments", "Recebimentos", Wallet],
  ["expenses", "Despesas", Receipt],
  ["reports", "Relatórios", FileBarChart],
  ["vehicles", "Veículos", Car],
  ["imports", "Importação", Upload],
  ["settings", "Configurações", SettingsIcon],
] as const;
export function Application() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: true,
            refetchInterval: 15000,
            staleTime: 0,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Shell />
    </QueryClientProvider>
  );
}
function Shell() {
  const cache = useQueryClient(),
    router = useRouter(),
    params = useSearchParams();
  const [mobile, setMobile] = useState(false);
  const [dialog, setDialog] = useState<{
    entity: Entity;
    id?: string;
    edit: boolean;
  } | null>(null);
  const [reportEntity, setReportEntity] = useState<Entity>("appointments");
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api("auth/me"),
    refetchInterval: false,
  });
  const module = params.get("module") || "dashboard";
  let query: Query;
  try {
    query = querySchema.parse(
      params.get("q")
        ? JSON.parse(params.get("q")!)
        : module === "dashboard"
          ? { from: today().slice(0, 7) + "-01", to: today() }
          : {},
    );
  } catch {
    query = querySchema.parse({});
  }
  const setQuery = (q: Query) => {
    const p = new URLSearchParams(params);
    p.set("q", JSON.stringify(q));
    router.replace("?" + p.toString(), { scroll: false });
  };
  function navigate(id: string) {
    setMobile(false);
    router.push("?module=" + id);
  }
  function open(entity: Entity, id: string) {
    setDialog({ entity, id, edit: false });
  }
  if (me.isLoading)
    return (
      <div className="startup">
        <span className="monogram">GF</span>
        <p>Preparando seu espaço…</p>
      </div>
    );
  if (me.error && (!(me.error instanceof ApiError) || me.error.status !== 401))
    return (
      <div className="startup">
        <p className="error">{me.error.message}</p>
        <Button onClick={() => me.refetch()}>Tentar novamente</Button>
      </div>
    );
  if (me.error)
    return (
      <Auth onSuccess={() => cache.invalidateQueries({ queryKey: ["me"] })} />
    );
  const company = me.data.organization;
  const settings = company.settings;
  const current = nav.find((n) => n[0] === module) || nav[0];
  const isEntity = Object.keys(entityLabels).includes(module);
  const entity = module as Entity;
  return (
    <div
      className="app"
      style={
        {
          "--green": settings.green || "#546B57",
          "--beige": settings.beige || "#F9EAD2",
        } as React.CSSProperties
      }
    >
      <button
        className="mobile-menu"
        aria-label="Abrir menu"
        onClick={() => setMobile(!mobile)}
      >
        <Menu />
      </button>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="monogram">GF</div>
          <div>
            <strong>{company.name}</strong>
            <span>GESTÃO & CUIDADO</span>
          </div>
        </div>
        <p className="nav-label">SEU ESPAÇO DE TRABALHO</p>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={module === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              {label}
              {module === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">{me.data.name.slice(0, 1)}</div>
          <div>
            <strong>{me.data.name}</strong>
            <small>Proprietária</small>
          </div>
          <button
            aria-label="Sair"
            title="Sair"
            onClick={async () => {
              await api("auth/logout", { method: "POST" });
              cache.clear();
              await cache.invalidateQueries();
              location.reload();
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            GFerraz <span className="muted">/ {current[1]}</span>
          </span>
          <span>
            {new Date().toLocaleDateString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {module === "dashboard"
                  ? "UM OLHAR PARA O SEU NEGÓCIO"
                  : "TUDO CONECTADO, EM UM SÓ LUGAR"}
              </p>
              <h1>{current[1]}</h1>
              <p>
                {
                  {
                    dashboard:
                      "Mais clareza para cuidar do que você faz de melhor.",
                    clients:
                      "Cada cliente tem uma história. Aqui, você acompanha todas.",
                    agenda: "Organize seus horários e prepare seu dia.",
                    appointments: "Do primeiro contato ao resultado final.",
                    payments: "Acompanhe cada entrada e cada saldo.",
                    expenses: "Conheça os custos do seu negócio.",
                    services:
                      "Seus serviços, categorias e preços de referência.",
                    reports: "As mesmas fontes, sob diferentes perspectivas.",
                    vehicles: "Custos de deslocamento com regras claras.",
                    imports:
                      "Seu histórico preservado, com revisão em cada etapa.",
                    settings: "Preferências, identidade e rastreabilidade.",
                  }[module]
                }
              </p>
            </div>
            {isEntity && (
              <Button onClick={() => setDialog({ entity, edit: true })}>
                <Plus size={18} /> Novo registro
              </Button>
            )}
            {module === "dashboard" && (
              <Button
                onClick={() =>
                  setDialog({ entity: "appointments", edit: true })
                }
              >
                <Plus size={18} /> Novo atendimento
              </Button>
            )}
          </div>
          {module === "dashboard" ? (
            <Dashboard
              query={query}
              onQuery={setQuery}
              onOpen={open}
              settings={settings}
            />
          ) : isEntity ? (
            <DataTable
              entity={entity}
              query={query}
              onQuery={setQuery}
              onOpen={(id) => open(entity, id)}
            />
          ) : module === "agenda" ? (
            <Agenda onOpen={(id) => open("appointments", id)} />
          ) : module === "reports" ? (
            <>
              <div className="panel period-bar">
                <label>
                  Fonte do relatório
                  <select
                    value={reportEntity}
                    onChange={(e) => {
                      setReportEntity(e.target.value as Entity);
                      setQuery(querySchema.parse({}));
                    }}
                  >
                    {Object.entries(entityLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <Button variant="outline" onClick={() => window.print()}>
                  Imprimir / salvar PDF
                </Button>
              </div>
              <DataTable
                entity={reportEntity}
                query={query}
                onQuery={setQuery}
                onOpen={(id) => open(reportEntity, id)}
              />
            </>
          ) : module === "imports" ? (
            <Imports />
          ) : module === "settings" ? (
            <Settings />
          ) : (
            <p>Selecione um módulo.</p>
          )}
          <footer>
            GFerraz Makeup <span>Feito para acompanhar cada detalhe.</span>
          </footer>
        </div>
      </main>
      {dialog &&
        (dialog.edit ? (
          <RecordForm
            key={`${dialog.entity}-${dialog.id}`}
            entity={dialog.entity}
            id={dialog.id}
            onClose={() => setDialog(null)}
          />
        ) : (
          <Detail
            key={`${dialog.entity}-${dialog.id}`}
            entity={dialog.entity}
            id={dialog.id!}
            onClose={() => setDialog(null)}
            onEdit={() => setDialog({ ...dialog, edit: true })}
            onOpen={open}
          />
        ))}
    </div>
  );
}
function Auth({ onSuccess }: { onSuccess: () => void }) {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="auth-screen">
      <section className="auth-story">
        <div className="brand">
          <span className="monogram">GF</span>
          <strong>GFerraz Makeup</strong>
        </div>
        <div>
          <p className="eyebrow">SEU TALENTO MERECE ESPAÇO</p>
          <h1>
            O cuidado está
            <br />
            em cada detalhe.
          </h1>
          <p>
            Clientes, agenda e finanças.
            <br />
            Tudo conectado, para você se dedicar
            <br />
            ao que faz de melhor.
          </p>
        </div>
        <span>GESTÃO COM SIMPLICIDADE E PROPÓSITO</span>
      </section>
      <section className="auth-form">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const data = Object.fromEntries(new FormData(e.currentTarget));
              await api(`auth/${register ? "register" : "login"}`, {
                method: "POST",
                body: JSON.stringify(data),
              });
              onSuccess();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="eyebrow">BEM-VINDA AO SEU ESPAÇO</p>
          <h2>{register ? "Vamos começar" : "Que bom ter você aqui"}</h2>
          <p className="muted">
            {register
              ? "Cadastre sua empresa para organizar o seu negócio."
              : "Entre para acompanhar o seu negócio."}
          </p>
          {register && (
            <>
              <label>
                Seu nome
                <input name="name" required minLength={2} autoComplete="name" />
              </label>
              <label>
                Nome da empresa
                <input
                  name="company"
                  required
                  defaultValue="GFerraz Makeup"
                  minLength={2}
                  autoComplete="organization"
                />
              </label>
            </>
          )}
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Senha
            <input
              aria-label="Senha"
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              minLength={12}
              maxLength={200}
            />
            <small>Use pelo menos 12 caracteres.</small>
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? "Aguarde…" : register ? "Criar meu espaço" : "Entrar"}
            <ArrowUpRight size={18} />
          </Button>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register
              ? "Já tenho uma conta"
              : "Primeiro acesso? Criar uma conta"}
          </button>
        </form>
      </section>
    </div>
  );
}
