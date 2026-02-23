import React from 'react'
import Skeleton from './Skeleton'

interface SearchResultsSkeletonProps {
  count?: number
}

function SearchResultsSkeleton({ count = 3 }: SearchResultsSkeletonProps): React.ReactElement {
  return (
    <div className="absolute top-full left-0 right-0 bg-white rounded-lg shadow-lg mt-2 overflow-hidden z-50 border border-[#DADDE1]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-[#F0F2F5] last:border-b-0">
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-3 w-64 mb-1" />
          <Skeleton className="h-3 w-48" />
        </div>
      ))}
    </div>
  )
}

export default SearchResultsSkeleton
