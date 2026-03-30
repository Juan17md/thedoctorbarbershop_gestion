"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      expand={false}
      richColors
      closeButton
      theme="dark"
      className="toaster group"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast !bg-surface-high !border !border-white/10 !text-text-primary !shadow-lg !rounded-xl !font-body",
          title: "!text-text-primary !font-semibold",
          description: "!text-text-secondary !text-sm",
          actionButton:
            "!bg-primary !text-white !rounded-lg",
          cancelButton:
            "!bg-surface !text-text-secondary !rounded-lg",
          closeButton:
            "!bg-white/5 !border-white/10 !text-text-secondary hover:!text-text-primary",
          success:
            "!border-success/40",
          error:
            "!border-danger/40",
          warning:
            "!border-warning/40",
          info:
            "!border-info/40",
        },
      }}
      {...props}
    />
  );
}
