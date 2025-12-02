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
            "bg-cyber-dark border-cyber-gold/30 text-foreground",
            "ring-offset-background",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-gold",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "focus-visible:border-cyber-gold focus-visible:shadow-[0_0_10px_rgba(255,215,0,0.3)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-200",
            "hover:border-cyber-gold/60 hover:bg-cyber-dark-lighter hover:shadow-[0_0_8px_rgba(255,215,0,0.2)]",
            "cursor-pointer",
            "shadow-[inset_0_0_10px_rgba(255,215,0,0.05)]",
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
            "absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-cyber-gold",
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

