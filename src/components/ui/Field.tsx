import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

type FieldProps = {
  label: string
  error?: string
  help?: string
  required?: boolean
  'aria-describedby'?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  (
    {
      label,
      error,
      help,
      required = false,
      id,
      className = '',
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, '-')
    const errorId = error ? `${fieldId}-error` : undefined
    const helpId = help ? `${fieldId}-help` : undefined
    const describedBy = [errorId, helpId, ariaDescribedBy].filter(Boolean).join(' ') || undefined

    return (
      <div className="w-full">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-[var(--color-fg)] mb-1.5"
        >
          {label}
          {required && (
            <span className="text-[var(--color-danger)] ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            className={[
              'w-full px-4 py-3',
              'bg-[var(--color-bg-elevated)]',
              'text-[var(--color-fg)]',
              'placeholder:text-[var(--color-fg-subtle)]',
              'border',
              'transition-all duration-200 ease-out',
              'rounded-lg',
              error
                ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:bg-[var(--color-bg-muted)] disabled:cursor-not-allowed',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-required={required}
            {...props}
          />
          {error && (
            <div
              className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
              aria-hidden="true"
            >
              <AlertCircle className="h-5 w-5 text-[var(--color-danger)]" />
            </div>
          )}
          {!error && props.value && required && (
            <div
              className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
              aria-hidden="true"
            >
              <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--color-danger)]"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}
        {help && !error && (
          <p
            id={helpId}
            className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)]"
          >
            <Info className="h-4 w-4 flex-shrink-0" />
            {help}
          </p>
        )}
      </div>
    )
  },
)

Field.displayName = 'Field'

/** Textarea field */
export const Textarea = forwardRef<HTMLTextAreaElement, Omit<FieldProps, 'type'> & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (
    {
      label,
      error,
      help,
      required = false,
      id,
      className = '',
      'aria-describedby': ariaDescribedBy,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, '-')
    const errorId = error ? `${fieldId}-error` : undefined
    const helpId = help ? `${fieldId}-help` : undefined
    const describedBy = [errorId, helpId, ariaDescribedBy].filter(Boolean).join(' ') || undefined

    return (
      <div className="w-full">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-[var(--color-fg)] mb-1.5"
        >
          {label}
          {required && (
            <span className="text-[var(--color-danger)] ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <div className="relative">
          <textarea
            ref={ref}
            id={fieldId}
            rows={rows}
            className={[
              'w-full px-4 py-3',
              'bg-[var(--color-bg-elevated)]',
              'text-[var(--color-fg)]',
              'placeholder:text-[var(--color-fg-subtle)]',
              'border',
              'transition-all duration-200 ease-out',
              'rounded-lg',
              'resize-y min-h-[100px]',
              error
                ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:bg-[var(--color-bg-muted)] disabled:cursor-not-allowed',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-required={required}
            {...props}
          />
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--color-danger)]"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}
        {help && !error && (
          <p
            id={helpId}
            className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)]"
          >
            <Info className="h-4 w-4 flex-shrink-0" />
            {help}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'

/** Select field */
export const Select = forwardRef<
  HTMLSelectElement,
  Omit<FieldProps, 'type' | 'onChange' | 'value' | 'checked' | 'defaultChecked' | 'size'> &
    SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }
>(
  (
    {
      label,
      error,
      help,
      required = false,
      id,
      className = '',
      options,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, '-')
    const errorId = error ? `${fieldId}-error` : undefined
    const helpId = help ? `${fieldId}-help` : undefined
    const describedBy = [errorId, helpId, ariaDescribedBy].filter(Boolean).join(' ') || undefined

    return (
      <div className="w-full">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-[var(--color-fg)] mb-1.5"
        >
          {label}
          {required && (
            <span className="text-[var(--color-danger)] ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            className={[
              'w-full px-4 py-3 pr-10',
              'bg-[var(--color-bg-elevated)]',
              'text-[var(--color-fg)]',
              'border',
              'transition-all duration-200 ease-out',
              'rounded-lg',
              'appearance-none',
              'bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 20 20%27 fill=%27currentColor%27%3E%3Cpath fill-rule=%27evenodd%27 d=%27M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z%27 clip-rule=%27evenodd%27/%3E%3C/svg%3E")]',
              'bg-no-repeat bg-right-3 bg-center',
              error
                ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:bg-[var(--color-bg-muted)] disabled:cursor-not-allowed',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-required={required}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--color-danger)]"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}
        {help && !error && (
          <p
            id={helpId}
            className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)]"
          >
            <Info className="h-4 w-4 flex-shrink-0" />
            {help}
          </p>
        )}
      </div>
    )
  },
)

Select.displayName = 'Select'

/** Checkbox field — consent toggles and similar. */
export const Checkbox = forwardRef<
  HTMLInputElement,
  {
    label: ReactNode
    error?: string
    required?: boolean
  } & Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>
>(({ label, error, required = false, id, className = '', ...props }, ref) => {
  const autoId = useId()
  const fieldId = id || autoId

  return (
    <div className="w-full">
      <label
        htmlFor={fieldId}
        className={['flex items-start gap-3 cursor-pointer select-none', className].join(' ')}
      >
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          className={[
            'mt-0.5 h-5 w-5 flex-shrink-0 rounded',
            'accent-[var(--color-accent)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
          ].join(' ')}
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required}
          {...props}
        />
        <span className="text-sm leading-relaxed text-[var(--color-fg)]">{label}</span>
      </label>
      {error && (
        <p
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--color-danger)]"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
})

Checkbox.displayName = 'Checkbox'

/** Form message for global errors/success */
export function FormMessage({
  children,
  tone = 'error',
  className = '',
}: {
  children: React.ReactNode
  tone?: 'error' | 'success' | 'warning' | 'info'
  className?: string
}) {
  const tones = {
    error: {
      bg: 'var(--color-danger-bg)',
      border: 'var(--color-danger)',
      text: 'var(--color-danger)',
      icon: AlertCircle,
    },
    success: {
      bg: 'var(--color-success-bg)',
      border: 'var(--color-success)',
      text: 'var(--color-success)',
      icon: CheckCircle,
    },
    warning: {
      bg: 'var(--color-warning-bg)',
      border: 'var(--color-warning)',
      text: 'var(--color-warning)',
      icon: AlertCircle,
    },
    info: {
      bg: 'var(--color-info-bg)',
      border: 'var(--color-info)',
      text: 'var(--color-info)',
      icon: Info,
    },
  }

  const { bg, border, text, icon: Icon } = tones[tone]

  return (
    <div
      className={[
        'flex items-start gap-3 p-4 rounded-lg border-l-4',
        `bg-[${bg}] border-[${border}] text-[${text}]`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}