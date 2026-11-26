import { describe, expect, it } from "vitest";
import { formatHiringPostSalary, formatYearsRequired, salaryPeriodLabel } from "../hiring-post-card";
import { hiringPostViewer } from "../../../utils/hiring-post-viewer";

describe("hiring post salary", () => {
  it("formats monthly ranges and single salary bounds", () => {
    expect(formatHiringPostSalary({ salaryMin: 1000, salaryMax: 2000 })).toBe("$1,000 - $2,000/mo");
    expect(formatHiringPostSalary({ salaryMin: 1000, salaryMax: null })).toBe("From $1,000/mo");
    expect(formatHiringPostSalary({ salaryMin: null, salaryMax: 2000 })).toBe("Up to $2,000/mo");
    expect(formatHiringPostSalary({ salaryMin: null, salaryMax: null })).toBe("");
  });

  it("uses the post's currency and period, and treats posts without units as USD per month", () => {
    expect(formatHiringPostSalary({ salaryMin: 60000, salaryMax: 80000, salaryCurrency: "EUR", salaryPeriod: "year" })).toBe("€60,000 - €80,000/yr");
    expect(formatHiringPostSalary({ salaryMin: 20, salaryMax: null, salaryCurrency: "USD", salaryPeriod: "hour" })).toBe("From $20/hr");
    expect(formatHiringPostSalary({ salaryMin: 1000, salaryMax: 2000, salaryCurrency: null, salaryPeriod: null })).toBe("$1,000 - $2,000/mo");
    expect(formatHiringPostSalary({ salaryMin: 1000, salaryMax: null, salaryCurrency: "XX1" })).toBe("From 1,000 XX1/mo");
    expect(salaryPeriodLabel({ salaryPeriod: "year" })).toBe("Yearly salary");
    expect(salaryPeriodLabel({})).toBe("Monthly salary");
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
  it("lets candidates and admins apply, asks visitors to sign in, and lets recruiters read", () => {
    expect(hiringPostViewer("user")).toBe("candidate");
    expect(hiringPostViewer(undefined)).toBe("visitor");
    expect(hiringPostViewer("employer")).toBe("recruiter");
    expect(hiringPostViewer("admin")).toBe("candidate");
  });
});
