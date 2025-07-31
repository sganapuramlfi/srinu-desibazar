import * as React from "react"
import { cn } from "@/lib/utils"

export type CalendarProps = {
  className?: string;
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
}

function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  ...props
}: CalendarProps) {
  return (
    <div className={cn("p-3", className)}>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Calendar Component</p>
        <p className="text-xs text-muted-foreground mt-2">
          Selected: {selected?.toDateString() || "None"}
        </p>
        <input
          type="date"
          className="mt-2 px-2 py-1 border rounded"
          onChange={(e) => {
            const date = e.target.value ? new Date(e.target.value) : undefined;
            onSelect?.(date);
          }}
          value={selected ? selected.toISOString().split('T')[0] : ''}
        />
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }