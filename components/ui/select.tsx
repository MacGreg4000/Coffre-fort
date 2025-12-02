import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex h-10 w-full appearance-none rounded-md border px-3 py-2 pr-10 text-sm",
            "bg-cyber-dark border-blue-500/15 text-foreground",
            "ring-offset-background",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "focus-visible:border-blue-500/30 focus-visible:shadow-sm",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-200",
            "hover:border-blue-500/25 hover:bg-cyber-dark-lighter hover:scale-[1.02]",
            "cursor-pointer",
            "shadow-sm",
            error && "border-red-500/50 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className={cn(
            "absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-blue-400/60",
            "transition-transform duration-200",
            "opacity-70"
          )}
          aria-hidden="true"
        />
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }

