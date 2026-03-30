"use client"

import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full bg-surface-high border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder-text-muted transition-all duration-300 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "",
        error: "border-red-500/50 focus:border-red-500 focus:ring-red-500/10",
      },
      size: {
        default: "",
        sm: "py-2 px-3 text-sm",
        lg: "py-4 px-5 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Input({
  className,
  variant,
  size,
  ...props
}: InputPrimitive.Props & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      className={cn(inputVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }