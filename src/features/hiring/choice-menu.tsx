"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export type MenuOption = { value: string; label: string; count?: number };

/**
 * A small select that opens a list under its button: the chevron turns as it opens, the list slides in, and the
 * chosen row carries a check. Arrow keys move, Enter picks, Escape or a click outside closes.
 */
export function ChoiceMenu({ value, options, onChange, label, prefix, icon, className, buttonClassName, align = "left" }: {
  value: string;
  options: MenuOption[];
  onChange: (value: string) => void;
  /** Accessible name of the button. */
  label: string;
  /** Text before the chosen value, like "Sort:". */
  prefix?: string;
  icon?: ReactNode;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function show() {
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  }
  function pick(option: MenuOption) {
    onChange(option.value);
    setOpen(false);
  }
  function onKeyDown(event: React.KeyboardEvent) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) { event.preventDefault(); show(); return; }
    if (!open) return;
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
    else if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(options.length - 1, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pick(options[active]); }
    else if (event.key === "Tab") setOpen(false);
  }

  return (
    <div ref={root} className={cn("relative", className)} onKeyDown={onKeyDown}>
      <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        className={cn("group flex w-full min-w-0 items-center gap-2.5 text-left outline-none", buttonClassName)}>
        {icon}
        <span className="min-w-0 flex-1 truncate">
          {prefix ? <span>{prefix}&nbsp;</span> : null}
          <span className={cn(current?.value ? "text-foreground" : "text-muted")}>{current?.label}</span>
        </span>
        <ChevronDown aria-hidden="true"
          className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200 ease-[var(--motion-ease)] group-hover:text-foreground", open && "rotate-180 text-primary")} />
      </button>
      {open ? (
        <ul ref={list} id={listId} role="listbox" aria-label={label}
          className={cn("menu-drop absolute top-[calc(100%+8px)] z-30 max-h-72 min-w-full overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-1.5 shadow-float",
            align === "right" ? "right-0" : "left-0")}>
          {options.map((option, index) => {
            const selected = option.value === current?.value;
            return (
              <li key={option.value || "all"} role="option" aria-selected={selected}
                onPointerEnter={() => setActive(index)} onClick={() => pick(option)}
                className={cn("flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                  index === active ? "bg-surface-muted text-foreground" : "text-muted", selected && "font-medium text-foreground")}>
                <Check aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0 text-primary transition-opacity", selected ? "opacity-100" : "opacity-0")} />
                <span className="min-w-0 flex-1">{option.label}</span>
                {option.count != null ? <span className="font-mono text-xs tabular-nums text-muted">{option.count}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
