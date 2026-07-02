---
name: update-changelog
description: 'Maintain the root CHANGELOG.md before merging. Use when you want to seed a changelog from git history, append missing dated entries, or refresh release notes grouped by YYYY-MM-DD headings.'
argument-hint: 'Optional scope, for example: seed from git history, update before merge, or add entries since the last changelog date'
user-invocable: true
disable-model-invocation: true
---

# Update Changelog

Maintain [CHANGELOG.md](../../../CHANGELOG.md) at the project root with sections grouped by date.

## When to Use

- Before merging a branch
- When [CHANGELOG.md](../../../CHANGELOG.md) does not exist yet
- When new commits landed and the dated sections need to be updated
- When you want to turn recent git commit history into human-readable dated bullets

## Required Rules

- The file to maintain is [CHANGELOG.md](../../../CHANGELOG.md)
- Use `## YYYY-MM-DD` headings in descending order, newest first
- Under each date, add flat `- ` bullet points
- Preserve existing entries unless they are clearly duplicated or wrong
- Avoid duplicate bullets for the same commit subject
- Prefer concise, readable bullet text; keep the original commit meaning intact

## Procedure

1. Check whether [CHANGELOG.md](../../../CHANGELOG.md) already exists.
2. If it does not exist, inspect git history with a dated log such as `git log --date=short --pretty=format:"%ad|%s"`.
3. Group commit subjects by date and create [CHANGELOG.md](../../../CHANGELOG.md) with a `# Changelog` title and one `## YYYY-MM-DD` section per date.
4. If the file already exists, read the most recent dated heading and inspect git commits that are not yet represented in the file.
5. Append or insert missing bullets under the correct date heading. Create a new date heading when needed.
6. Keep newest dates first and do not reorder older content unnecessarily.
7. After editing, verify the changelog still has a single top-level title and date headings are consistently formatted.

## Commit Selection Guidance

- Start from raw git commit subjects; do not invent product changes that are not supported by history
- Skip exact duplicates already present in [CHANGELOG.md](../../../CHANGELOG.md)
- Purely noisy merge commits can be omitted if they add no useful meaning
- Keep meaningful merge or milestone commits when they describe a real project change
- If several commits on one date repeat the same change, merge them into one bullet only when the meaning stays accurate

## Validation

- Confirm [CHANGELOG.md](../../../CHANGELOG.md) exists in the project root
- Confirm every section heading uses the `## YYYY-MM-DD` format
- Confirm newly added bullets reflect git history for the requested scope
- Report which dates were created or updated