import Link from "next/link";
import type { ComponentProps } from "react";

type LinkProps = { href: ComponentProps<typeof Link>["href"] } & Omit<
  ComponentProps<typeof Link>,
  "href"
>;
type ButtonProps = ComponentProps<"button"> & { href?: never };
type Props = LinkProps | ButtonProps;

export function Button(props: Props) {
  const className =
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-50 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur transition hover:bg-white/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

  if ("href" in props && props.href) {
    const { href, className: cn, ...rest } = props as LinkProps;
    return (
      <Link
        href={href}
        className={cn ? `${className} ${cn}` : className}
        {...rest}
      />
    );
  }

  const { className: cn, ...rest } = props as ButtonProps;
  return <button className={cn ? `${className} ${cn}` : className} {...rest} />;
}

