const variants = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-dark focus-visible:outline-brand',
  secondary: 'border border-line bg-white text-ink hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  const sizes = {
    sm: 'min-h-9 rounded-lg px-3 text-xs',
    md: 'min-h-10 rounded-xl px-4 text-sm',
    lg: 'min-h-12 rounded-xl px-5 text-sm',
    icon: 'size-10 rounded-xl',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
