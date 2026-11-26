// @find candidates page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /candidates (recruiters search candidate profiles)
 *
 * Everything on this page that can be changed without touching the page code.
 * Safe edits: remove a line, reorder lines, change a label or a number.
 * Adding a NEW value (a new level, a new search field) also needs the backend to accept it (see each note).
 */
export const candidatesConfig = {
  /** Candidates per page. Backend limit: 1–100. */
  pageSize: 12,

  search: {
    /** Grey hint text inside the keyword box. */
    placeholder: 'Name, role, skill, or project',
    /**
     * Fields the keyword is searched in. Remove a line to stop searching that field.
     * Allowed by the backend: name, headline, bio, location, skills, portfolio
     * (CANDIDATE_SEARCH_FIELDS in NestjsBE candidate-directory-query.dto.ts).
     */
    fields: ['name', 'headline', 'bio', 'location', 'skills', 'portfolio'],
    /** Show the second box "Location" inside the search bar (wide screens). */
    showLocationBox: true,
    locationPlaceholder: 'Location (e.g. Ho Chi Minh, Remote)',
  },

  /** How many popular skills show as quick chips under the search bar. */
  popularSkillsLimit: 6,

  filters: {
    /** "Occupation" group (pick an ESCO occupation). */
    occupation: { show: true, title: 'Occupation' },
    /** "AI level" group. Values must be Junior, Mid or Senior (the level the AI reads from the resume). */
    level: { show: true, title: 'AI level', values: ['Junior', 'Mid', 'Senior'] },
    /** "Years of experience" group: the quick choices, in years ("1+ years", ...). */
    minYears: { show: true, presets: [1, 3, 5, 8] },
    /** "Skill" group (type a skill). */
    skill: { show: true, title: 'Skill' },
    /** "Location" group; only on phones, because wide screens have the box in the search bar. */
    location: { show: true, title: 'Location' },
  },
} as const
