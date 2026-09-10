import type { components } from "./schema";

type Schemas = components["schemas"];

export type ApiError = Schemas["Error"];
export type TokenPair = Schemas["TokenPair"];
export type User = Schemas["User"];
export type RegisterInput = Schemas["RegisterInput"];
export type LoginInput = Schemas["LoginInput"];

/**
 * Body of `POST /api/v1/auth/dev-login`. Hand-written: the OpenAPI spec inlines
 * this schema on the path, so `openapi-typescript` produces no named component.
 */
export type DevLoginInput = { email: string; name?: string };
export type Space = Schemas["Space"];
export type SpaceInput = Schemas["SpaceInput"];
export type SpaceMember = Schemas["SpaceMember"];
export type MemberRole = Schemas["MemberRole"];
export type Category = Schemas["Category"];
export type CategoryInput = Schemas["CategoryInput"];
export type Expense = Schemas["Expense"];
export type ExpenseInput = Schemas["ExpenseInput"];
export type ExpenseList = Schemas["ExpenseList"];
export type Balance = Schemas["Balance"];
