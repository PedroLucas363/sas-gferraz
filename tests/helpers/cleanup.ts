import { db } from "../../apps/api/src/db";
import { rm } from "node:fs/promises";
import path from "node:path";
export async function cleanupTenant(organizationId: string) {
  const users = await db.user.findMany({ where: { organizationId } });
  if (
    !users.length ||
    users.some(
      (u) => !/^(api-|browser-|inspection-).+@example\.test$/.test(u.email),
    )
  )
    throw new Error("Cleanup only accepts tenants created by these tests");
  await db.$transaction(async (tx) => {
    const where = { organizationId };
    for (const model of [
      "refund",
      "allocation",
      "payment",
      "trip",
      "media",
      "expense",
      "appointmentItem",
      "appointment",
      "importReceipt",
      "importBatch",
      "savedView",
      "audit",
      "event",
      "client",
      "service",
      "vehicle",
    ])
      await (tx as any)[model].deleteMany({ where });
    await tx.session.deleteMany({
      where: { userId: { in: users.map((u) => u.id) } },
    });
    await tx.user.deleteMany({ where });
    await tx.organization.delete({ where: { id: organizationId } });
  });
  const mediaRoot =
    process.env.TEST_MEDIA_ROOT ||
    path.resolve(
      "apps/api",
      process.env.MEDIA_ROOT || "../../.data/GFerraz Makeup",
    );
  await rm(path.join(mediaRoot, organizationId), {
    recursive: true,
    force: true,
  });
}
