import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-primary-foreground shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] hover:-translate-y-[1px] hover:brightness-105 active:translate-y-0 border border-primary/40 backdrop-blur",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/40 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] hover:-translate-y-[1px] active:translate-y-0",
        outline:
          "border border-border/70 text-foreground/90 bg-card/60 backdrop-blur hover:border-primary/50 hover:text-primary shadow-sm hover:shadow-[var(--shadow-1)] hover:-translate-y-[1px]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/60 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] hover:-translate-y-[1px]",
        ghost:
          "text-foreground/80 hover:text-primary hover:bg-primary/8 border border-transparent hover:border-primary/30",
        link: "text-primary underline-offset-4 hover:text-primary/80 hover:underline transition-colors",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-lg px-3.5",
        lg: "h-12 rounded-xl px-6",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

