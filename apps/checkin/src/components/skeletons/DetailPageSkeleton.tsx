import React from 'react'
import Skeleton from './Skeleton'

interface DetailPageSkeletonProps {
  type: 'participant' | 'group' | 'room'
}

function DetailPageSkeleton({ type }: DetailPageSkeletonProps): React.ReactElement {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="bg-white rounded-lg border border-[#DADDE1] shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-6 pb-6 border-b border-[#DADDE1]">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </div>

        {type === 'participant' && (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#DADDE1]">
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="bg-[#F0F2F5] rounded-md p-3">
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <Skeleton className="h-5 w-48 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-32 rounded-md" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-32 rounded-md" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Skeleton className="h-5 w-36 mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-[#F0F2F5] rounded-md px-4 py-3 flex justify-between">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-6 w-20 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {(type === 'group' || type === 'room') && (
          <div>
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-[#F0F2F5] rounded-lg"
                >
                  <div>
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-16 rounded" />
                    <Skeleton className="h-8 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DetailPageSkeleton
