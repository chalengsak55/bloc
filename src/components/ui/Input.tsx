import type { ComponentProps } from "react";

export function Input(props: ComponentProps<"input">) {
  const { className, ...rest } = props;
  return (
    <input
      className={
        className
          ? `h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-transparent transition focus:border-white/20 focus:ring-fuchsia-400/20 ${className}`
          : "h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-transparent transition focus:border-white/20 focus:ring-fuchsia-400/20"
      }
      {...rest}
    />
  );
}

