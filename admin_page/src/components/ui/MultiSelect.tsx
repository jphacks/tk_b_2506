"use client";

import * as React from "react";
import { cn } from "@/utils/cn";

export interface MultiSelectProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (value: string[]) => void;
}

export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  ({ label, description, error, required, options, value, onChange }, ref) => {
    const toggleOption = (optionValue: string) => {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue));
      } else {
        onChange([...value, optionValue]);
      }
    };

    return (
      <div ref={ref} className="space-y-2">
        {label && (
          <label
            className={cn(
              "text-sm font-medium leading-none",
              error ? "text-destructive" : "text-foreground"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <div className="border border-input rounded-md p-3 space-y-2 bg-background">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>

        {description && !error && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);
MultiSelect.displayName = "MultiSelect";
