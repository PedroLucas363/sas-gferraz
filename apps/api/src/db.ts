import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/client";
import { ConflictException, NotFoundException } from "@nestjs/common";
export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
export const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
export const sum = (xs: Prisma.Decimal.Value[]) =>
  xs.reduce<Prisma.Decimal>((a, v) => a.plus(v), D(0));
export const plain = (v: unknown) => JSON.parse(JSON.stringify(v));
export type Context = { organizationId: string; userId: string; role: string };
export type Tx = Prisma.TransactionClient;
export async function atomic<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.$transaction(fn, {
      isolationLevel: "Serializable",
      timeout: 20000,
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2034", "P2002"].includes(e.code)
    )
      throw new ConflictException(
        "Conflito de gravação. Recarregue os dados e tente novamente.",
      );
    throw e;
  }
}
export async function audit(
  tx: Tx,
  c: Context,
  entity: string,
  recordId: string,
  action: string,
  before: unknown,
  after: unknown,
) {
  await tx.audit.create({
    data: {
      organizationId: c.organizationId,
      userId: c.userId,
      entity,
      recordId,
      action,
      before: before ? plain(before) : undefined,
      after: after ? plain(after) : undefined,
    } as any,
  });
}
export async function owned(tx: Tx, model: string, c: Context, id: string) {
  const r = await (tx as any)[model].findFirst({
    where: { id, organizationId: c.organizationId },
  });
  if (!r) throw new NotFoundException("Registro não encontrado");
  return r;
}
export function expectVersion(record: { version: number }, version: number) {
  if (record.version !== version)
    throw new ConflictException(
      "Este registro foi alterado em outra sessão. Recarregue antes de salvar.",
    );
}
