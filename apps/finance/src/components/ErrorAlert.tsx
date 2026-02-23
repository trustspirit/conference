interface Props {
  errors: string[]
  title?: string
}

export default function ErrorAlert({ errors, title }: Props) {
  if (errors.length === 0) return null
  return (
    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
      {title && <p className="text-sm font-medium text-red-800 mb-1">{title}</p>}
      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
        {errors.map((err, i) => <li key={i}>{err}</li>)}
      </ul>
    </div>
  )
}
