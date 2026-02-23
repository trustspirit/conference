import React from 'react'

interface ExpandArrowProps {
  isExpanded: boolean
}

function ExpandArrow({ isExpanded }: ExpandArrowProps): React.ReactElement {
  return (
    <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
  )
}

export default ExpandArrow
