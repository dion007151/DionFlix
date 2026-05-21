export function SkeletonRows() {
  return (
    <div className="space-y-10 px-4 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="skeleton h-[58vh] rounded-md" />
      </div>
      {[0, 1, 2].map((row) => (
        <section key={row} className="mx-auto max-w-7xl">
          <div className="skeleton mb-4 h-7 w-52 rounded" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton aspect-[16/10] rounded-md" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
