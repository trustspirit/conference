import React from 'react'

function Spinner(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-gray-300 border-t-primary rounded-full animate-spin" />
    </div>
  )
}

export default Spinner
