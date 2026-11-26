// @find hiring-posts page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /hiring-posts (public list of open roles)
 *
 * Everything on this page that can be changed without touching the page code.
 * Safe edits: remove a line, reorder lines, change a label or a number.
 * Adding a NEW value (a new level, a new sort, a new search field) also needs the backend to accept it:
 * the backend answers 400 to values it does not know (see the note on each item).
 */
export const hiringPostsConfig = {
  /** Roles per page. Backend limit: 1–100 (pageSize in PaginationDto). */
  pageSize: 10,

  search: {
    /** Grey hint text inside the keyword box. */
    placeholder: 'Role, skill, or company',
    /**
     * Fields the keyword is searched in. Remove a line to stop searching that field.
     * Allowed by the backend: title, description, requirements, location, employmentType, companyName,
     * recruiterName, skills (HIRING_POST_SEARCH_FIELDS in NestjsBE hiring-post-query.dto.ts).
     */
    fields: [
      'title',
      'description',
      'requirements',
      'location',
      'employmentType',
      'companyName',
      'recruiterName',
      'skills',
    ],
    /** Show the "Location" picker inside the search bar (wide screens). */
    showLocationBox: true,
  },

  /** Quick search chips under the search bar, used until the backend says which occupations have the most roles. */
  exploreChips: ['Software developer', 'Data analyst', 'Product manager', 'Graphic designer'],

  filters: {
    /** "Experience level" group. Values must be Junior, Mid or Senior (backend HIRING_POST_LEVELS). */
    level: {
      show: true,
      title: 'Experience level',
      values: ['Junior', 'Mid', 'Senior'],
    },
    /** "Employment type" group. Values are free text in the database (matched ignoring case). */
    employmentType: {
      show: true,
      title: 'Employment type',
      values: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
      /** Also list other types that posts actually use. false = only the values above. */
      alsoShowTypesFoundInPosts: true,
    },
    /** "Location" group: the most common locations of open posts. */
    location: {
      show: true,
      title: 'Location',
      /** How many locations are listed in the filter column. */
      maxChoices: 5,
    },
  },

  /**
   * The "Sort" menu, in this order. Remove a line to hide that choice.
   * Allowed by the backend: newest, closing_soon, salary_high (HIRING_POST_SORTS).
   */
  sorts: [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'closing_soon', label: 'Closing soon' },
    { value: 'salary_high', label: 'Highest salary' },
  ],
} as const
