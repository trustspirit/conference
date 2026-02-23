import React from 'react'
import Skeleton from './Skeleton'

function AuditLogSkeleton(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#DADDE1] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F0F2F5] border-b border-[#DADDE1]">
            <tr>
              {['Time', 'User', 'Action', 'Target', 'Details'].map((col) => (
                <th
                  key={col}
                  className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-[#DADDE1] last:border-b-0">
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-36" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-6 w-20 rounded" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-3 w-40" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AuditLogSkeleton
