# Prompt: Senior SWE Review Board

Use this prompt for model-diverse plan critique or diff review.

```text
Use .squad/playbooks/senior-swe-review-board.md.

Run the senior SWE review board for this plan or diff:
- senior-swe-planner reviews the plan before implementation;
- senior-swe-critic critiques design, edge cases, tests, and CI risk;
- senior-swe-reviewer compares the implemented diff against the plan, comments, and validation evidence;
- senior-swe-adjudicator resolves conflicting findings only if needed.

Use different strong model slots where available, but do not hard-code model names. Focus on correctness, reliability, coverage, security, and CI readiness, not style-only comments.
```
