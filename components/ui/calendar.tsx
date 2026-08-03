"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    components: userComponents,
    ...props
}: CalendarProps) {
    const defaultClassNames = {
        months: "relative flex flex-col sm:flex-row gap-4",
        month: "w-full",
        month_caption: "relative mx-8 mb-1 flex h-8 items-center justify-center z-20",
        caption_label: "text-[13px] font-semibold text-[var(--label-primary)]",
        nav: "absolute top-0 flex w-full justify-between z-10",
        button_previous: cn(
            buttonVariants({ variant: "ghost" }),
            "size-7 text-[var(--label-tertiary)] hover:text-[var(--label-primary)] hover:bg-[var(--fill-tertiary)] p-0",
        ),
        button_next: cn(
            buttonVariants({ variant: "ghost" }),
            "size-7 text-[var(--label-tertiary)] hover:text-[var(--label-primary)] hover:bg-[var(--fill-tertiary)] p-0",
        ),
        weekday: "size-8 p-0 text-[11px] font-medium text-[var(--label-tertiary)]",
        day_button:
            "relative flex size-8 items-center justify-center whitespace-nowrap rounded-[8px] p-0 text-[12px] text-[var(--label-primary)] outline-offset-2 group-[[data-selected]:not(.range-middle)]:[transition-property:color,background-color,border-radius,box-shadow] group-[[data-selected]:not(.range-middle)]:duration-150 focus:outline-none group-data-[disabled]:pointer-events-none focus-visible:z-10 hover:bg-[var(--fill-tertiary)] group-data-[selected]:bg-[var(--blue)] hover:text-[var(--label-primary)] group-data-[selected]:text-white group-data-[disabled]:text-[var(--label-tertiary)] group-data-[disabled]:line-through group-data-[outside]:text-[var(--label-tertiary)] group-data-[outside]:group-data-[selected]:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue)]/70 group-[.range-start:not(.range-end)]:rounded-e-none group-[.range-end:not(.range-start)]:rounded-s-none group-[.range-middle]:rounded-none group-data-[selected]:group-[.range-middle]:bg-[var(--blue)]/15 group-data-[selected]:group-[.range-middle]:text-[var(--label-primary)]",
        day: "group size-8 px-0 text-[12px]",
        range_start: "range-start",
        range_end: "range-end",
        range_middle: "range-middle",
        today:
            "*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-[var(--blue)] [&[data-selected]:not(.range-middle)>*]:after:bg-white [&[data-disabled]>*]:after:bg-[var(--label-tertiary)] *:after:transition-colors",
        outside: "text-[var(--label-tertiary)] data-selected:bg-[var(--blue)]/10 data-selected:text-[var(--label-tertiary)]",
        hidden: "invisible",
        week_number: "size-8 p-0 text-[11px] font-medium text-[var(--label-tertiary)]",
    }

    const mergedClassNames: typeof defaultClassNames = Object.keys(defaultClassNames).reduce(
        (acc, key) => ({
            ...acc,
            [key]: classNames?.[key as keyof typeof classNames]
                ? cn(
                    defaultClassNames[key as keyof typeof defaultClassNames],
                    classNames[key as keyof typeof classNames],
                )
                : defaultClassNames[key as keyof typeof defaultClassNames],
        }),
        {} as typeof defaultClassNames,
    )

    const defaultComponents = {
        Chevron: (props: any) => {
            if (props.orientation === "left") {
                return <ChevronLeft size={16} strokeWidth={2} {...props} aria-hidden="true" />
            }
            return <ChevronRight size={16} strokeWidth={2} {...props} aria-hidden="true" />
        },
    }

    const mergedComponents = {
        ...defaultComponents,
        ...userComponents,
    }

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("w-fit p-3", className)}
            classNames={mergedClassNames}
            components={mergedComponents}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
