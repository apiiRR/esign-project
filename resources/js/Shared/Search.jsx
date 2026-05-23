import { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { Filter, RotateCcw, Search, X } from "lucide-react";

function queryArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value.map(String) : [String(value)];
}

export default function SearchComponent({ URL, filters = [] }) {
    const { url } = usePage();
    const params = useMemo(() => new URLSearchParams(url.split("?")[1] || ""), [url]);
    const [search, setSearch] = useState(params.get("q") || "");
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(() => {
        return filters.reduce((carry, filter) => ({
            ...carry,
            [filter.key]: queryArray(params.getAll(`${filter.key}[]`).length ? params.getAll(`${filter.key}[]`) : params.getAll(filter.key)),
        }), {});
    });

    const activeCount = Object.values(selected).reduce((total, values) => total + values.length, 0);

    const submit = (event) => {
        event.preventDefault();
        const payload = {};
        if (search) payload.q = search;
        Object.entries(selected).forEach(([key, values]) => {
            if (values.length) payload[key] = values;
        });

        router.get(URL, payload, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const reset = () => {
        setSearch("");
        setSelected(filters.reduce((carry, filter) => ({ ...carry, [filter.key]: [] }), {}));
        router.get(URL, {}, { preserveScroll: true });
    };

    const toggle = (key, value) => {
        setSelected((current) => {
            const values = current[key] || [];
            const next = values.includes(String(value))
                ? values.filter((item) => item !== String(value))
                : [...values, String(value)];

            return { ...current, [key]: next };
        });
    };

    const activeChips = filters.flatMap((filter) => {
        const values = selected[filter.key] || [];
        return values.map((value) => {
            const option = (filter.options || []).find((item) => String(item.id) === String(value));
            return {
                key: filter.key,
                value,
                label: `${filter.label}: ${option?.name || value}`,
            };
        });
    });

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari data..."
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none"
                        />
                    </div>
                </div>

                {filters.length ? (
                    <button
                        type="button"
                        onClick={() => setOpen((value) => !value)}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                        {activeCount ? <span className="ml-2 rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">{activeCount}</span> : null}
                    </button>
                ) : null}

                <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                </button>
                <button type="button" onClick={reset} className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                </button>
            </div>

            {open && filters.length ? (
                <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                    {filters.map((filter) => (
                        <div key={filter.key}>
                            <div className="text-sm font-semibold text-gray-900">{filter.label}</div>
                            <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
                                {(filter.options || []).map((option) => (
                                    <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={(selected[filter.key] || []).includes(String(option.id))}
                                            onChange={() => toggle(filter.key, option.id)}
                                            className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                                        />
                                        <span>{option.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {(search || activeChips.length) ? (
                <div className="flex flex-wrap gap-2">
                    {search ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            Search: {search}
                        </span>
                    ) : null}
                    {activeChips.map((chip) => (
                        <button
                            key={`${chip.key}-${chip.value}`}
                            type="button"
                            onClick={() => toggle(chip.key, chip.value)}
                            className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        >
                            {chip.label}
                            <X className="ml-1 h-3 w-3" />
                        </button>
                    ))}
                </div>
            ) : null}
        </form>
    );
}
