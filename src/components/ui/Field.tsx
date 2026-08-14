import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

/**
 * Form fields.
 *
 * Underline inputs rather than boxes: on an ivory page a full border draws
 * more attention than the value inside it. The API is unchanged from before —
 * only the appearance moved — so every existing form kept working.
 */
const INPUT =
  'w-full border-b border-charcoal-200 bg-transparent px-0 py-3 text-base font-light text-charcoal-800 transition-colors duration-300 placeholder:text-charcoal-300 focus:border-charcoal-800 focus:outline-none'

const LABEL = 'mb-2.5 block text-[0.7rem] font-medium tracking-[0.2em] text-charcoal-500 uppercase'

export function Field({
  label,
  help,
  error,
  required,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  help?: string
  error?: string
}) {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  return (
    <div className="mb-7">
      <label htmlFor={id} className={LABEL}>
        {label}
        {required ? (
          <span className="ml-1 text-champagne-600">*</span>
        ) : (
          <span className="ml-2 text-charcoal-300 normal-case">optional</span>
        )}
      </label>

      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[help && helpId, error && errorId].filter(Boolean).join(' ') || undefined}
        className={`${INPUT} ${error ? 'border-danger' : ''} ${className}`}
        {...props}
      />

      {help && !error && (
        <p id={helpId} className="mt-1.5 text-xs font-light text-charcoal-400">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-light text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextArea({
  label,
  help,
  error,
  required,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  help?: string
  error?: string
}) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="mb-7">
      <label htmlFor={id} className={LABEL}>
        {label}
        {!required && <span className="ml-2 text-charcoal-300 normal-case">optional</span>}
      </label>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${INPUT} resize-y ${error ? 'border-danger' : ''} ${className}`}
        {...props}
      />
      {help && !error && <p className="mt-1.5 text-xs font-light text-charcoal-400">{help}</p>}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-light text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function Checkbox({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; error?: string }) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="mb-8">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-charcoal-900"
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed font-light text-charcoal-500">
          {label}
        </label>
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-light text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** Form-level message, for errors not tied to one field. */
export function FormMessage({
  tone,
  children,
}: {
  tone: 'error' | 'success'
  children: React.ReactNode
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={[
        'mb-6 border-l-2 bg-ivory-50 px-4 py-3 text-sm font-light',
        tone === 'error' ? 'border-danger text-danger' : 'border-success text-success',
      ].join(' ')}
    >
      {children}
    </p>
  )
}
