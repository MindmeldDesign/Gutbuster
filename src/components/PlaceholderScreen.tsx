// Stand-in for tabs that don't have a feature behind them yet, so the
// bottom bar never leads to a 404.
export default function PlaceholderScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2 p-4 pt-10">
      <h1 className="font-ui text-xl font-bold text-gb-ink">{title}</h1>
      <p className="text-base text-gb-ink">{body}</p>
    </div>
  );
}
