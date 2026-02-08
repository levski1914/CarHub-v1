"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

type Props = React.ComponentProps<typeof TooltipPrimitive.Content> & {
  className?: string;
};

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className = "", children, ...props }: Props) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={4}
        className={`rounded-md bg-gray-900 text-white px-2 py-1 text-sm shadow-md ${className}`}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-current text-gray-900" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
