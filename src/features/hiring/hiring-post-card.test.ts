import { describe, expect, it } from "vitest";
import { formatHiringPostSalary, formatYearsRequired } from "./hiring-post-card";
import { hiringPostViewer } from "./hiring-post-viewer";

describe("hiring post salary", () => {
  it("formats monthly ranges and single salary bounds", () => {
    expect(formatHiringPostSalary({ salaryMin: 1000, salaryMax: 2000 })).toBe("$1,000 - $2,000/mo");
    expect(formatHiringPostSalary({ salaryMin: 1000, salaryMax: null })).toBe("From $1,000/mo");
    expect(formatHiringPostSalary({ salaryMin: null, salaryMax: 2000 })).toBe("Up to $2,000/mo");
    expect(formatHiringPostSalary({ salaryMin: null, salaryMax: null })).toBe("");
  });
});

describe("required years", () => {
  it("says when no experience is needed", () => {
    expect(formatYearsRequired(0)).toBe("No experience required");
    expect(formatYearsRequired(1)).toBe("1+ year of experience");
    expect(formatYearsRequired(4)).toBe("4+ years of experience");
  });
});

describe("hiringPostViewer", () => {
  it("lets candidates apply, asks visitors to sign in, and lets recruiters read", () => {
    expect(hiringPostViewer("user")).toBe("candidate");
    expect(hiringPostViewer(undefined)).toBe("visitor");
    expect(hiringPostViewer("employer")).toBe("recruiter");
    expect(hiringPostViewer("admin")).toBe("recruiter");
  });
});
