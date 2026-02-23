import React from 'react'
import Skeleton from './Skeleton'

interface CardGridSkeletonProps {
  count?: number
  columns?: 2 | 3 | 4
}

function CardGridSkeleton({ count = 8, columns = 4 }: CardGridSkeletonProps): React.ReactElement {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-[#DADDE1] p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default CardGridSkeleton
