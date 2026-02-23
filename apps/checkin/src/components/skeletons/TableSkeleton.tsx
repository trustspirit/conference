import React from 'react'
import Skeleton from './Skeleton'

interface TableSkeletonProps {
  columns: number
  rows?: number
  showHeader?: boolean
}

function TableSkeleton({
  columns,
  rows = 5,
  showHeader = true
}: TableSkeletonProps): React.ReactElement {
  return (
    <div className="bg-white rounded-lg border border-[#DADDE1]">
      <table className="w-full">
        {showHeader && (
          <thead className="bg-[#F0F2F5] border-b border-[#DADDE1]">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b border-[#DADDE1] last:border-b-0">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <Skeleton
                    className="h-4"
                    width={colIdx === 0 ? '60%' : colIdx === columns - 1 ? '40px' : '80%'}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableSkeleton
