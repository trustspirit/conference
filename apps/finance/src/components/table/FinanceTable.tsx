import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

type FinanceTableVariant = 'panel' | 'embedded' | 'plain'
type FinanceTableTone = 'default' | 'soft'
type FinanceTableSize = 'default' | 'compact'
type FinanceTableAlign = 'left' | 'center' | 'right'

interface FinanceTableProps extends TableHTMLAttributes<HTMLTableElement> {
  minWidthClassName?: string
  variant?: FinanceTableVariant
  wrapperClassName?: string
}

interface FinanceTableSectionProps extends HTMLAttributes<HTMLTableSectionElement> {
  tone?: FinanceTableTone
}

interface FinanceTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean
  selected?: boolean
}

interface FinanceTableCellProps {
  align?: FinanceTableAlign
  size?: FinanceTableSize
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function wrapperClass(variant: FinanceTableVariant) {
  if (variant === 'embedded') return 'finance-table-embedded rounded-lg overflow-x-auto'
  if (variant === 'plain') return 'overflow-x-auto'
  return 'finance-panel rounded-lg overflow-x-auto'
}

function alignClass(align: FinanceTableAlign) {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

function cellSizeClass(size: FinanceTableSize) {
  return size === 'compact' ? 'finance-table-cell-compact' : 'finance-table-cell-default'
}

function Root({
  children,
  className,
  minWidthClassName,
  variant = 'panel',
  wrapperClassName,
  ...props
}: FinanceTableProps) {
  return (
    <div className={classNames(wrapperClass(variant), wrapperClassName)}>
      <table className={classNames('finance-table', minWidthClassName, className)} {...props}>
        {children}
      </table>
    </div>
  )
}

function Head({ className, tone = 'default', ...props }: FinanceTableSectionProps) {
  return (
    <thead
      className={classNames(
        tone === 'soft' ? 'finance-table-head-soft' : 'finance-table-head',
        className
      )}
      {...props}
    />
  )
}

function Body({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={classNames('finance-table-body', className)} {...props} />
}

function Footer({ className, tone = 'default', ...props }: FinanceTableSectionProps) {
  return (
    <tfoot
      className={classNames(
        tone === 'soft' ? 'finance-table-footer-soft' : 'finance-table-footer',
        className
      )}
      {...props}
    />
  )
}

function Row({ className, hover = true, selected, ...props }: FinanceTableRowProps) {
  return (
    <tr
      className={classNames(
        hover && 'finance-table-row',
        selected && 'finance-table-row-selected',
        className
      )}
      {...props}
    />
  )
}

function Th({
  align = 'left',
  className,
  size = 'default',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & FinanceTableCellProps) {
  return (
    <th
      className={classNames('finance-table-th', cellSizeClass(size), alignClass(align), className)}
      {...props}
    />
  )
}

function Td({
  align = 'left',
  className,
  size = 'default',
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & FinanceTableCellProps) {
  return (
    <td
      className={classNames('finance-table-td', cellSizeClass(size), alignClass(align), className)}
      {...props}
    />
  )
}

const FinanceTable = Object.assign(Root, {
  Body,
  Footer,
  Head,
  Row,
  Td,
  Th
})

export default FinanceTable
