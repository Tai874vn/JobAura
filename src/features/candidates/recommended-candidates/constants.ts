import type { CreateHiringPost } from "@/shared/schemas";

export const hiringPostPageParams = { page: 1, pageSize: 50 };
export const topKOptions = [5, 10, 12];
export const poolSizeOptions = [50, 100, 150];

export const emptyHiringPostDraft: CreateHiringPost = {
  title: "",
  description: "",
  requirements: "",
  location: "",
  employmentType: "",
  salaryMin: undefined,
  salaryMax: undefined,
};
