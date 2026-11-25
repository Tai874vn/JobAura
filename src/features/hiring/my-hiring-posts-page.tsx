"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { replaceUrlInPlace } from "@/shared/lib/replace-url";
import { ArrowDownWideNarrow, BriefcaseBusiness, Plus, Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/use-session";
import { hiringPostsApi } from "@/shared/api/endpoints/hiring-posts";
import { reportNonFatalError } from "@/shared/api/query-client";
import { queryKeys } from "@/shared/api/query-keys";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import type { HiringPost } from "@/shared/schemas";
import {
  BrowseHero, BrowsePage, ChoiceMenu, EmptyState, FilterChoice, FilterGroup, FilterPanel, FiltersToggle, Pagination,
  ResultsHeader, shownRange,
} from "@/shared/ui";
import { ConfirmActionDialog } from "@/features/hiring-pipeline/confirm-action-dialog";
import { isHiringPostAiPending } from "./hiring-post-ai";
import { HiringPostFormDialog } from "./hiring-post-form-dialog";
import { activeApplicationCount, closePostQuestion } from "./hiring-pipeline-summary";
import { MyHiringPostResultSkeleton } from "./hiring-posts-skeleton";
import { MyHiringPostResultCard } from "./my-hiring-post-result-card";
import { refreshHiringPostPages } from "./refresh-hiring-post-pages";
import {
  arrangeMyPosts, myPostsHref, myPostsLoadLimit, myPostsPage, myPostsPageSize, myPostsRequest, myPostsSortLabels,
  myPostsStatsLine, readMyPostsFilters, statusCounts, type MyPostsFilters, type MyPostsSort, type MyPostsStatus,
} from "./my-hiring-posts-view";

const newPostButton = "interaction inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-[#066a48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

type MinePage = Awaited<ReturnType<typeof hiringPostsApi.mine>>;
// While the backend's AI queue works on a post, check back until it finishes.
const pollWhileAiWorks = (query: { state: { data?: MinePage } }) =>
  query.state.data?.content?.data.some(isHiringPostAiPending) ? 3000 : false;

/**
 * The recruiter's own posts (employers and admins alike; the backend returns only the caller's posts), in the
 * hiring posts layout: a hero with the stats line and New hiring post, a keyword search, a Status filter, and one
 * card per post with its pipeline and actions. Keyword, status, sort and page live in the address; ?edit=ID opens
 * a post's form so other pages can link straight to editing it.
 */
export function MyHiringPostsPage() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const applied = readMyPostsFilters(searchParams);
  // Keep the keyword input synced with the URL whenever Reset or browser Back/Forward changes it.
  const [keyword, setKeyword] = useState(applied.keyword);
  const [syncedKeyword, setSyncedKeyword] = useState(applied.keyword);
  if (syncedKeyword !== applied.keyword) {
    setSyncedKeyword(applied.keyword);
    setKeyword(applied.keyword);
  }
  const [showFilters, setShowFilters] = useState(false);
  const [creating, setCreating] = useState(false);
  // The post the recruiter is about to close; closing tells everyone still in progress.
  const [closing, setClosing] = useState<HiringPost | null>(null);

  // Every post (for the stats line and ?edit=), and the posts the keyword finds (the same request when no keyword).
  const allParams = myPostsRequest("");
  const all = useQuery({
    queryKey: queryKeys.myHiringPosts(allParams, user?.id),
    queryFn: () => hiringPostsApi.mine(allParams),
    // Only poll on the active list when searching, so two queries do not double-poll every 3 seconds.
    refetchInterval: applied.keyword ? false : pollWhileAiWorks,
  });
  const matchParams = myPostsRequest(applied.keyword);
  const matches = useQuery({
    queryKey: queryKeys.myHiringPosts(matchParams, user?.id),
    queryFn: () => hiringPostsApi.mine(matchParams),
    refetchInterval: pollWhileAiWorks,
    // Keep the last list on screen while a new keyword loads, instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
  const allPosts = all.data?.content?.data ?? [];
  const found = matches.data?.content?.data ?? [];
  const foundTotal = matches.data?.content?.totalRow ?? found.length;
  const counts = statusCounts(found);
  const arranged = arrangeMyPosts(found, applied);
  const shownPage = myPostsPage(arranged, applied.page);
  const shown = shownRange(shownPage.page, myPostsPageSize, arranged.length);
  const searching = Boolean(applied.keyword || applied.status);

  const editId = Number(searchParams.get("edit")) || null;
  const editing = editId ? allPosts.find((post) => post.id === editId) ?? found.find((post) => post.id === editId) ?? null : null;

  function go(next: Partial<MyPostsFilters>, page = 1) {
    replaceUrlInPlace(myPostsHref(pathname, { ...applied, ...next }, page));
  }
  function reset() {
    setKeyword("");
    go({ keyword: "", status: "" });
  }
  // Open and Closed replace each other; ticking the chosen one again shows all posts.
  function setStatusFilter(status: MyPostsStatus) {
    go({ status: applied.status === status ? "" : status });
  }
  // Opening the form keeps the filters and page; closing it drops only ?edit.
  function openEdit(id: number) {
    const url = new URLSearchParams(searchParams.toString());
    url.set("edit", String(id));
    replaceUrlInPlace(`${pathname}?${url.toString()}`);
  }
  function closeEdit() {
    replaceUrlInPlace(myPostsHref(pathname, applied, applied.page));
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hiring-posts"] });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: HiringPost["status"] }) => hiringPostsApi.update(id, { status }),
    onSuccess: (_, { id, status }) => {
      setClosing(null);
      toast.success(status === "CLOSED" ? "Post closed; candidates can no longer apply" : "Post reopened");
      void refresh();
      void refreshHiringPostPages(id).catch((error) => reportNonFatalError(error, "cache:revalidate-hiring-post"));
    },
    onError: (error) => {
      // A closing dialog shows the server's sentence itself; a reopen has no dialog, so it is a toast.
      if (!closing) toast.error(getErrorMessage(error, "Could not change the post status"));
    },
  });
  const predict = useMutation({
    mutationFn: hiringPostsApi.predictSeniority,
    onSuccess: (_, id) => {
      toast.success("Working out the AI level");
      void refresh();
      void refreshHiringPostPages(id).catch((error) => reportNonFatalError(error, "cache:revalidate-hiring-post"));
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not queue this post for its AI level")),
  });

  const stats = myPostsStatsLine(allPosts);
  const newPost = (
    <button type="button" onClick={() => setCreating(true)} className={newPostButton}>
      <Plus className="h-4 w-4" aria-hidden="true" />New hiring post
    </button>
  );

  return (
    <>
      <BrowsePage
        resultsKey={searchParams.toString()}
        resultsReady={Boolean(matches.data)}
        hero={
          <BrowseHero title="My hiring posts" action={newPost}
            intro={all.isPending ? "Loading your posts…" : stats || "Publish roles, keep them up to date, and follow each one's applicants."} />
        }
        search={
          <form role="search" aria-label="Search my hiring posts"
            onSubmit={(event) => { event.preventDefault(); go({ keyword }); }}
            className="field-shell flex min-w-0 items-center gap-2 rounded-xl border border-[#d1ddd1] bg-surface p-2 sm:h-[68px] sm:pl-3">
            <label className="flex min-w-0 flex-1 items-center gap-2.5 px-2">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Title, skill, or location" aria-label="Keyword"
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            </label>
            <button type="submit" className="interaction inline-flex h-[42px] shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-[#066a48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-32">
              Search
            </button>
          </form>
        }
        filtersOpen={showFilters}
        filters={
          <FilterPanel intro="Show the posts you are working on." onReset={reset} canReset={searching}>
            {/* Counts are of the posts the keyword finds, worked out here: the backend sends no facet counts for them. */}
            <FilterGroup title="Status" last>
              <FilterChoice label="All posts" checked={!applied.status} count={matches.data ? found.length : undefined} onChange={() => go({ status: "" })} />
              <FilterChoice label="Open" checked={applied.status === "open"} count={matches.data ? counts.open : undefined} onChange={() => setStatusFilter("open")} />
              <FilterChoice label="Closed" checked={applied.status === "closed"} count={matches.data ? counts.closed : undefined} onChange={() => setStatusFilter("closed")} />
            </FilterGroup>
          </FilterPanel>
        }
        toolbar={
          <ResultsHeader
            title={matches.isPending ? "Loading posts…" : `${arranged.length.toLocaleString("en-US")} ${applied.status ? `${applied.status} ` : ""}${arranged.length === 1 ? "post" : "posts"}`}
            actions={
              <>
                <FiltersToggle open={showFilters} onToggle={() => setShowFilters((value) => !value)} count={applied.status ? 1 : 0} />
                <ChoiceMenu label="Sort" prefix="Sort:" value={applied.sort} align="right"
                  buttonClassName="h-[42px] rounded-lg border border-transparent bg-surface px-3.5 text-sm font-semibold text-muted transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-primary"
                  icon={<ArrowDownWideNarrow className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  options={(Object.keys(myPostsSortLabels) as MyPostsSort[]).map((sort) => ({ value: sort, label: myPostsSortLabels[sort] }))}
                  onChange={(next) => go({ sort: next as MyPostsSort })} />
              </>
            }
            summary={arranged.length ? (
              <>
                Showing {shown.first}–{shown.last} of {arranged.length}
                {foundTotal > myPostsLoadLimit ? ` (your ${myPostsLoadLimit} most recently updated posts; search to find older ones)` : ""}
              </>
            ) : null} />
        }
        results={
          matches.isPending ? (
            <MyHiringPostResultSkeleton />
          ) : matches.isError ? (
            <div className="mt-4">
              <EmptyState icon={<BriefcaseBusiness />} title="Your posts could not be loaded" description={getErrorMessage(matches.error, "Check your connection and try again.")}
                action={<button type="button" onClick={() => void matches.refetch()} className="text-sm font-semibold text-primary hover:underline">Try again</button>} />
            </div>
          ) : shownPage.items.length ? (
            <ul className={cn("results-in mt-4 grid gap-4 transition-opacity duration-200", matches.isPlaceholderData && "opacity-60")}
              aria-busy={matches.isPlaceholderData} aria-label="My hiring posts">
              {shownPage.items.map((post) => (
                <li key={post.id}>
                  <MyHiringPostResultCard post={post}
                    onEdit={() => openEdit(post.id)}
                    onToggleStatus={() => (post.status === "OPEN" ? (setStatus.reset(), setClosing(post)) : setStatus.mutate({ id: post.id, status: "OPEN" }))}
                    statusPending={setStatus.isPending && setStatus.variables?.id === post.id}
                    onPredict={() => predict.mutate(post.id)}
                    predictPending={predict.isPending && predict.variables === post.id}
                    predictDisabled={predict.isPending} />
                </li>
              ))}
            </ul>
          ) : searching ? (
            <div className="mt-4">
              <EmptyState icon={<BriefcaseBusiness />} title="No posts match" description="Try another keyword or show all posts."
                action={<button type="button" onClick={reset} className="text-sm font-semibold text-primary hover:underline">Clear filters</button>} />
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState icon={<BriefcaseBusiness />} title="No hiring posts yet"
                description="Publish your first role. Candidates find it on Hiring posts, and AI matching ranks candidates for it."
                action={newPost} />
            </div>
          )
        }
        pagination={!matches.isPending && !matches.isError && shownPage.items.length ? (
          <Pagination page={shownPage.page} totalPages={shownPage.totalPages} onPage={(next) => go({}, next)} label="My hiring post pages" boxed />
        ) : undefined} />

      <ConfirmActionDialog
        open={Boolean(closing)}
        title="Close post"
        description={closing ? closePostQuestion(activeApplicationCount(closing.pipeline)) : ""}
        confirmLabel="Close post"
        tone="danger"
        pending={setStatus.isPending}
        error={setStatus.isError && closing ? getErrorMessage(setStatus.error, "Could not close the post") : null}
        onConfirm={() => closing && setStatus.mutate({ id: closing.id, status: "CLOSED" })}
        onCancel={() => { setClosing(null); setStatus.reset(); }}
      />
      <HiringPostFormDialog open={creating} onClose={() => setCreating(false)} />
      <HiringPostFormDialog open={Boolean(editing)} post={editing} onClose={closeEdit} />
    </>
  );
}
