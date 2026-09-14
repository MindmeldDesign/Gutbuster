const CATEGORIES = ["Improv", "Standup", "Sketch"];

export default function NavBar() {
  return (
    <header className="border-b-3 border-gb-black bg-gb-cream sticky top-0 z-10">
      <div className="max-w-6xl mx-auto flex items-center gap-8 px-4 py-3">
        <a
          href="/"
          className="font-sans text-xl bg-gb-yellow border-2 border-gb-black px-2 py-1 gb-shadow"
        >
          GUTBUSTER
        </a>
        <nav className="flex gap-6">
          {CATEGORIES.map((cat) => (
            <a
              key={cat}
              href={`/${cat.toLowerCase()}`}
              className="font-sans text-sm uppercase tracking-wide hover:text-gb-blue transition-colors"
            >
              {cat}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
