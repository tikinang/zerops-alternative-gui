<script>
  let {
    children,
    onclick,
    variant = 'primary', // primary | secondary | ghost | danger
    type = 'button',
    disabled = false,
    size = 'md', // sm | md
    ...rest
  } = $props();

  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700 disabled:bg-emerald-900 disabled:text-emerald-300/60',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 disabled:bg-slate-900 disabled:text-slate-500',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-200 border-transparent disabled:text-slate-600',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-700 disabled:bg-rose-900 disabled:text-rose-300/60',
  };
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  };
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="inline-flex items-center justify-center rounded-md border font-medium transition-colors disabled:cursor-not-allowed {variants[variant]} {sizes[size]}"
  {...rest}
>
  {@render children?.()}
</button>
