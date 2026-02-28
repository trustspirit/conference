// Re-export trust-ui-react Table as the primary Table component.
// Legacy compound Table components are kept for backwards compatibility.
import React from 'react'
export { Table as default } from 'trust-ui-react'

interface TableHeadProps {
  children: React.ReactNode
}

export function TableHead({ children }: TableHeadProps): React.ReactElement {
  return (
    <thead>
      <tr className="bg-[#F0F2F5] border-b border-[#DADDE1]">{children}</tr>
    </thead>
  )
}

interface TableHeaderProps {
  children: React.ReactNode
  className?: string
}

export function TableHeader({ children, className = '' }: TableHeaderProps): React.ReactElement {
  return (
    <th
      className={`px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide ${className}`}
    >
      {children}
    </th>
  )
}

interface TableBodyProps {
  children: React.ReactNode
}

export function TableBody({ children }: TableBodyProps): React.ReactElement {
  return <tbody>{children}</tbody>
}

interface TableRowProps {
  children: React.ReactNode
  onClick?: () => void
  isClickable?: boolean
  isSelected?: boolean
  className?: string
}

export function TableRow({
  children,
  onClick,
  isClickable = false,
  isSelected = false,
  className = ''
}: TableRowProps): React.ReactElement {
  return (
    <tr
      onClick={onClick}
      className={`
        border-b border-[#DADDE1] last:border-0 transition-colors
        ${isClickable ? 'hover:bg-[#F0F2F5] cursor-pointer' : ''}
        ${isSelected ? 'bg-[#E7F3FF]/50' : ''}
        ${className}
      `}
    >
      {children}
    </tr>
  )
}

interface TableCellProps {
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export function TableCell({
  children,
  className = '',
  onClick
}: TableCellProps): React.ReactElement {
  return (
    <td className={`px-4 py-3 ${className}`} onClick={onClick}>
      {children}
    </td>
  )
}
