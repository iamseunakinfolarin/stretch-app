"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: React.ReactNode };

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const TABS: Tab[] = [
  {
    href: "/",
    label: "Pray",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3c2.2 2.6 3.6 4.7 3.6 6.9A3.6 3.6 0 0 1 12 13.5a3.6 3.6 0 0 1-3.6-3.6C8.4 7.7 9.8 5.6 12 3Z" />
        <path d="M9 17h6M10 20.5h4M12 13.5V17" />
      </svg>
    ),
  },
  {
    href: "/prayers",
    label: "My Prayers",
    icon: (
      <svg {...iconProps}>
        <path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3v-12Z" />
        <path d="M9 9h6M9 12.5h4" />
      </svg>
    ),
  },
  {
    href: "/testimonies",
    label: "Testimonies",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3.5l2.5 5.3 5.7.7-4.2 4 1.1 5.7L12 16.4l-5.1 2.8L8 13.5l-4.2-4 5.7-.7L12 3.5Z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c.8-3.4 3.5-5.2 7-5.2s6.2 1.8 7 5.2" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 pb-safe-bar backdrop-blur"
    >
      <ul className="mx-auto flex h-tabbar w-full max-w-md items-stretch px-1">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full min-h-tap flex-col items-center justify-center gap-1 rounded-control font-mono text-[0.625rem] font-medium tracking-[0.08em] uppercase ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
