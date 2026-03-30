"use client"

import { useState, useRef, useEffect, CSSProperties } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Spanish locale ──────────────────────────────────────────────────────────
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]

// ── Helpers ─────────────────────────────────────────────────────────────────
function parseLocalDate(str: string): Date | null {
  if (!str) return null
  const [y, m, d] = str.split("-").map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(y, m - 1, d)
}

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatDisplay(str: string): string {
  const d = parseLocalDate(str)
  if (!d) return ""
  const dia = String(d.getDate()).padStart(2, "0")
  const mes = MESES[d.getMonth()]
  return `${dia} de ${mes}, ${d.getFullYear()}`
}

interface CalendarCell {
  date: Date
  current: boolean
}

function buildCalendarCells(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month, 1).getDay()
  // Convert Sunday-start to Monday-start (0=Mon … 6=Sun)
  const offset = firstDay === 0 ? 6 : firstDay - 1

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear  = month === 0 ? year - 1 : year
  const daysInPrev = new Date(prevYear, prevMonth + 1, 0).getDate()
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear  = month === 11 ? year + 1 : year

  const cells: CalendarCell[] = []

  // Trailing days from the previous month
  for (let i = offset - 1; i >= 0; i--) {
    cells.push({ date: new Date(prevYear, prevMonth, daysInPrev - i), current: false })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), current: true })
  }
  // Leading days from next month (fill last row)
  const remainder = cells.length % 7
  if (remainder !== 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      cells.push({ date: new Date(nextYear, nextMonth, d), current: false })
    }
  }

  return cells
}

// ── Component ────────────────────────────────────────────────────────────────
export interface DatePickerProps {
  /** Fecha seleccionada en formato YYYY-MM-DD */
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Etiqueta visible encima del trigger */
  label?: string
  /** Fecha mínima seleccionable (YYYY-MM-DD) */
  minDate?: string
  /** Fecha máxima seleccionable (YYYY-MM-DD) */
  maxDate?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  disabled = false,
  className,
  label,
  minDate,
  maxDate,
  id,
}: DatePickerProps) {
  const todayStr = toISODate(new Date())

  // Calendar view state (what month is currently displayed)
  const seedDate = value ? parseLocalDate(value) : new Date()
  const [viewYear, setViewYear]     = useState(seedDate?.getFullYear() ?? new Date().getFullYear())
  const [viewMonth, setViewMonth]   = useState(seedDate?.getMonth()    ?? new Date().getMonth())
  const [isOpen, setIsOpen]         = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({})
  const [mounted, setMounted]       = useState(false)

  const wrapperRef  = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerId   = id ?? "date-picker-trigger"

  // Needed to avoid SSR mismatch with createPortal
  useEffect(() => { setMounted(true) }, [])

  // Compute fixed position from the trigger's bounding rect
  const computePosition = () => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      width: 288,
      zIndex: 9999,
    })
  }

  // Sync the calendar view when external value changes
  useEffect(() => {
    if (value) {
      const d = parseLocalDate(value)
      if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()) }
    }
  }, [value])

  // Close on outside click — must check both wrapper and portal dropdown
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      const inWrapper  = wrapperRef.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inWrapper && !inDropdown) setIsOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false) }
    if (isOpen) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isOpen])

  // Reposition on scroll or resize while open
  useEffect(() => {
    if (!isOpen) return
    window.addEventListener("scroll", computePosition, true)
    window.addEventListener("resize", computePosition)
    return () => {
      window.removeEventListener("scroll", computePosition, true)
      window.removeEventListener("resize", computePosition)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleOpen = () => {
    if (disabled) return
    if (!isOpen) computePosition()
    setIsOpen(o => !o)
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // ── Selection logic ────────────────────────────────────────────────────────
  const isDateDisabled = (str: string) =>
    (!!minDate && str < minDate) || (!!maxDate && str > maxDate)

  const handleDaySelect = (date: Date, isCurrent: boolean) => {
    const str = toISODate(date)
    if (isDateDisabled(str)) return
    if (!isCurrent) { setViewYear(date.getFullYear()); setViewMonth(date.getMonth()) }
    onChange?.(str)
    setIsOpen(false)
  }

  const handleTodayClick = () => {
    const today = new Date()
    const str   = toISODate(today)
    if (!isDateDisabled(str)) onChange?.(str)
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange?.("")
    setIsOpen(false)
  }

  const cells = buildCalendarCells(viewYear, viewMonth)

  // ── Calendar panel (rendered via portal) ───────────────────────────────────
  const calendarPanel = (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-modal="true"
      aria-label="Seleccionar fecha"
      style={dropdownStyle}
      className={cn(
        "bg-surface border border-border-default rounded-xl",
        "shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden",
        "animate-fade-in-up"
      )}
    >
          {/* ── Month / Year header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Mes anterior"
              className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-surface-highest transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-display text-sm tracking-widest uppercase text-white select-none">
              {MESES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={goToNext}
              aria-label="Mes siguiente"
              className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-surface-highest transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 pt-3 pb-1">
            {/* ── Day-of-week headers ── */}
            <div className="grid grid-cols-7 mb-1.5">
              {DIAS_SEMANA.map(d => (
                <div
                  key={d}
                  className="flex items-center justify-center h-6 text-[10px] font-bold text-text-muted uppercase tracking-widest"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* ── Day cells grid ── */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map(({ date, current }, i) => {
                const str        = toISODate(date)
                const isSelected = str === value
                const isToday    = str === todayStr
                const isDisabled = isDateDisabled(str)

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && handleDaySelect(date, current)}
                    className={cn(
                      "flex items-center justify-center h-8 w-full rounded-md text-xs transition-all duration-150",
                      // Other-month cells are faded
                      !current && "opacity-[0.22]",
                      // Normal current-month day
                      current && !isSelected && !isDisabled &&
                        "text-text-primary hover:bg-surface-highest",
                      // Today ring (not selected)
                      isToday && !isSelected &&
                        "ring-1 ring-inset ring-primary/50 text-white font-semibold",
                      // Selected day
                      isSelected && [
                        "bg-primary/20 ring-1 ring-inset ring-primary/60",
                        "text-white font-semibold",
                        "shadow-[0_0_10px_rgba(82,82,91,0.35)]",
                      ],
                      // Disabled
                      isDisabled && "opacity-20 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-white/5 px-4 py-2.5 flex items-center justify-between">
            {/* Clear — only shown when a date is selected */}
            {value ? (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-[10px] font-bold text-text-muted hover:text-danger uppercase tracking-widest transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            ) : (
              <span />
            )}

          {/* Jump to today */}
            <button
              type="button"
              onClick={handleTodayClick}
              className="text-[10px] font-display tracking-widest uppercase text-text-muted hover:text-primary transition-colors"
            >
              Hoy
            </button>
          </div>
        </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      {/* Label */}
      {label && (
        <label
          htmlFor={triggerId}
          className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2"
        >
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={handleOpen}
        className={cn(
          "flex w-full items-center justify-between gap-3",
          "bg-surface-high border border-border-subtle rounded-lg px-4 py-3",
          "text-left transition-all duration-300",
          "focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
          isOpen && "border-primary/50 ring-2 ring-primary/10",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn("text-sm", value ? "text-text-primary" : "text-text-muted")}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarDays
          className={cn(
            "w-4 h-4 shrink-0 transition-colors",
            isOpen ? "text-primary" : "text-text-muted"
          )}
        />
      </button>

      {/* Calendar via portal — escapes any CSS stacking context */}
      {mounted && isOpen && createPortal(calendarPanel, document.body)}
    </div>
  )
}
