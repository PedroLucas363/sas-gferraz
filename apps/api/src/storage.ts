import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { Context, db, atomic, owned, audit } from "./db";
export interface Storage {
  put(relative: string, data: Buffer): Promise<void>;
  read(relative: string): Promise<Buffer>;
  remove(relative: string): Promise<void>;
  exists(relative: string): Promise<boolean>;
}
export function safeName(s: string) {
  const name = s
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 80);
  return !name || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i.test(name)
    ? "_" + name
    : name;
}
export class LocalStorage implements Storage {
  root = path.resolve(process.env.MEDIA_ROOT || "../../.data/GFerraz Makeup");
  resolve(relative: string) {
    const p = path.resolve(this.root, relative);
    if (!p.startsWith(this.root + path.sep))
      throw new BadRequestException("Caminho inválido");
    return p;
  }
  async put(relative: string, data: Buffer) {
    const p = this.resolve(relative);
    await mkdir(path.dirname(p), { recursive: true, mode: 0o700 });
    await writeFile(p, data, { mode: 0o600, flag: "wx" });
  }
  read(relative: string) {
    return readFile(this.resolve(relative));
  }
  async remove(relative: string) {
    await rm(this.resolve(relative), { force: true });
  }
  async exists(relative: string) {
    try {
      await access(this.resolve(relative));
      return true;
    } catch {
      return false;
    }
  }
}
@Injectable()
export class MediaService {
  storage: Storage = new LocalStorage();
  async upload(
    c: Context,
    clientId: string,
    appointmentId: string | undefined,
    file: Express.Multer.File,
  ) {
    const client = await owned(db, "client", c, clientId);
    if (!client.consentPhotos)
      throw new BadRequestException(
        "Registre o consentimento de armazenamento de fotos na cliente",
      );
    let folder = `${c.organizationId}/Clientes/${safeName(client.name)} - ${client.id}/Perfil`;
    if (appointmentId) {
      const a = await owned(db, "appointment", c, appointmentId);
      if (a.clientId !== clientId)
        throw new BadRequestException("Cliente incompatível");
      folder = `${c.organizationId}/Clientes/${safeName(client.name)} - ${client.id}/Atendimentos/${a.startsAt.toISOString().slice(0, 10)} - ${safeName(a.title)} - ${a.id}`;
    }
    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const existing = await db.media.findFirst({
      where: {
        organizationId: c.organizationId,
        clientId,
        appointmentId: appointmentId || null,
        checksum,
      },
    });
    if (existing) return existing;
    const image = sharp(file.buffer, { limitInputPixels: 40000000 });
    let meta;
    try {
      meta = await image.metadata();
    } catch {
      throw new BadRequestException("Imagem inválida");
    }
    if (!["jpeg", "png", "webp"].includes(meta.format || ""))
      throw new BadRequestException("Use JPEG, PNG ou WebP");
    const id = randomUUID();
    const relativePath = `${folder}/${safeName(path.parse(file.originalname).name)} - ${id}.${meta.format === "jpeg" ? "jpg" : meta.format}`;
    const thumbnailPath = `${folder}/Miniaturas/${id}.webp`;
    const thumb = await image
      .rotate()
      .resize(360, 360, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    try {
      await this.storage.put(relativePath, file.buffer);
      await this.storage.put(thumbnailPath, thumb);
      return await atomic(async (tx) => {
        const current = await owned(tx, "client", c, clientId);
        if (!current.consentPhotos)
          throw new BadRequestException("Consentimento revogado");
        const m = await tx.media.create({
          data: {
            id,
            organizationId: c.organizationId,
            clientId,
            appointmentId: appointmentId || null,
            relativePath,
            thumbnailPath,
            originalName: file.originalname,
            checksum,
          },
        });
        await audit(tx, c, "media", id, "create", null, m);
        return m;
      });
    } catch (e) {
      await this.storage.remove(relativePath);
      await this.storage.remove(thumbnailPath);
      throw e;
    }
  }
  async list(c: Context, clientId: string, appointmentId?: string) {
    await owned(db, "client", c, clientId);
    return db.media.findMany({
      where: {
        organizationId: c.organizationId,
        clientId,
        ...(appointmentId ? { appointmentId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async read(c: Context, id: string, thumb = false) {
    const m = await owned(db, "media", c, id);
    try {
      return {
        buffer: await this.storage.read(
          thumb ? m.thumbnailPath : m.relativePath,
        ),
        type: thumb
          ? "image/webp"
          : `image/${path.extname(m.relativePath) === ".jpg" ? "jpeg" : path.extname(m.relativePath).slice(1)}`,
      };
    } catch {
      throw new NotFoundException(
        "Arquivo ausente do armazenamento. Consulte a integridade e os backups.",
      );
    }
  }
  async remove(c: Context, id: string) {
    const m = await atomic(async (tx) => {
      const m = await owned(tx, "media", c, id);
      await tx.media.delete({ where: { id } });
      await audit(tx, c, "media", id, "delete", m, null);
      return m;
    });
    await this.storage.remove(m.relativePath);
    await this.storage.remove(m.thumbnailPath);
    return { ok: true };
  }
  async integrity(c: Context) {
    const media = await db.media.findMany({
      where: { organizationId: c.organizationId },
    });
    const missing = [];
    for (const m of media)
      if (
        !(await this.storage.exists(m.relativePath)) ||
        !(await this.storage.exists(m.thumbnailPath))
      )
        missing.push({ id: m.id, relativePath: m.relativePath });
    return { checked: media.length, missing };
  }
}
