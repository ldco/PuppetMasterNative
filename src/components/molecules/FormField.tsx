import type { ComponentProps } from 'react'

import { Input } from '@/components/atoms/Input'

type InputProps = Omit<ComponentProps<typeof Input>, 'label'>

interface FormFieldProps extends InputProps {
  label: string
  required?: boolean
}

export function FormField({ label, required = false, ...inputProps }: FormFieldProps) {
  return <Input {...inputProps} label={required ? `${label} *` : label} />
}
