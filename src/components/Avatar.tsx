import { UserRound } from "lucide-react";

// A person's avatar: their real photo when available, otherwise a neutral
// anonymous user icon (never initials). No hooks -> usable in server & client.
export function Avatar({
  image,
  name,
  className = "h-7 w-7",
  iconClassName = "h-4 w-4",
}: {
  image?: string | null;
  name?: string;
  className?: string;
  iconClassName?: string;
}) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name ?? ""} className={`${className} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[var(--text-muted)] ring-1 ring-[var(--border)] dark:bg-white/[0.06]`}
    >
      <UserRound className={iconClassName} />
    </span>
  );
}
