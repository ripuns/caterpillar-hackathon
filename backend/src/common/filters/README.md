# backend/src/common/filters/

## What

Global exception filter standardizing every error response to one shape (CONTRACTS.md §8.3).

## Why

Without this, NestJS's default error responses vary in shape depending on what threw (validation error, `NotFoundException`, uncaught exception, etc.) — inconsistent for API consumers (Anamika's frontend). One filter, applied globally, guarantees every error looks the same.

## How

`http-exception.filter.ts` catches everything (`@Catch()` with no argument) and maps it to `{ error: { code, message, statusCode } }`. `HttpException` subclasses (e.g. `NotFoundException`, validation errors from the `ValidationPipe`) are mapped using their actual status/message; anything else falls through as a `500 INTERNAL_ERROR` with the message logged server-side (not leaked to the client). Registered globally in `../../main.ts` via `app.useGlobalFilters()`.

## File Responsibilities

- **`http-exception.filter.ts`** — defines `HttpExceptionFilter`. Depends on nothing else. Depended on by `../../main.ts`.
