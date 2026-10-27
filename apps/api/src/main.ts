import "reflect-metadata";
import "./env";
import {
  Module,
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";
import { NestFactory, APP_GUARD } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ZodError } from "zod";
import { Prisma } from "../generated/client";
import cookieParser from "cookie-parser";
import { json } from "express";
import { AuthService, AccessGuard } from "./auth";
import { DataService } from "./data.service";
import { BusinessService } from "./business.service";
import { MediaService } from "./storage";
import { ImportService } from "./import.service";
import { AppController } from "./controller";
@Catch()
class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    let status = 500,
      message = "Falha interna. Tente novamente.";
    let details: unknown;
    if (error instanceof HttpException) {
      status = error.getStatus();
      message = error.message;
    } else if (error instanceof ZodError) {
      status = 400;
      message = "Revise os campos informados";
      details = error.issues;
    } else if (error instanceof SyntaxError) {
      status = 400;
      message = "JSON inválido";
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        status = 404;
        message = "Registro não encontrado";
      } else if (["P2002", "P2003", "P2004"].includes(error.code)) {
        status = 409;
        message = "Registro duplicado ou relacionamento inválido";
      }
    }
    if (status === 500)
      console.error(
        JSON.stringify({
          level: "error",
          event: "request_failed",
          type: error instanceof Error ? error.name : "unknown",
        }),
      );
    res.status(status).json({ statusCode: status, message, details });
  }
}
@Module({
  controllers: [AppController],
  providers: [
    AuthService,
    DataService,
    BusinessService,
    MediaService,
    ImportService,
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
class AppModule {}
export async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use((req: any, res: any, next: any) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new Errors());
  if (process.env.NODE_ENV !== "production") {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("GFerraz Makeup API")
        .setDescription(
          "REST autenticada por cookie. Empresas isoladas pela sessão. Valores monetários em strings decimais. Contratos completos em packages/shared.",
        )
        .setVersion("0.1.0")
        .addCookieAuth("gf_session")
        .build(),
    );
    SwaggerModule.setup("api/docs", app, doc);
  }
  await app.listen(
    Number(process.env.API_PORT || 3001),
    process.env.API_HOST || "127.0.0.1",
  );
  return app;
}
bootstrap().catch(() => {
  console.error(JSON.stringify({ level: "fatal", event: "startup_failed" }));
  process.exit(1);
});
