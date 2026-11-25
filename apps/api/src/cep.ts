import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
// CEP lookup through public services (ViaCEP, then BrasilAPI). Only the eight digits leave the server.
export type CepAddress = {
  cep: string;
  street: string;
  district: string;
  city: string;
  state: string;
};
type Fetch = (url: string, init: { signal: AbortSignal }) => Promise<Response>;
export function normalizeCep(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}
export const formatCep = (digits: string) =>
  digits.slice(0, 5) + "-" + digits.slice(5);
const sources: {
  url: (cep: string) => string;
  read: (cep: string, body: any) => CepAddress | null;
}[] = [
  {
    url: (cep) => `https://viacep.com.br/ws/${cep}/json/`,
    read: (cep, b) =>
      b.erro
        ? null
        : {
            cep: formatCep(cep),
            street: b.logradouro || "",
            district: b.bairro || "",
            city: b.localidade || "",
            state: b.uf || "",
          },
  },
  {
    url: (cep) => `https://brasilapi.com.br/api/cep/v1/${cep}`,
    read: (cep, b) => ({
      cep: formatCep(cep),
      street: b.street || "",
      district: b.neighborhood || "",
      city: b.city || "",
      state: b.state || "",
    }),
  },
];
export async function lookupCep(
  value: string,
  fetcher: Fetch = fetch,
  timeoutMs = 5000,
): Promise<CepAddress> {
  const cep = normalizeCep(value);
  if (!cep) throw new BadRequestException("Informe um CEP com 8 dígitos");
  let notFound = false;
  for (const source of sources) {
    try {
      const res = await fetcher(source.url(cep), {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 404 || res.status === 400) {
        notFound = true;
        continue;
      }
      if (!res.ok) continue;
      const found = source.read(cep, await res.json());
      if (found) return found;
      notFound = true;
    } catch {
      // Timeout or network failure: try the next source.
    }
  }
  if (notFound)
    throw new NotFoundException(
      "CEP não encontrado. Preencha o endereço manualmente.",
    );
  throw new ServiceUnavailableException(
    "Consulta de CEP indisponível agora. Preencha o endereço manualmente.",
  );
}
