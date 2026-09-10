import type { ExpenseFilters } from "@/features/expenses/useExpenses";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: ExpenseFilters;
  onChange: (next: ExpenseFilters) => void;
}) {
  const active = Boolean(value.from || value.to);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-from" className="text-muted-foreground text-xs">
          С
        </Label>
        <Input
          id="filter-from"
          type="date"
          className="h-9 w-40"
          value={value.from ?? ""}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-to" className="text-muted-foreground text-xs">
          По
        </Label>
        <Input
          id="filter-to"
          type="date"
          className="h-9 w-40"
          value={value.to ?? ""}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
        />
      </div>
      {active && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          Сбросить
        </Button>
      )}
    </div>
  );
}
