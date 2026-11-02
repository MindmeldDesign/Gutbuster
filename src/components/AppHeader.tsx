import Link from "next/link";

// Top bar from the Figma "F-Home" frame (PhoneHeader, node 3:18):
// cream field, 4px turquoise rule underneath, Bowlby wordmark on the
// left, Feather icons on the right. The phone status row in the Figma
// frame is a mock of the OS status bar, so it is not rebuilt here; the
// real phone draws its own, and .safe-top keeps us clear of it.
//
// Cast and Bell are visual only for now (no feature behind them yet).
// Search goes to the placeholder Search screen.

export default function AppHeader() {
  return (
    <header className="safe-top sticky top-0 z-20 border-b-4 border-gb-turquoise bg-gb-cream">
      <div className="flex items-center justify-between px-4 py-2">
        <Link
          href="/"
          className="pt-0.5 gb-wordmark font-display leading-normal text-gb-ink"
          aria-label="Gutbuster home"
        >
          GUTBUSTER
        </Link>

        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="block size-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/cast.svg" alt="" width={24} height={24} />
          </span>
          <Link href="/search" aria-label="Search" className="block size-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/search.svg" alt="" width={24} height={24} />
          </Link>
          <span aria-hidden="true" className="block size-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/bell.svg" alt="" width={24} height={24} />
          </span>
        </div>
      </div>
    </header>
  );
}
