import type { ReactNode } from "react";

export default function Page({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`w-full px-10 pb-8 md:px-16 ${className}`}>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </section>
  );
}
