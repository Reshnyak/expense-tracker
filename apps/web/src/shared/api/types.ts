import type { components } from "./schema";

type Schemas = components["schemas"];

export type ApiError = Schemas["Error"];
export type TokenPair = Schemas["TokenPair"];
export type User = Schemas["User"];
export type Space = Schemas["Space"];
export type SpaceInput = Schemas["SpaceInput"];
export type SpaceMember = Schemas["SpaceMember"];
export type Category = Schemas["Category"];
export type CategoryInput = Schemas["CategoryInput"];
export type Expense = Schemas["Expense"];
export type ExpenseInput = Schemas["ExpenseInput"];
export type ExpenseList = Schemas["ExpenseList"];
export type Balance = Schemas["Balance"];
