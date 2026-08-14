/**
 * Registration form definition.
 *
 * Scope §B: "The registration form will be built so that additional fields can
 * be added later without breaking the existing flow."
 *
 * That requirement is met by making the form data-driven. To add a field, add
 * an entry here. If it has a column in `profiles`, set store: 'column'; if it
 * does not — which is the normal case for a late addition — set store: 'extra'
 * and it is written to the `extra` jsonb column with no migration needed.
 */

export type FieldType = 'text' | 'tel' | 'email'

export interface FieldDef {
  name: string
  label: string
  type: FieldType
  required: boolean
  autoComplete?: string
  placeholder?: string
  help?: string
  /** 'column' → a real column on profiles. 'extra' → the jsonb hatch. */
  store: 'column' | 'extra'
}

export const REGISTRATION_FIELDS: FieldDef[] = [
  {
    name: 'name',
    label: 'Full name',
    type: 'text',
    required: true,
    autoComplete: 'name',
    store: 'column',
  },
  {
    name: 'mobile',
    label: 'WhatsApp number',
    type: 'tel',
    required: true,
    autoComplete: 'tel',
    placeholder: '98765 43210',
    help: 'Used to sign in. One account per number.',
    store: 'column',
  },
  {
    name: 'company',
    label: 'Company',
    type: 'text',
    required: false,
    autoComplete: 'organization',
    store: 'column',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: false,
    autoComplete: 'email',
    store: 'column',
  },
]
