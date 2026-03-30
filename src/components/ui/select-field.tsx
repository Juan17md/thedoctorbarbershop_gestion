"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";
import { Select, type SelectOption } from "./select";

export type { SelectOption };

export interface SelectFieldProps {
  label: string;
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
  required?: boolean;
  /** Clases extra para el trigger del desplegable (ej. bordes del modal) */
  selectClassName?: string;
}

export function SelectField({
  label,
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  error,
  className,
  id: idProp,
  required,
  selectClassName,
}: SelectFieldProps) {
  const uid = useId();
  const id = idProp ?? uid;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <Select
        id={id}
        options={options}
        value={value}
        onChange={onValueChange}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        className={cn(
          "rounded-xl border-white/10 py-3.5 text-base text-text-primary",
          selectClassName
        )}
      />
    </div>
  );
}
