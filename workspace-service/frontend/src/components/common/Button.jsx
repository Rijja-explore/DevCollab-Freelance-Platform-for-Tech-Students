import React from 'react';

const styles = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease, transform 0.1s ease',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },

  // Variants
  primary: {
    background: 'var(--color-teal)',
    color: '#0a0e1a',
    borderColor: 'var(--color-teal)',
  },
  secondary: {
    background: 'transparent',
    color: '#e2e8f0',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  danger: {
    background: 'var(--color-coral)',
    color: '#0a0e1a',
    borderColor: 'var(--color-coral)',
  },

  // Sizes
  sm: {
    padding: '6px 12px',
    fontSize: '0.8125rem',
  },
  md: {
    padding: '10px 20px',
    fontSize: '0.9375rem',
  },

  // States
  disabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
};

/**
 * Button component
 *
 * @param {Object}   props
 * @param {'primary'|'secondary'|'danger'} [props.variant='primary'] - Visual variant
 * @param {'sm'|'md'}                      [props.size='md']         - Size preset
 * @param {function}                       [props.onClick]           - Click handler
 * @param {boolean}                        [props.disabled=false]    - Disabled state
 * @param {string}                         [props.type='button']     - HTML button type
 * @param {React.ReactNode}                [props.children]          - Button content
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
  children,
  ...rest
}) {
  const variantStyle = styles[variant] ?? styles.primary;
  const sizeStyle = styles[size] ?? styles.md;

  const combinedStyle = {
    ...styles.base,
    ...variantStyle,
    ...sizeStyle,
    ...(disabled ? styles.disabled : {}),
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={combinedStyle}
      {...rest}
    >
      {children}
    </button>
  );
}
