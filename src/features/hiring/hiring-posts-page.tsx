"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, ListChecks, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useSession } from "@/features/auth/use-session";
import { hiringPostsApi, type HiringPostFilters } from "@/shared/api/endpoints/hiring-posts";
import { queryKeys } from "@/shared/api/query-keys";
import { Button, ButtonLink, Card, CardContent, EmptyState, Input, PageHeader, Select } from "@/shared/ui";
import { HiringPostCard } from "./hiring-post-card";
import { careerFields, employmentTypes, hiringPostLevels } from "./hiring-post-form";
import { hiringPostViewer } from "./hiring-post-viewer";

const pageSize = 10;
const filterKeys = ["keyword", "careerField", "level", "employmentType", "location"] as const;
type FilterKey = (typeof filterKeys)[number];
type Filters = Record<FilterKey, string>;

function pageWindow(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

/** Open hiring posts, for everyone. Candidates apply here; visitors are asked to sign in when they apply. */
export function HiringPostsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const viewer = hiringPostViewer(user?.role);

  // The URL holds the filters, so a filtered list can be shared and survives a reload.
  const applied = Object.fromEntries(filterKeys.map((key) => [key, searchParams.get(key) ?? ""])) as Filters;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [draft, setDraft] = useState<Filters>(applied);
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const activeFilterCount = filterKeys.filter((key) => key !== "keyword" && applied[key]).length;
  const [showFilters, setShowFilters] = useState(activeFilterCount > 0);

  const params: HiringPostFilters = {
    page,
    pageSize,
    ...Object.fromEntries(filterKeys.filter((key) => applied[key]).map((key) => [key, applied[key]])),
  };
  const query = useQuery({
    queryKey: queryKeys.hiringPosts(params),
    queryFn: () => hiringPostsApi.open(params),
    staleTime: 60_000,
  });
  const posts = query.data?.content?.data ?? [];
  const total = query.data?.content?.totalRow ?? 0;
  const totalPages = query.data?.content?.totalPages ?? 1;
  const searching = activeFilterCount > 0 || Boolean(applied.keyword);

  function go(next: Filters, nextPage = 1) {
    const url = new URLSearchParams();
    for (const key of filterKeys) if (next[key].trim()) url.set(key, next[key].trim());
    if (nextPage > 1) url.set("page", String(nextPage));
    const search = url.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go(draft);
  }
  function clearFilters() {
    const empty = Object.fromEntries(filterKeys.map((key) => [key, ""])) as Filters;
    setDraft(empty);
    go(empty);
  }
  const set = (key: FilterKey, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className="container-page py-8">
      <PageHeader
        eyebrow={<><BriefcaseBusiness className="h-4 w-4" />Hiring posts</>}
        title={viewer === "recruiter" ? "Browse hiring posts" : "Find a role and apply"}
        description={viewer === "recruiter"
          ? "See what other recruiters are hiring for. Your own posts are in My hiring posts."
          : "Open roles from recruiters on JobAura. Filter by field, level, and location."}
        actions={viewer === "recruiter" ? (
          <ButtonLink href="/my-hiring-posts"><ListChecks className="h-4 w-4" />My hiring posts</ButtonLink>
        ) : viewer === "candidate" ? (
          <ButtonLink href="/recommendations/jobs" variant="secondary"><Sparkles className="h-4 w-4" />AI job picks</ButtonLink>
        ) : null}
      />

      <Card className="mt-6">
        <CardContent className="p-4">
          <form onSubmit={submit} className="grid gap-3" role="search" aria-label="Search hiring posts">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
                <Input className="pl-9" value={draft.keyword} onChange={(event) => set("keyword", event.target.value)}
                  placeholder="Role, skill, or company" aria-label="Keyword" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" aria-expanded={showFilters} onClick={() => setShowFilters((value) => !value)}>
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
                </Button>
                <Button type="submit">Search</Button>
              </div>
            </div>
            {showFilters ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FilterField label="Field of work">
                  <Select value={draft.careerField} onChange={(event) => set("careerField", event.target.value)}>
                    <option value="">Any field</option>
                    {careerFields.map((field) => <option key={field} value={field}>{field}</option>)}
                  </Select>
                </FilterField>
                <FilterField label="Level">
                  <Select value={draft.level} onChange={(event) => set("level", event.target.value)}>
                    <option value="">Any level</option>
                    {hiringPostLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                  </Select>
                </FilterField>
                <FilterField label="Employment type">
                  <Select value={draft.employmentType} onChange={(event) => set("employmentType", event.target.value)}>
                    <option value="">Any type</option>
                    {employmentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </Select>
                </FilterField>
                <FilterField label="Location">
                  <Input value={draft.location} onChange={(event) => set("location", event.target.value)} placeholder="City or Remote" />
                </FilterField>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="mt-5 flex min-h-9 flex-wrap items-center justify-between gap-2 text-sm text-muted" aria-live="polite">
        <span>{query.isPending ? "Loading roles…" : `${total} open ${total === 1 ? "role" : "roles"}`}</span>
        {searching ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4" />Clear search</Button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-4">
        {query.isPending ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}><CardContent className="h-44 animate-pulse bg-surface-muted" /></Card>
          ))
        ) : query.isError ? (
          <EmptyState icon={<BriefcaseBusiness />} title="Hiring posts could not be loaded"
            description="Check your connection and try again."
            action={<Button type="button" variant="secondary" onClick={() => void query.refetch()}>Try again</Button>} />
        ) : posts.length ? (
          posts.map((post) => (
            <HiringPostCard
              key={post.id}
              post={post}
              viewer={viewer}
              active={activePostId === post.id}
              onToggleApply={() => setActivePostId((current) => (current === post.id ? null : post.id))}
              onApplied={() => {
                setActivePostId(null);
                void queryClient.invalidateQueries({ queryKey: ["hiring-posts"] });
              }}
            />
          ))
        ) : (
          <EmptyState
            icon={<BriefcaseBusiness />}
            title="No open roles match"
            description={searching ? "Try fewer filters or a different keyword." : "Check back soon; recruiters post new roles every week."}
            action={searching ? <Button type="button" variant="secondary" onClick={clearFilters}>Clear search</Button> : undefined}
          />
        )}
      </div>

      {totalPages > 1 ? (
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Pages">
          {pageWindow(page, totalPages).map((nextPage, index, pages) => (
            <PageGap key={nextPage} showGap={index > 0 && nextPage - pages[index - 1] > 1}>
              <Button type="button" variant={nextPage === page ? "primary" : "secondary"}
                aria-current={nextPage === page ? "page" : undefined} onClick={() => go(applied, nextPage)}>
                {nextPage}
              </Button>
            </PageGap>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

function PageGap({ children, showGap }: { children: ReactNode; showGap: boolean }) {
  return (
    <>
      {showGap ? <span className="px-1 text-sm font-semibold text-muted">…</span> : null}
      {children}
    </>
  );
}
