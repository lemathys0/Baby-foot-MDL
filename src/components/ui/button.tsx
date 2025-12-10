import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsla(180,100%,50%,0.4)]",
        destructive: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_0_20px_hsla(300,100%,50%,0.4)]",
        outline: "border border-border bg-transparent hover:bg-muted hover:border-primary hover:text-primary",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        neon: "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground shadow-[0_0_10px_hsla(180,100%,50%,0.4),inset_0_0_10px_hsla(180,100%,50%,0.1)]",
        "neon-magenta": "bg-transparent border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground shadow-[0_0_10px_hsla(300,100%,50%,0.4),inset_0_0_10px_hsla(300,100%,50%,0.1)]",
        gaming: "bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/50 text-foreground hover:border-primary hover:from-primary/30 hover:to-secondary/30",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
