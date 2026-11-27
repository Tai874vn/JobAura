"use client";

/**
 * Renders the public Hiring posts browse page (/hiring-posts) with search, quick explore chips, filters, sorting, role cards, and pagination. Reads and writes all filters in the URL so filtered results can be shared.
 *
 * Calls: GET /api/hiring-posts; GET /api/hiring-posts/facets; GET /api/hiring-posts/locations; useSession; BrowsePage; HiringPostResultCard; HiringPostResultSkeleton; readHiringPostFilters
 * Used by:
 *   - app/(marketplace)/hiring-posts/page.tsx
 */

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { replaceUrlInPlace } from "@/shared/lib/replace-url";
import { ArrowDownWideNarrow, BriefcaseBusiness, ListChecks, ListOrdered, MapPin, Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useSession } from "@/features/auth/hooks/use-session";
import { hiringPostsApi } from "@/shared/api/endpoints/hiring-posts";
import { hiringPostsConfig as config } from "@/features/hiring/config/hiring-posts";
import { queryKeys } from "@/shared/api/query-keys";
import {
  BrowseHero, BrowsePage, ButtonLink, ChoiceMenu, countOf, EmptyState, ExploreChip, ExploreRow, FilterChoice, FilterGroup, FilterPanel,
  FiltersToggle, listOf, Pagination, ResultsHeader, shownRange, toggleListValue,
} from "@/shared/ui";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import { occupationLabel } from "@/features/occupations/api";
import { HiringPostResultCard } from "./hiring-post-result-card";
import { HiringPostResultSkeleton } from "./hiring-posts-skeleton";
import { hiringPostViewer } from "../../utils/hiring-post-viewer";
import {
  hiringPostFilterKeys as filterKeys,
  hiringPostsPageSize as pageSize,
  readHiringPostFilters,
  rolesPastLastPage,
  toHiringPostFacetParams,
  toHiringPostQueryParams,
  type HiringPostAppliedFilters as Filters,
} from "../../utils/hiring-posts-browse";


type MultiKey = "occupation" | "level" | "employmentType";

/**
 * Open hiring posts, for everyone: a search band, a filter column that stays in view while the list scrolls, and
 * one card per role with View details and Apply. Every filter lives in the URL, so a filtered list can be shared.
 * The layout is the shared BrowsePage; this page fills in its search, filters and cards.
 */
// @find hiring-posts page component ui [all] — the browse page: search, filters, cards
export function HiringPostsPage() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSession();
  // @find hiring-posts page viewer-role access [all] — visitor, candidate or recruiter changes the header link, promo card and Apply
  const viewer = hiringPostViewer(user?.role);

  // @find hiring-posts filters read-from-url url [all] — filters and page number come from the address
  const { applied, page } = readHiringPostFilters(searchParams);
  // Keep the search inputs synced with the URL whenever a chip, Reset, or browser Back/Forward changes it.
  // @find hiring-posts search keyword state [all] — keyword box, kept in sync with the URL
  const [keyword, setKeyword] = useState(applied.keyword);
  const [syncedKeyword, setSyncedKeyword] = useState(applied.keyword);
  if (syncedKeyword !== applied.keyword) {
    setSyncedKeyword(applied.keyword);
    setKeyword(applied.keyword);
  }
  // @find hiring-posts search location state [all] — location box, kept in sync with the URL
  const [location, setLocation] = useState(applied.location);
  const [syncedLocation, setSyncedLocation] = useState(applied.location);
  if (syncedLocation !== applied.location) {
    setSyncedLocation(applied.location);
    setLocation(applied.location);
  }
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = (["occupation", "level", "employmentType", "location"] as const)
    .reduce((sum, key) => sum + listOf(applied[key]).length, 0);
  const searching = activeFilterCount > 0 || Boolean(applied.keyword);

  const params = toHiringPostQueryParams(applied, page);
  // @find hiring-posts results list api [all] — GET /api/hiring-posts (hiringPostsApi.open)
  // Data: hiringPostsApi.open → GET /api/hiring-posts → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findOpen()
  const query = useQuery({
    queryKey: queryKeys.hiringPosts(params, user?.id),
    queryFn: () => hiringPostsApi.open(params),
    staleTime: 60_000,
    // Keep the current list on screen while the next filter's results load, instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
  // Counts beside each choice and the location list. Both are extras: without them the filters still work.
  // @find hiring-posts filters counts api [all] — GET /api/hiring-posts/facets: numbers beside each choice
  const facetParams = toHiringPostFacetParams(applied);
  // Data: hiringPostsApi.facets → GET /api/hiring-posts/facets → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findFacets()
  const facets = useQuery({
    queryKey: queryKeys.hiringPostFacets(facetParams),
    queryFn: () => hiringPostsApi.facets(facetParams),
    staleTime: 60_000,
    retry: false,
    // Keep the counts (and the choices built from them) in place while new ones load, so the column doesn't jump.
    placeholderData: keepPreviousData,
  }).data?.content;
  // @find hiring-posts filters location api [all] — GET /api/hiring-posts/locations: choices for both location pickers
  const locations = useQuery({
    queryKey: queryKeys.hiringPostLocations,
    queryFn: hiringPostsApi.locations,
    staleTime: 300_000,
    retry: false,
  }).data?.content ?? [];
  const posts = query.data?.content?.data ?? [];
  const total = query.data?.content?.totalRow ?? 0;
  const totalPages = query.data?.content?.totalPages ?? 1;
  const shown = shownRange(page, pageSize, total);
  const pastLastPage = rolesPastLastPage(total, totalPages);

  // @find hiring-posts filters apply-to-url url [all] — writes filters to the address in place (no server navigation)
  function go(next: Partial<Filters>, nextPage = 1) {
    const merged = { ...applied, ...next };
    const url = new URLSearchParams();
    for (const key of filterKeys) if (merged[key].trim()) url.set(key, merged[key].trim());
    if (nextPage > 1) url.set("page", String(nextPage));
    const search = url.toString();
    replaceUrlInPlace(search ? `${pathname}?${search}` : pathname);
  }
  // @find hiring-posts search submit logic [all]
  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go({ keyword, location });
  }
  function toggle(key: MultiKey, value: string) {
    go({ [key]: toggleListValue(applied[key], value) });
  }
  // @find hiring-posts filters reset logic [all]
  function reset() {
    setKeyword("");
    setLocation("");
    go({ keyword: "", occupation: "", level: "", employmentType: "", location: "" });
  }

  const typeChoices = [...new Set([
    ...config.filters.employmentType.values,
    ...(config.filters.employmentType.alsoShowTypesFoundInPosts ? (facets?.employmentTypes ?? []).map((item) => item.value).filter(Boolean) : []),
  ])];
  // @find hiring-posts filters location logic [all] — top 5 locations plus the chosen one
  const locationChoices = (facets?.locations.length ? facets.locations : locations).slice(0, config.filters.location.maxChoices).map((item) => item.value);
  if (applied.location && !locationChoices.some((value) => value.toLowerCase() === applied.location.toLowerCase())) locationChoices.push(applied.location);
  // @find hiring-posts explore chips logic [all] — occupation chips from the facets, or a fixed list
  const exploreChoices = facets?.occupations.length
    ? facets.occupations.slice(0, 4).map((item) => ({ label: occupationLabel(item.title), code: item.code, filter: { occupation: item.code, keyword: "" } }))
    : config.exploreChips.map((label) => ({ label, code: "", filter: { keyword: label } }));

  return (
    <BrowsePage
      // New results (a search, a filter, another page) start at the top of the list.
      resultsKey={searchParams.toString()}
      resultsReady={Boolean(query.data)}
      // @find hiring-posts hero title-and-link ui [all] — recruiter: My hiring posts; candidate: AI job picks
      hero={
        <BrowseHero
          title={viewer === "recruiter" ? "Browse hiring posts" : "Find a role and apply"}
          intro="Open roles from recruiters on JobAura. Search by role, skill, or company, then narrow by level, type, and location."
          action={viewer === "recruiter" ? (
            <HeaderLink href="/my-hiring-posts"><ListChecks className="h-4 w-4" aria-hidden="true" />My hiring posts</HeaderLink>
          ) : viewer === "candidate" ? (
            <HeaderLink href="/recommendations/jobs"><ListOrdered className="h-4 w-4" aria-hidden="true" />AI job picks</HeaderLink>
          ) : null} />
      }
      // @find hiring-posts search bar ui [all]
      search={
        <form onSubmit={search} role="search" aria-label="Search hiring posts"
          className="field-shell flex min-w-0 items-center gap-2 rounded-xl border border-[#d1ddd1] bg-surface p-2 sm:h-[68px] sm:pl-3">
          <label className="flex min-w-0 flex-[3] items-center gap-2.5 px-2">
            <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={config.search.placeholder} aria-label="Keyword"
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          </label>
          <span className="hidden h-7 w-px bg-border md:block" aria-hidden="true" />
          {config.search.showLocationBox ? (
          <>
          {/* @find hiring-posts search location ui [all] — Location menu inside the search bar (wide screens) */}
          <ChoiceMenu label="Location" value={location} className="hidden min-w-0 flex-[2] md:block"
            buttonClassName="h-11 rounded-lg px-3 text-[15px] transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary"
            icon={<MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
            options={[{ value: "", label: "All locations" }, ...locations.map((item) => ({ value: item.value, label: item.value, count: item.count }))]}
            onChange={(next) => { setLocation(next); go({ keyword, location: next }); }} />
          </>
          ) : null}
          <button type="submit" className="interaction inline-flex h-[42px] shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-[#066a48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-32">
            Search
          </button>
        </form>
      }
      // @find hiring-posts explore chips ui [all]
      explore={
        <ExploreRow>
          {exploreChoices.map((choice) => (
            <ExploreChip key={choice.label} active={Boolean(choice.code) && applied.occupation === choice.code}
              onClick={() => {
                // A second click on the chosen occupation clears it; the filter column has no occupation group.
                if (choice.code && applied.occupation === choice.code) { go({ occupation: "" }); return; }
                setKeyword(choice.filter.keyword); go(choice.filter);
              }}>
              {choice.label}
            </ExploreChip>
          ))}
        </ExploreRow>
      }
      filtersOpen={showFilters}
      // @find hiring-posts filters column ui [all]
      filters={
        <>
          <FilterPanel intro="Narrow down your next role." onReset={reset} canReset={searching}>
            {config.filters.level.show ? (
            <>
            {/* @find hiring-posts filters level ui [all] */}
            <FilterGroup title={config.filters.level.title}>
              <FilterChoice label="All levels" checked={!applied.level} onChange={() => go({ level: "" })} />
              {config.filters.level.values.map((level) => (
                <FilterChoice key={level} label={level} count={facets ? countOf(facets.levels, level) ?? 0 : undefined}
                  checked={listOf(applied.level).includes(level)} onChange={() => toggle("level", level)} />
              ))}
            </FilterGroup>
            </>
            ) : null}

            {config.filters.employmentType.show ? (
            <>
            {/* @find hiring-posts filters employment-type ui [all] */}
            <FilterGroup title={config.filters.employmentType.title}>
              <FilterChoice label="All types" checked={!applied.employmentType} onChange={() => go({ employmentType: "" })} />
              {typeChoices.map((type) => (
                <FilterChoice key={type} label={type} count={facets ? countOf(facets.employmentTypes, type) ?? 0 : undefined}
                  checked={listOf(applied.employmentType).includes(type)} onChange={() => toggle("employmentType", type)} />
              ))}
            </FilterGroup>
            </>
            ) : null}

            {config.filters.location.show ? (
            <>
            {/* @find hiring-posts filters location ui [all] — Location group in the filter column */}
            {/* The backend matches one location at a time, so these choices replace each other. */}
            <FilterGroup title={config.filters.location.title} last>
              <FilterChoice label="All locations" checked={!applied.location} onChange={() => { setLocation(""); go({ location: "" }); }} />
              {locationChoices.map((value) => (
                <FilterChoice key={value} label={value} count={countOf(facets?.locations.length ? facets.locations : locations, value)}
                  checked={applied.location.toLowerCase() === value.toLowerCase()}
                  onChange={() => { const next = applied.location.toLowerCase() === value.toLowerCase() ? "" : value; setLocation(next); go({ location: next }); }} />
              ))}
            </FilterGroup>
            </>
            ) : null}
          </FilterPanel>

          {/* @find hiring-posts filters ai-picks-promo access [guest,candidate] — promo card, hidden for recruiters */}
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
        </>
      }
      // @find hiring-posts results header ui [all] — "N open roles" and the showing range
      toolbar={
        <ResultsHeader
          title={query.isPending ? "Loading roles…" : `${total.toLocaleString("en-US")} open ${total === 1 ? "role" : "roles"}`}
          actions={
            <>
              {/* @find hiring-posts filters mobile-toggle ui [all] — Filters button on small screens */}
              <FiltersToggle open={showFilters} onToggle={() => setShowFilters((value) => !value)} count={activeFilterCount} />
              {/* @find hiring-posts results sort ui [all] */}
              <ChoiceMenu label="Sort" prefix="Sort:" value={applied.sort || "newest"} align="right"
                buttonClassName="h-[42px] rounded-lg border border-transparent bg-surface px-3.5 text-sm font-semibold text-muted transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-primary"
                icon={<ArrowDownWideNarrow className="h-4 w-4 shrink-0" aria-hidden="true" />}
                options={config.sorts.map((sort) => ({ value: sort.value, label: sort.label }))}
                onChange={(next) => go({ sort: next === "newest" ? "" : next })} />
            </>
          }
          summary={total
            ? `Showing ${shown.first.toLocaleString("en-US")}–${shown.last.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} open roles`
            : null} />
      }
      // @find hiring-posts results list ui [all] — loading, error, cards, empty state
      results={
        query.isPending ? (
          <HiringPostResultSkeleton />
        ) : query.isError ? (
          <EmptyState icon={<BriefcaseBusiness />} title="Hiring posts could not be loaded" description={getErrorMessage(query.error, "Check your connection and try again.")}
            action={<button type="button" onClick={() => void query.refetch()} className="text-sm font-semibold text-primary hover:underline">Try again</button>} />
        ) : posts.length ? (
          <ul key={posts.map((post) => post.id).join(",")} className={cn("results-in mt-4 grid gap-4 transition-opacity duration-200", query.isPlaceholderData && "opacity-60")} aria-busy={query.isPlaceholderData} aria-label="Hiring posts">
            {posts.map((post) => (
              <li key={post.id}>
                {/* @find hiring-posts card result-card ui [all] */}
                <HiringPostResultCard post={post} viewer={viewer}
                  onApplied={() => void queryClient.invalidateQueries({ queryKey: ["hiring-posts"] })} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<BriefcaseBusiness />} title="No open roles match"
            description={searching ? "Try fewer filters or a different keyword." : "Check back soon; recruiters post new roles every week."}
            action={searching ? <button type="button" onClick={reset} className="text-sm font-semibold text-primary hover:underline">Clear filters</button> : undefined} />
        )
      }
      // Pages show only under a list of roles, not while loading, after an error, or when nothing matches.
      // @find hiring-posts pagination pages ui [all]
      pagination={!query.isPending && !query.isError && posts.length ? (
        <>
          <Pagination page={page} totalPages={totalPages} onPage={(next) => go({}, next)} label="Hiring post pages" boxed />
          {page === totalPages && pastLastPage > 0 ? (
            <p className="rounded-lg border border-border bg-surface px-4 py-3 text-center text-sm text-muted" role="note">
              That&apos;s the last page the list shows. {pastLastPage.toLocaleString("en-US")} more
              {pastLastPage === 1 ? " role matches" : " roles match"}; add a keyword, location, or filter to find them.
            </p>
          ) : null}
        </>
      ) : undefined} />
  );
}

function HeaderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <ButtonLink href={href} variant="secondary" className="h-[42px] border-[#c5d8c8] px-5 font-semibold text-primary">
      {children}
    </ButtonLink>
  );
}
