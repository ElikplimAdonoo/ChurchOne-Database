# ChurchOne — Issues & Next Steps

## 🔴 Critical Bugs

### 1. Tabs Show Blank Pages
**What Happens**: Clicking Directory, Graph, or Attendance from the nav sometimes shows an empty screen.
**Root Cause**: The `AnimatePresence mode="wait"` wrapper in `MainLayout.jsx` can swallow page renders during route transitions. The exit animation blocks the new route from mounting.
**Fix**: Remove `mode="wait"` or simplify the transition logic. Test that every tab loads reliably when clicked, not just on direct URL navigation.

### 2. Dashboard Cards Are Developer-Focused
**What Happens**: The Home page shows "System Health: Optimal" and "Placement Rate: 86%". These are meaningless to a Cell Shepherd.
**Fix**: Replace with church-relevant cards:
- "My Members" (count)
- "Active Cells" (count with leaders)  
- "This Week's Attendance" (trend)
- "Needs Attention" (alerts for missing leaders, inactive members)

## 🟡 Design Issues

### 3. Cards Layout
The current stat cards use heavy borders and dark gradients that feel generic/techy. For a church app:
- Use softer colors (warm blues, gentle golds)
- Add meaningful icons (people, church, hands)
- Show contextual numbers, not abstract percentages

### 4. Directory UI
The People Directory works but needs polish:
- Member cards should show photos more prominently
- The "Edit" and "Remove" buttons are too prominent — tuck them behind a "..." menu
- Add a quick-action for the most common task: "Move to another cell"

### 5. Attendance Flow
Currently requires authentication and role linkage. This is correct, but the empty state when not linked is confusing. Add clearer instructions for first-time users.

## 🟢 What's Working Well
- ✅ Bottom tab navigation on mobile
- ✅ Swipe gesture navigation
- ✅ Hierarchy tree with expandable nodes
- ✅ Authentication and protected routes
- ✅ People search and filtering

## Prioritized Next Steps

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Fix blank tab pages (AnimatePresence bug) | Small |
| P0 | Redesign Dashboard cards for church context | Medium |
| P1 | Polish Directory member cards | Medium |
| P1 | Improve empty states across all pages | Small |
| P2 | Add member profile detail view | Large |
| P2 | Drag-and-drop in Structure view | Large |
| P3 | CSV/Excel import for bulk members | Medium |
| P3 | Leadership-specific dashboard stats | Medium |
