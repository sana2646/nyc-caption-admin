'use client'

export default function ConfirmButton({
  children,
  message,
  className = 'btn btn-sm btn-danger',
}: {
  children: React.ReactNode
  message: string
  className?: string
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
