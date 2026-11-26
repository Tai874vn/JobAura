"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/hooks/use-session";
import { hiringPostsApi, recommendationsApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import { getErrorMessage } from "@/shared/lib/utils";
import type {
  RecommendationContent,
  RecommendedCandidate,
} from "@/shared/schemas";
import { Card, CardContent, PageHeader, Spinner } from "@/shared/ui";
import { CandidateResultsPanel, EmptyResultsCard } from "./recommended-candidates/candidate-results-panel";
import { hiringPostPageParams } from "./recommended-candidates/constants";
import { HiringPostSelectionPanel } from "./recommended-candidates/hiring-post-selection-panel";
import { StartCandidateMatchingCard } from "./recommended-candidates/matching-action-card";
import { MatchingPolicyCard, RecruiterQuotaCard } from "./recommended-candidates/sidebar-cards";
import { sortByFinalScore } from "./recommended-candidates/utils";

type CandidateRunVariables = {
  hiringPostId: number;
  topK: number;
  poolSize: number;
  forceRefresh?: boolean;
};

export function RecommendedCandidatesPage() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const requestedHiringPostId = Number(useSearchParams().get("hiringPostId")) || null;
  const [manualSelectedHiringPostId, setManualSelectedHiringPostId] = useState<
    number | null
  >(null);
  const [resultRequest, setResultRequest] =
    useState<CandidateRunVariables | null>(null);
  const [lastContent, setLastContent] =
    useState<RecommendationContent<RecommendedCandidate> | null>(null);
  const [topK, setTopK] = useState(10);
  const [poolSize, setPoolSize] = useState(100);

  const quotaQuery = useQuery({
    queryKey: queryKeys.viewerRecommendationQuota(user?.id),
    queryFn: recommendationsApi.quota,
    staleTime: 30 * 1000,
    retry: false,
  });

  const hiringPostsQuery = useQuery({
    queryKey: queryKeys.myHiringPosts(hiringPostPageParams, user?.id),
    queryFn: () => hiringPostsApi.mine(hiringPostPageParams),
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  });

  const hiringPosts = useMemo(
    () => hiringPostsQuery.data?.content?.data ?? [],
    [hiringPostsQuery.data?.content?.data],
  );
  const selectedHiringPostId =
    manualSelectedHiringPostId ??
    // "Match candidates" on a post links here with ?hiringPostId=ID.
    hiringPosts.find((post) => post.id === requestedHiringPostId)?.id ??
    hiringPosts[0]?.id ??
    null;
  const selectedHiringPost = useMemo(
    () =>
      hiringPosts.find((post) => post.id === selectedHiringPostId) ?? null,
    [hiringPosts, selectedHiringPostId],
  );

  const cachedQuery = useQuery({
    queryKey: queryKeys.recommendedCandidates(
      selectedHiringPostId ?? 0,
      {
        topK,
        poolSize,
        cacheOnly: true,
      },
      user?.id,
    ),
    queryFn: () =>
      recommendationsApi.candidates(selectedHiringPostId!, {
        topK,
        poolSize,
        cacheOnly: true,
      }),
    enabled: Boolean(selectedHiringPostId),
    staleTime: 15 * 1000,
    retry: false,
  });

  const runMutation = useMutation({
    mutationFn: ({
      hiringPostId,
      topK: nextTopK,
      poolSize: nextPoolSize,
      forceRefresh,
    }: CandidateRunVariables) =>
      recommendationsApi.candidates(hiringPostId, {
        topK: nextTopK,
        poolSize: nextPoolSize,
        forceRefresh: forceRefresh || undefined,
      }),
    onSuccess: (response, variables) => {
      setResultRequest(variables);
      setLastContent(response.content ?? null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.viewerRecommendationQuota(user?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recommendedCandidates(
          variables.hiringPostId,
          {
            topK: variables.topK,
            poolSize: variables.poolSize,
            cacheOnly: true,
          },
          user?.id,
        ),
      });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "AI candidate recommendations are unavailable"),
      );
    },
  });

  const lastContentMatchesSelection = Boolean(
    resultRequest &&
    resultRequest.hiringPostId === selectedHiringPostId &&
    resultRequest.topK === topK &&
    resultRequest.poolSize === poolSize,
  );
  const cachedContent = cachedQuery.data?.content?.cache?.hit
    ? cachedQuery.data.content
    : null;
  const content = lastContentMatchesSelection ? lastContent : cachedContent;
  const quota = (lastContentMatchesSelection ? lastContent?.quota : undefined)
    ?? quotaQuery.data?.content
    ?? cachedContent?.quota;
  const candidates = useMemo(
    () => sortByFinalScore(content?.data ?? []),
    [content?.data],
  );
  const canRun = Boolean(selectedHiringPostId && (quota?.remaining ?? 0) > 0);

  function runMatching(forceRefresh = false) {
    if (!selectedHiringPostId) {
      toast.error("Choose or create a hiring post before running AI matching");
      return;
    }

    runMutation.mutate({
      hiringPostId: selectedHiringPostId,
      topK,
      poolSize,
      forceRefresh,
    });
  }

  return (
    <div className="container-page pt-10 pb-16">
      <Link
        href="/candidates"
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to candidate directory
      </Link>
      <PageHeader
        title="Recommended candidates"
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="grid gap-5">
          <HiringPostSelectionPanel
            hiringPosts={hiringPosts}
            loading={hiringPostsQuery.isPending}
            selectedHiringPostId={selectedHiringPostId}
            topK={topK}
            poolSize={poolSize}
            onSelectHiringPost={setManualSelectedHiringPostId}
            onTopKChange={setTopK}
            onPoolSizeChange={setPoolSize}
          />

          {!content && selectedHiringPostId && cachedQuery.isPending ? (
            <Card>
              <CardContent className="flex min-h-64 items-center justify-center gap-3 p-8 text-sm font-medium text-muted">
                <Spinner className="h-5 w-5" />
                Loading your previous candidate matches...
              </CardContent>
            </Card>
          ) : (
            <>
              <StartCandidateMatchingCard
                hasResults={Boolean(content)}
                selectedHiringPost={selectedHiringPost}
                quota={quota}
                loadingQuota={quotaQuery.isPending}
                canRun={canRun}
                isRunning={runMutation.isPending}
                onRun={() => runMatching(Boolean(content))}
              />
              {content ? (
                candidates.length ? (
                  <CandidateResultsPanel
                    candidates={candidates}
                    selectedHiringPost={selectedHiringPost}
                  />
                ) : (
                  <EmptyResultsCard
                    onRun={() => runMatching(true)}
                    disabled={!canRun || runMutation.isPending}
                  />
                )
              ) : null}
            </>
          )}
        </section>

        <aside className="grid content-start gap-5 xl:sticky xl:top-24">
          <RecruiterQuotaCard quota={quota} loading={quotaQuery.isPending} />
          <MatchingPolicyCard />
        </aside>
      </div>
    </div>
  );
}
