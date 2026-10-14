"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home", icon: "🏠", membersOnly: false },
  { href: "/create", label: "Create", icon: "📸", membersOnly: true },
  { href: "/top", label: "Top", icon: "🏆", membersOnly: false },
  { href: "/members", label: "Members", icon: "👥", membersOnly: true },
];

export default function NavLinks({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <div className="nav-links">
      {LINKS.filter((link) => signedIn || !link.membersOnly).map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "nav-link active" : "nav-link"}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden="true">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
