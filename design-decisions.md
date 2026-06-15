1. Flag convention: Double-dash for long flags (--jd, --resume), single-dash for future short aliases. Why: matches developer convention; single-dash + multi-letter is interpreted as multiple short flags by most CLI frameworks.

2. Scope cut: Multi-resume, URL scraping, and keyword-only mode dropped from Week 1. Why: tighter scope ships better; multi-resume is a meaningfully different product worth deciding separately.

3. Frequency = importance: For Week 1, JD keyword frequency is the proxy for importance. Why: dumb but defensible; Week 2's Claude can do better (distinguish skills from filler).

4. ATS limitations explicit: Tool's output discloses it's an approximation, not real ATS scoring. Why: recruiter-defined keywords often aren't in the JD, so any JD-to-resume tool is fundamentally incomplete. Intellectual honesty over overclaiming.

5. Letter grade rubric: Pure % of keywords found, equal weighting. Why: simple and explainable. Weighted scoring is Week 2+ territory.
6. --jd accepts a file path. The path - means "read from stdin."
Rationale: avoids the heuristic ambiguity of "is this text or a path?" (Option A), avoids the verbosity of two flags (Option B), and composes naturally with Unix tools via pipes. Matches the convention of well-designed CLIs like gh, kubectl, and jq.
Cost: requires the user to either save the JD to a file OR pipe it in via stdin (e.g., pbpaste | resume-grader --jd -). Acceptable because this is standard CLI design.
Note: pbpaste is macOS-specific. Future me / other users on Linux would use xclip -o or wl-paste. The tool itself doesn't care — it just reads stdin.
