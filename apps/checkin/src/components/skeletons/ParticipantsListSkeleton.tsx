import React from 'react'
import Skeleton from './Skeleton'

function ParticipantsListSkeleton(): React.ReactElement {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex gap-1 mb-4 border-b border-[#DADDE1]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-3">
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-[#DADDE1] shadow-sm">
        <div className="p-4 border-b border-[#DADDE1]">
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-10 w-80 rounded-full" />
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F0F2F5] border-b border-[#DADDE1]">
                {['Name', 'Email', 'Phone', 'Ward', 'Group', 'Room', 'Status'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#DADDE1] last:border-0">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-6 w-20 rounded-md" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ParticipantsListSkeleton
