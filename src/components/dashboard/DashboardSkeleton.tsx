/** Placeholder shown while the overview loads, shaped like the real layout to avoid a jump. */
export function DashboardSkeleton() {
    return (
        <div className="space-y-6 md:space-y-8 pb-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
            <div className="space-y-2">
                <div className="h-8 w-2/3 max-w-md rounded-lg bg-gray-200" />
                <div className="h-4 w-1/2 max-w-xs rounded bg-gray-100" />
            </div>
            <div className="h-44 rounded-3xl border-2 border-border bg-white" />
            <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-40 rounded-3xl border-2 border-border bg-white p-6 space-y-4">
                        <div className="h-3 w-20 rounded bg-gray-200" />
                        <div className="h-9 w-28 rounded bg-gray-200" />
                        <div className="h-2 w-full rounded-full bg-gray-100" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[280px] rounded-2xl border-2 border-border bg-white p-6 space-y-3">
                        <div className="h-5 w-32 rounded bg-gray-200" />
                        <div className="h-10 w-full rounded-xl bg-gray-100" />
                        <div className="h-10 w-full rounded-xl bg-gray-100" />
                        <div className="h-10 w-full rounded-xl bg-gray-100" />
                    </div>
                ))}
            </div>
        </div>
    );
}
