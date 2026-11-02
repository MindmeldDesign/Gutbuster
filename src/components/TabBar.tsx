"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bottom bar from the Figma "F-Home" frame (TabBar, node 3:2): cream
// field, 4px turquoise rule on top, three equal tabs, each a 24px
// Feather icon over a Space Grotesk Bold 16px label.

const TABS = [
  { href: "/search", label: "Search", icon: "/icons/search.svg" },
  { href: "/add", label: "Add", icon: "/icons/plus-square.svg" },
  { href: "/you", label: "You", icon: "/icons/user.svg" },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md items-start border-t-4 border-gb-turquoise bg-gb-cream pt-3"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className="flex min-w-px flex-1 flex-col items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tab.icon} alt="" width={24} height={24} className="size-6" />
            <span
              className={`font-ui text-base font-bold leading-6 text-gb-ink ${
                active ? "underline decoration-2 underline-offset-4" : ""
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
