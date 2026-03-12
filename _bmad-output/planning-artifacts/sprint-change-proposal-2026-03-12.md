# Sprint Change Proposal - Epic 6 Correction

Date: 2026-03-12
Project: DigiTransit-v2
Requested by: Jyrki
Workflow: `bmad-bmm-correct-course`

## 1. Issue Summary

Epic 6 ("Build & Release") is no longer valid as originally planned. The capabilities it was intended to deliver were already implemented earlier in the project, so leaving Epic 6 unchanged would duplicate completed work and misrepresent the remaining backlog.

This change was identified during sprint maintenance on 2026-03-12 while reviewing the current epics and sprint tracking. The requested correction is to repurpose Epic 6 into a miscellaneous features/fixes epic while keeping existing completed stories intact.

Evidence:
- The architecture already treats EAS build profiles and CI/CD quality gates as baseline delivery capabilities rather than outstanding scope.
- `sprint-status.yaml` still showed Epic 6 as backlog with the old stories `6-1-eas-build-profiles` and `6-2-ci-quality-gates`.
- No Epic 6 implementation story files exist in `_bmad-output/implementation-artifacts`, confirming this is a planning correction rather than a rollback of implemented work.

## 2. Impact Analysis

### Epic Impact

- Epic 6 required redefinition because its planned scope had already been satisfied elsewhere.
- Epics 1-5 remain intact.
- No completed story content was removed or rewritten.
- Epic ordering does not need to change; Epic 6 remains the final epic but now functions as a controlled backlog buffer for miscellaneous fixes and polish.

### Story Impact

- Removed backlog story definitions:
  - `6.1 EAS Build Profiles`
  - `6.2 CI Quality Gates`
- Retained one replacement story:
  - `6.1 Final Polish, Accessibility & Documentation Cleanup`
- The original `6.1 EAS Build Profiles` story remains obsolete and is replaced by the renumbered cleanup story.
- Existing completed stories in Epics 1-5 remain untouched.

### Artifact Conflicts

- PRD: No change required. MVP scope and product goals remain the same.
- Architecture: No change required. The existing architecture already reflects build/deployment and CI as available capabilities.
- UX specification: No structural change required. Epic 6 now covers cleanup and polish against the existing UX direction rather than introducing new UX scope.
- Sprint tracking: Required update to replace obsolete Epic 6 backlog entries with the new backlog stories.

### Technical Impact

- No code rollback required.
- No infrastructure change required.
- Planning artifacts needed correction so backlog intent matches current project reality.

## 3. Recommended Approach

Selected path: Direct Adjustment

Rationale:
- This is a planning mismatch, not a failed implementation.
- The lowest-risk correction is to rewrite Epic 6 in place and update sprint tracking to match.
- This preserves momentum, avoids unnecessary renumbering, and keeps prior completed work stable.

Assessment:
- Effort: Low
- Risk: Low
- Timeline impact: Minimal

Alternatives considered:
- Potential Rollback: Not viable. There is nothing to roll back in Epic 6, and previously completed work should remain intact.
- PRD MVP Review: Not needed. The MVP is unchanged; only the remaining backlog framing was wrong.

## 4. Detailed Change Proposals

### Epics Document

Change 1: Epic 6 title and summary

OLD:
- `Epic 6: Build & Release`
- Focused on EAS profiles and CI quality gates

NEW:
- `Epic 6: Miscellaneous Features & Fixes`
- Focused on residual bug fixes, cross-platform hardening, accessibility/UI polish, and documentation cleanup without expanding MVP scope

Justification:
- Aligns the plan with work that actually remains.
- Avoids duplicating capabilities already implemented earlier.

Change 2: Story 6.1 removal

OLD:
- `Story 6.1: EAS Build Profiles`

NEW:
- Removed as obsolete

Justification:
- No replacement is needed for this slot because the original build/release capability was already implemented and there is no separate remaining backlog item for it.

Change 3: Remaining story renumber

OLD:
- `Story 6.2: CI Quality Gates`

NEW:
- `Story 6.1: Final Polish, Accessibility & Documentation Cleanup`

Justification:
- Keeps Epic 6 with a single remaining story while preserving a bounded cleanup scope that does not justify a new epic.

Change 4: Story 6.1 implementation guidance

Added explicit scope guidance for:
- CoordinatesBar primary label should show the resolved current address instead of placeholder text
- Settings bottom spacing and footer action positioning cleanup
- Stops list container should visually fill the lower viewport more consistently when only a few stops are present
- Map view needs a visible recenter / targeting control that returns to the user's live location
- Notification lead-time options must include `30 min`
- Settings must support disabling the automatic home-stop launch notification separately from the overall push notification capability

Justification:
- Converts vague polish scope into concrete, reviewable acceptance criteria based on current device-validation findings.

### Sprint Tracking

OLD:
```yaml
epic-6: backlog
6-1-eas-build-profiles: backlog
6-2-ci-quality-gates: backlog
epic-6-retrospective: optional
```

NEW:
```yaml
epic-6: backlog
6-1-final-polish-accessibility-and-documentation-cleanup: backlog
epic-6-retrospective: optional
```

Justification:
- Keeps sprint tracking synchronized with the corrected backlog plan.

## 5. Implementation Handoff

Scope classification: Moderate

Reason:
- This required backlog reorganization and planning artifact updates, but not a strategic replanning of the product.

Handoff recipients and responsibilities:
- Product Owner / Scrum Master:
  - Use the updated Epic 6 definitions when creating any future story artifacts.
  - Keep any new miscellaneous work bounded to the revised epic scope.
- Development team:
  - Implement only the revised Epic 6 backlog items if remaining defects/polish work are actually needed.
  - Leave completed stories in Epics 1-5 untouched unless a genuine regression is found.

Success criteria:
- Epic 6 no longer references already-implemented build/release work.
- `epics.md` and `sprint-status.yaml` describe the same revised Epic 6 backlog.
- Existing completed stories remain intact.

## Approval

Approval basis: Explicit user request on 2026-03-12 to rewrite Epic 6 as a miscellaneous features/fixes epic and update the epics document plus sprint tracking accordingly, while preserving existing completed stories.
