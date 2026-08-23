import { describe, expect, it } from "vitest";
import { formatHiringPostSalary } from "./hiring-post-card";

describe("hiring post salary", () => {
  it("formats ranges and single salary bounds", () => {
    expect(formatHiringPostSalary({ salaryMin: 1000, salaryMax: 2000 })).toBe("$1,000 - $2,000");
    expect(formatHiringPostSalary({ salaryMin: 1000, salaryMax: null })).toBe("From $1,000");
    expect(formatHiringPostSalary({ salaryMin: null, salaryMax: 2000 })).toBe("Up to $2,000");
    expect(formatHiringPostSalary({ salaryMin: null, salaryMax: null })).toBe("");
  });
});
