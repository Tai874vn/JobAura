"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownWideNarrow, BriefcaseBusiness, Check, ListChecks, ListOrdered, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/features/auth/use-session";
import { hiringPostsApi, hiringPostSorts, type FacetCount, type HiringPostFilters } from "@/shared/api/endpoints/hiring-posts";
import { queryKeys } from "@/shared/api/query-keys";
import { ButtonLink, EmptyState, Pagination } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import { occupationLabel } from "@/features/occupations/api";
import { employmentTypes, hiringPostLevels } from "./hiring-post-form";
import { HiringPostResultCard } from "./hiring-post-result-card";
import { ChoiceMenu } from "./choice-menu";
import { hiringPostViewer } from "./hiring-post-viewer";

const pageSize = 10;
/** The backend lists at most this many pages of open posts (MAX_HIRING_POST_PAGE); later pages are a 400. */
export const maxHiringPostPage = 100;

/** How many matching roles lie past the last page the list can show, so the reader can be asked to narrow it. */
export function rolesPastLastPage(total: number, totalPages: number, size = pageSize) {
  return Math.max(0, total - totalPages * size);
}

const filterKeys = ["keyword", "occupation", "level", "employmentType", "location", "sort"] as const;
type FilterKey = (typeof filterKeys)[number];
type Filters = Record<FilterKey, string>;
type MultiKey = "occupation" | "level" | "employmentType";
// Quick searches under the search bar until the backend says which occupations have the most open roles.
const fallbackExplore = ["Software developer", "Data analyst", "Product manager", "Graphic designer", "Business analyst"];
const sortLabels: Record<(typeof hiringPostSorts)[number], string> = {
  newest: "Newest",
  closing_soon: "Closing soon",
  salary_high: "Highest salary",
};
/** "a,b" ⇄ ["a", "b"]: several values of one filter travel as one comma-separated URL value. */
const listOf = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const countOf = (counts: FacetCount[] | undefined, value: string) =>
  counts?.find((item) => item.value.toLowerCase() === value.toLowerCase())?.count;

/**
 * Open hiring posts, for everyone: a search band, a filter column that stays in view while the list scrolls, and
 * one card per role with View details and Apply. Every filter lives in the URL, so a filtered list can be shared.
 */
export function HiringPostsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const viewer = hiringPostViewer(user?.role);

  const applied = Object.fromEntries(filterKeys.map((key) => [key, searchParams.get(key) ?? ""])) as Filters;
  // A hand-edited ?page=500 would only get a 400, so it is read as the last page the backend serves.
  const page = Math.min(maxHiringPostPage, Math.max(1, Number(searchParams.get("page")) || 1));
  // What is typed but not searched yet; ticking a filter applies at once.
  const [keyword, setKeyword] = useState(applied.keyword);
  const [location, setLocation] = useState(applied.location);
  const [showFilters, setShowFilters] = useState(false);
  const resultsTop = useRef<HTMLDivElement>(null);
  const activeFilterCount = (["occupation", "level", "employmentType", "location"] as const)
    .reduce((sum, key) => sum + listOf(applied[key]).length, 0);
  const searching = activeFilterCount > 0 || Boolean(applied.keyword);

  const params: HiringPostFilters = {
    page,
    pageSize,
    ...Object.fromEntries(filterKeys.filter((key) => applied[key]).map((key) => [key, applied[key]])),
  };
  const query = useQuery({
    queryKey: queryKeys.hiringPosts(params),
    queryFn: () => hiringPostsApi.open(params),
    staleTime: 60_000,
    // Keep the current list on screen while the next filter's results load, instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
  // Counts beside each choice and the location list. Both are extras: without them the filters still work.
  const facetParams = Object.fromEntries(filterKeys.filter((key) => key !== "sort" && applied[key]).map((key) => [key, applied[key]]));
  const facets = useQuery({
    queryKey: queryKeys.hiringPostFacets(facetParams),
    queryFn: () => hiringPostsApi.facets(facetParams),
    staleTime: 60_000,
    retry: false,
    // Keep the counts (and the choices built from them) in place while new ones load, so the column doesn't jump.
    placeholderData: keepPreviousData,
  }).data?.content;
  const locations = useQuery({
    queryKey: queryKeys.hiringPostLocations,
    queryFn: hiringPostsApi.locations,
    staleTime: 300_000,
    retry: false,
  }).data?.content ?? [];
  const posts = query.data?.content?.data ?? [];
  const total = query.data?.content?.totalRow ?? 0;
  const totalPages = query.data?.content?.totalPages ?? 1;
  const firstShown = total ? (page - 1) * pageSize + 1 : 0;
  const lastShown = Math.min(page * pageSize, total);

  // New results (a search, a filter, another page) start at the top of the list.
  const resultsKey = searchParams.toString();
  const lastResultsKey = useRef(resultsKey);
  useEffect(() => {
    if (!query.data || lastResultsKey.current === resultsKey) return;
    lastResultsKey.current = resultsKey;
    const top = resultsTop.current;
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: "start" });
  }, [query.data, resultsKey]);

  function go(next: Partial<Filters>, nextPage = 1) {
    const merged = { ...applied, ...next };
    const url = new URLSearchParams();
    for (const key of filterKeys) if (merged[key].trim()) url.set(key, merged[key].trim());
    if (nextPage > 1) url.set("page", String(nextPage));
    const search = url.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }
  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go({ keyword, location });
  }
  function toggle(key: MultiKey, value: string) {
    const values = listOf(applied[key]);
    go({ [key]: (values.includes(value) ? values.filter((item) => item !== value) : [...values, value]).join(",") });
  }
  function reset() {
    setKeyword("");
    setLocation("");
    go({ keyword: "", occupation: "", level: "", employmentType: "", location: "" });
  }

  const typeChoices = [...new Set([...employmentTypes, ...(facets?.employmentTypes ?? []).map((item) => item.value).filter(Boolean)])];
  const locationChoices = (facets?.locations.length ? facets.locations : locations).slice(0, 5).map((item) => item.value);
  if (applied.location && !locationChoices.some((value) => value.toLowerCase() === applied.location.toLowerCase())) locationChoices.push(applied.location);
  const exploreChoices = facets?.occupations.length
    ? facets.occupations.slice(0, 4).map((item) => ({ label: occupationLabel(item.title), code: item.code, filter: { occupation: item.code, keyword: "" } }))
    : fallbackExplore.slice(0, 4).map((label) => ({ label, code: "", filter: { keyword: label } }));

  return (
    <div className="hiring-theme bg-background text-foreground">
      <section className="bg-surface-muted">
        <div className="container-page pt-8 lg:pt-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] sm:text-[44px] sm:leading-[1.5]">
                {viewer === "recruiter" ? "Browse hiring posts" : "Find a role and apply"}
              </h1>
              <p className="mt-1 text-[15px] text-muted">Open roles from recruiters on JobAura. Search by role, skill, or company, then narrow by level, type, and location.</p>
            </div>
            {viewer === "recruiter" ? (
              <HeaderLink href="/my-hiring-posts"><ListChecks className="h-4 w-4" aria-hidden="true" />My hiring posts</HeaderLink>
            ) : viewer === "candidate" ? (
              <HeaderLink href="/recommendations/jobs"><ListOrdered className="h-4 w-4" aria-hidden="true" />AI job picks</HeaderLink>
            ) : null}
          </div>
        </div>
      </section>

      {/* The one search bar stays under the site header while the list scrolls, so searching again never means
          scrolling back up. */}
      <div className="sticky top-16 z-20 bg-surface-muted">
        <div className="container-page py-3 lg:pt-5">
          <form onSubmit={search} role="search" aria-label="Search hiring posts"
            className="field-shell flex min-w-0 items-center gap-2 rounded-xl border border-[#d1ddd1] bg-surface p-2 sm:h-[68px] sm:pl-3">
            <label className="flex min-w-0 flex-[3] items-center gap-2.5 px-2">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Role, skill, or company" aria-label="Keyword"
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            </label>
            <span className="hidden h-7 w-px bg-border md:block" aria-hidden="true" />
            <ChoiceMenu label="Location" value={location} className="hidden min-w-0 flex-[2] md:block"
              buttonClassName="h-11 rounded-lg px-3 text-[15px] transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary"
              icon={<MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
              options={[{ value: "", label: "All locations" }, ...locations.map((item) => ({ value: item.value, label: item.value, count: item.count }))]}
              onChange={(next) => { setLocation(next); go({ keyword, location: next }); }} />
            <button type="submit" className="interaction inline-flex h-[42px] shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-[#066a48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-32">
              Search
            </button>
          </form>
        </div>
      </div>
      <div className="border-b border-border bg-surface-muted">
        <div className="container-page pb-4 lg:pb-6">
          <p className="hidden flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted md:flex">
            <span>Explore:</span>
            {exploreChoices.map((choice) => (
              <button key={choice.label} type="button" aria-pressed={Boolean(choice.code) && applied.occupation === choice.code}
                onClick={() => {
                  // A second click on the chosen occupation clears it; the filter column has no occupation group.
                  if (choice.code && applied.occupation === choice.code) { go({ occupation: "" }); return; }
                  setKeyword(choice.filter.keyword); go(choice.filter);
                }}
                className={cn("rounded underline underline-offset-4 transition-[color,text-decoration-color] duration-200 hover:text-primary hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  choice.code && applied.occupation === choice.code ? "font-medium text-primary decoration-current" : "decoration-transparent")}>
                {choice.label}
              </button>
            ))}
          </p>
        </div>
      </div>

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[256px_minmax(0,1fr)] lg:py-10">
        <aside className={cn("lg:block", showFilters ? "motion-popover block" : "hidden")} aria-label="Filters">
          <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 lg:sticky lg:top-[172px] lg:max-h-[calc(100dvh-188px)] lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-contain">
            <div className="rounded-xl border border-border bg-surface p-[22px]">
              <div className="flex items-start justify-between pb-1.5">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button type="button" onClick={reset} disabled={!searching}
                  className="text-xs font-medium text-primary hover:underline disabled:text-muted disabled:no-underline">Reset</button>
              </div>
              <p className="text-xs text-muted">Narrow down your next role.</p>

              <FilterGroup title="Experience level">
                <Choice label="All levels" checked={!applied.level} onChange={() => go({ level: "" })} />
                {hiringPostLevels.map((level) => (
                  <Choice key={level} label={level} count={facets ? countOf(facets.levels, level) ?? 0 : undefined}
                    checked={listOf(applied.level).includes(level)} onChange={() => toggle("level", level)} />
                ))}
              </FilterGroup>

              <FilterGroup title="Employment type">
                <Choice label="All types" checked={!applied.employmentType} onChange={() => go({ employmentType: "" })} />
                {typeChoices.map((type) => (
                  <Choice key={type} label={type} count={facets ? countOf(facets.employmentTypes, type) ?? 0 : undefined}
                    checked={listOf(applied.employmentType).includes(type)} onChange={() => toggle("employmentType", type)} />
                ))}
              </FilterGroup>

              {/* The backend matches one location at a time, so these choices replace each other. */}
              <FilterGroup title="Location" last>
                <Choice label="All locations" checked={!applied.location} onChange={() => { setLocation(""); go({ location: "" }); }} />
                {locationChoices.map((value) => (
                  <Choice key={value} label={value} count={countOf(facets?.locations.length ? facets.locations : locations, value)}
                    checked={applied.location.toLowerCase() === value.toLowerCase()}
                    onChange={() => { const next = applied.location.toLowerCase() === value.toLowerCase() ? "" : value; setLocation(next); go({ location: next }); }} />
                ))}
              </FilterGroup>
            </div>

            {viewer !== "recruiter" ? (
              <div className="grid gap-3 rounded-xl bg-[#123f32] p-[22px] text-white">
                <p className="text-xl font-semibold leading-8">A little help finding the right fit.</p>
                <p className="text-[13px] leading-5 text-[#cce0d3]">Discover roles that match your skills and experience.</p>
                <ButtonLink href={viewer === "candidate" ? "/recommendations/jobs" : "/auth/register?role=user"}
                  className="h-[42px] bg-[#dcefca] font-semibold text-[#123f32] hover:bg-[#cfe6b9]">
                  {viewer === "candidate" ? "Explore AI job picks" : "Create a candidate account"}
                </ButtonLink>
              </div>
            ) : null}
          </div>
        </aside>

        <div ref={resultsTop} className="min-w-0 scroll-mt-40 lg:scroll-mt-[172px]">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold" aria-live="polite">
              {query.isPending ? "Loading roles…" : `${total.toLocaleString("en-US")} open ${total === 1 ? "role" : "roles"}`}
            </h2>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}
                className="interaction inline-flex h-[42px] items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-muted lg:hidden">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
              </button>
              <ChoiceMenu label="Sort" prefix="Sort:" value={applied.sort || "newest"} align="right"
                buttonClassName="h-[42px] rounded-lg border border-transparent bg-surface px-3.5 text-sm font-semibold text-muted transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-primary"
                icon={<ArrowDownWideNarrow className="h-4 w-4 shrink-0" aria-hidden="true" />}
                options={hiringPostSorts.map((sort) => ({ value: sort, label: sortLabels[sort] }))}
                onChange={(next) => go({ sort: next === "newest" ? "" : next })} />
            </div>
          </div>
          {total ? (
            <p className="mt-2 text-xs text-muted">
              Showing {firstShown.toLocaleString("en-US")}–{lastShown.toLocaleString("en-US")} of {total.toLocaleString("en-US")} open roles
            </p>
          ) : null}

          {query.isPending ? (
            <div className="mt-4 grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-xl bg-surface" />)}
            </div>
          ) : query.isError ? (
            <EmptyState icon={<BriefcaseBusiness />} title="Hiring posts could not be loaded" description="Check your connection and try again."
              action={<button type="button" onClick={() => void query.refetch()} className="text-sm font-semibold text-primary hover:underline">Try again</button>} />
          ) : posts.length ? (
            <>
              <ul className={cn("mt-4 grid gap-4 transition-opacity duration-200", query.isPlaceholderData && "opacity-60")} aria-busy={query.isPlaceholderData} aria-label="Hiring posts">
                {posts.map((post) => (
                  <li key={post.id}>
                    <HiringPostResultCard post={post} viewer={viewer}
                      onApplied={() => void queryClient.invalidateQueries({ queryKey: ["hiring-posts"] })} />
                  </li>
                ))}
              </ul>
              <div className="mt-6 grid gap-3">
                <Pagination page={page} totalPages={totalPages} onPage={(next) => go({}, next)} label="Hiring post pages" boxed />
                {page === totalPages && rolesPastLastPage(total, totalPages) > 0 ? (
                  <p className="rounded-lg border border-border bg-surface px-4 py-3 text-center text-sm text-muted" role="note">
                    That&apos;s the last page the list shows. {rolesPastLastPage(total, totalPages).toLocaleString("en-US")} more
                    {rolesPastLastPage(total, totalPages) === 1 ? " role matches" : " roles match"}; add a keyword, location, or filter to find them.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <EmptyState icon={<BriefcaseBusiness />} title="No open roles match"
              description={searching ? "Try fewer filters or a different keyword." : "Check back soon; recruiters post new roles every week."}
              action={searching ? <button type="button" onClick={reset} className="text-sm font-semibold text-primary hover:underline">Clear filters</button> : undefined} />
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <ButtonLink href={href} variant="secondary" className="h-[42px] border-[#c5d8c8] px-5 font-semibold text-primary">
      {children}
    </ButtonLink>
  );
}

function FilterGroup({ title, children, last = false }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <fieldset className={cn("grid gap-[13px] border-t border-border py-[22px]", last && "pb-0")}>
      <legend className="sr-only">{title}</legend>
      <p className="text-[13px] font-semibold" aria-hidden="true">{title}</p>
      {children}
    </fieldset>
  );
}

/** A filter choice drawn like the design's square checkbox; ticked choices read darker. */
function Choice({ label, checked, onChange, count }: { label: string; checked: boolean; onChange: () => void; count?: number }) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 text-[13px]">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span aria-hidden="true"
        className="grid size-4 shrink-0 place-items-center rounded border border-[#c5d0c8] bg-surface text-white transition-colors duration-150 group-hover:border-primary peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1">
        {checked ? <Check className="check-pop h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span className={cn("min-w-0 flex-1 transition-colors duration-150", checked ? "font-medium text-foreground" : "text-muted group-hover:text-foreground")}>{label}</span>
      {count != null ? <span className="font-mono text-[11px] tabular-nums text-muted">{count}</span> : null}
    </label>
  );
}
