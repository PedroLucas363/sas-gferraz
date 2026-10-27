import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
} from "@nestjs/common";
import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { Request, Response } from "express";
import { db, atomic } from "./db";
const scrypt = promisify(scryptCb);
const hashToken = (s: string) => createHash("sha256").update(s).digest("hex");
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return (
    salt + ":" + ((await scrypt(password, salt, 64)) as Buffer).toString("hex")
  );
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(key, "hex"), derived);
}
@Injectable()
export class AuthService {
  private attempts = new Map<string, { count: number; until: number }>();
  limit(ip: string) {
    const a = this.attempts.get(ip);
    if (a && a.until > Date.now()) {
      if (a.count >= 15)
        throw new HttpException("Muitas tentativas. Aguarde 15 minutos.", 429);
      a.count++;
    } else this.attempts.set(ip, { count: 1, until: Date.now() + 900000 });
    if (this.attempts.size > 10000)
      for (const [k, v] of this.attempts)
        if (v.until < Date.now()) this.attempts.delete(k);
  }
  async register(input: {
    name: string;
    company: string;
    email: string;
    password: string;
  }) {
    const hash = await passwordHash(input.password);
    return atomic(async (tx) => {
      const org = await tx.organization.create({
        data: { name: input.company },
      });
      return tx.user.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          organizationId: org.id,
          passwordHash: hash,
        },
      });
    });
  }
  async login(email: string, password: string) {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      throw new UnauthorizedException("E-mail ou senha inválidos");
    return user;
  }
  async session(user: { id: string }, res: Response) {
    const token = randomBytes(32).toString("hex");
    await db.session.create({
      data: {
        id: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    res.cookie("gf_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 7 * 86400000,
    });
    return { ok: true };
  }
  async current(req: Request) {
    const token = req.cookies?.gf_session;
    if (!token) throw new UnauthorizedException();
    const session = await db.session.findUnique({
      where: { id: hashToken(token) },
    });
    if (!session || session.expiresAt < new Date())
      throw new UnauthorizedException();
    const u = await db.user.findUnique({ where: { id: session.userId } });
    if (!u) throw new UnauthorizedException();
    return {
      organizationId: u.organizationId,
      userId: u.id,
      role: u.role,
      name: u.name,
      email: u.email,
    };
  }
  async logout(req: Request, res: Response) {
    if (req.cookies?.gf_session)
      await db.session.deleteMany({
        where: { id: hashToken(req.cookies.gf_session) },
      });
    res.clearCookie("gf_session", { path: "/" });
    return { ok: true };
  }
}
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.headers.origin;
      const allowed = (process.env.WEB_ORIGIN || "http://localhost:3000").split(
        ",",
      );
      if (origin && !allowed.includes(origin))
        throw new ForbiddenException("Origem não autorizada");
      if (req.cookies?.gf_session && !origin)
        throw new ForbiddenException(
          "Informe o cabeçalho Origin em operações autenticadas",
        );
    }
    if (
      ["/api/health", "/api/auth/login", "/api/auth/register"].includes(
        req.path,
      )
    )
      return true;
    req.user = await this.auth.current(req);
    return true;
  }
}
