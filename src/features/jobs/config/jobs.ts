/**
 * Configurable settings for the /jobs portfolios and services browse page.
 * Defines page size, searchable fields, explore chips, category limits, price filter ranges, and sort menu options.
 *
 * Calls: credits
 * Used by:
 *   - features/jobs/components/browse/job-category-nav.tsx
 *   - features/jobs/components/browse/job-list-view.tsx
 *   - features/jobs/utils/jobs-browse-view.ts
 */

import { credits } from '@/shared/lib/credits'

// @find jobs page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /jobs (portfolios and services list)
 *
 * Everything on this page that can be changed without touching the page code.
 * Safe edits: remove a line, reorder lines, change a label or a number.
 * Adding a NEW value (a new sort, a new search field) also needs the backend to accept it (see each note).
 */
export const jobsConfig = {
  /** Cards per page. Backend limit: 1–100. */
  pageSize: 12,

  search: {
    /** Grey hint text inside the keyword box. */
    placeholder: 'Role, skill, or candidate name',
    /**
     * Fields the keyword is searched in. Remove a line to stop searching that field.
     * Allowed by the backend: title, shortDescription, description, sellerName, subcategory, category
     * (JOB_SEARCH_FIELDS in NestjsBE job-search-query.dto.ts).
     */
    fields: ['title', 'shortDescription', 'description', 'sellerName', 'subcategory', 'category'],
  },

  /** Quick search chips under the search bar (clicking one searches that word). */
  exploreChips: ['Software Engineer', 'Data Analyst', 'Product Designer', 'QA', 'Marketing'],

  /** The category bar under the search: how many categories show before "More". */
  categoryBarLimit: 8,

  filters: {
    /** "Category" group; the categories themselves come from the admin pages. */
    category: {
      show: true,
      title: 'Category',
      /** How many categories show before "Show more categories". */
      collapsedLimit: 8,
    },
    /** "Specialty" group; appears when the chosen category has specialties. */
    specialty: {
      show: true,
      title: 'Specialty',
    },
    /**
     * "Price" group, in credits. Each range is minPrice..maxPrice (leave one out for "no limit").
     * Price 0 = a portfolio post (no rate), so priced ranges start at 1.
     */
    price: {
      show: true,
      title: 'Price',
      ranges: [
        { id: 'portfolio', label: 'Portfolio posts', minPrice: 0, maxPrice: 0 },
        { id: 'up_to_500', label: `Up to ${credits(500)}`, minPrice: 1, maxPrice: 500 },
        { id: '500_to_2000', label: `${credits(500)} to ${credits(2000)}`, minPrice: 500, maxPrice: 2000 },
        { id: '2000_to_5000', label: `${credits(2000)} to ${credits(5000)}`, minPrice: 2000, maxPrice: 5000 },
        { id: 'over_5000', label: `${credits(5000)} and up`, minPrice: 5000 },
      ],
    },
  },

  /**
   * The "Sort" menu, in this order. Remove a line to hide that choice ('' = the default order).
   * Allowed by the backend: newest, price_asc, price_desc, rating_desc.
   */
  sorts: [
    { value: '', label: 'Default' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Lowest price' },
    { value: 'price_desc', label: 'Highest price' },
    { value: 'rating_desc', label: 'Highest rated' },
  ],
} as const
