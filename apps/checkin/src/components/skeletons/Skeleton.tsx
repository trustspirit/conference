import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
}

function Skeleton({ className = '', width, height }: SkeletonProps): React.ReactElement {
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return <div className={`bg-[#E4E6EB] rounded animate-pulse ${className}`} style={style} />
}

export default Skeleton
