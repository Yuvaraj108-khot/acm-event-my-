import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftElement,
  rightElement,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          {label}
          {props.required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leftElement && (
          <div style={{
            position: 'absolute', left: 12,
            color: 'var(--color-text-tertiary)',
            pointerEvents: 'none',
            display: 'flex', alignItems: 'center',
          }}>
            {leftElement}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          className={cn(
            'input',
            leftElement ? 'pl-10' : '',
            rightElement ? 'pr-10' : '',
            error ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : '',
            className
          )}
          style={{ paddingLeft: leftElement ? 40 : undefined, paddingRight: rightElement ? 40 : undefined }}
          {...props}
        />

        {rightElement && (
          <div style={{
            position: 'absolute', right: 12,
            color: 'var(--color-text-tertiary)',
            display: 'flex', alignItems: 'center',
          }}>
            {rightElement}
          </div>
        )}
      </div>

      {(error || hint) && (
        <p style={{ fontSize: 12, color: error ? '#ef4444' : 'var(--color-text-tertiary)' }}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Textarea variant
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label, error, hint, className, id, ...props
}, ref) => {
  const inputId = id || `textarea-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          {label}
          {props.required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn('input', error ? 'border-red-500' : '', className)}
        style={{ minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
        {...props}
      />
      {(error || hint) && (
        <p style={{ fontSize: 12, color: error ? '#ef4444' : 'var(--color-text-tertiary)' }}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Select variant
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label, error, options, className, id, ...props
}, ref) => {
  const inputId = id || `select-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          {label}
          {props.required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        className={cn('input', error ? 'border-red-500' : '', className)}
        style={{ cursor: 'pointer' }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ background: '#1a1a1a', color: '#f5f5f5' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
