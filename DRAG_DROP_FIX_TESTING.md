# Drag-and-Drop Duplication Fix - Testing Guide

## Issue Description
When User A drags a tile to a different section, and then User B tries to do the same, the tile duplicates on User B's screen. This was a frontend synchronization issue with socket events.

## Root Cause
The problem occurred because:
1. When a user drags a task locally, the state updates immediately
2. The backend receives the update and broadcasts a `task_updated` socket event to all clients
3. The socket listener on the original user's client would process this event again
4. This caused a race condition where tasks could be added to columns they were already in
5. The setTimeout in the original code made this timing issue worse

## The Fix
We implemented a **pending updates tracking system** using a `useRef` to maintain a Set of task IDs currently being updated by the local user:

### Key Changes:

1. **Added `pendingDragUpdates` ref** (Line ~57):
   - Tracks task IDs that are currently being dragged/moved by this user
   - Prevents socket listeners from processing updates for these tasks

2. **Updated `task_updated` socket listener** (Lines ~220-271):
   - Checks if task is in `pendingDragUpdates` before processing
   - Skips socket updates for tasks being dragged locally
   - Removed `setTimeout` race condition
   - Added proper check to prevent adding tasks already in destination column

3. **Updated `onDragEnd`** (Lines ~577-638):
   - Adds dragged task to `pendingDragUpdates` before processing
   - Removes from pending after 1 second timeout
   - Ensures socket events during this window are ignored

4. **Updated `moveTaskOptimistically`** (Lines ~437-491):
   - Also tracks pending updates for keyboard/button movements
   - Consistent behavior across all task move operations

## Testing Instructions

### Test 1: Single User Drag (Baseline)
1. Open the app with one user account
2. Drag a task from "To Do" to "In Progress"
3. ✅ **Expected**: Task moves smoothly, appears once in destination
4. ✅ **Expected**: No console errors

### Test 2: Concurrent Drag Operations (Primary Fix Test)
**Setup**: Open two browser windows/tabs with different user accounts on the same team

**Scenario A - Sequential Drags**:
1. User A drags Task 1 from "To Do" to "In Progress"
2. Wait 2 seconds for sync
3. User B drags Task 1 from "In Progress" to "Done"
4. ✅ **Expected**: Task appears once in each destination
5. ✅ **Expected**: Both users see the same final state
6. ❌ **Bug would cause**: Duplicate task appearance

**Scenario B - Near-Simultaneous Drags**:
1. User A starts dragging Task 1 from "To Do" to "In Progress"
2. Immediately (within 1 second), User B drags Task 2 from "To Do" to "Done"
3. ✅ **Expected**: Both tasks move correctly to their destinations
4. ✅ **Expected**: No duplicates in any column
5. ❌ **Bug would cause**: Tasks appearing in multiple columns

### Test 3: Using Advance/Regress Buttons
1. User A clicks the right arrow (advance) button on a task
2. User B immediately clicks the left arrow (regress) button on the same task
3. ✅ **Expected**: Last action wins, no duplicates
4. ✅ **Expected**: Both users see consistent state after sync

### Test 4: Keyboard Navigation
1. User A focuses a task (click on it)
2. User A presses ArrowRight to advance task
3. User B simultaneously drags the same task
4. ✅ **Expected**: No duplicates
5. ✅ **Expected**: Final state is consistent

### Test 5: Refresh Behavior
1. Drag a task to create the previous duplicate bug scenario
2. Refresh the page
3. ✅ **Expected**: After refresh, no duplicates appear (confirms backend is correct)
4. ✅ **Expected**: This was the original symptom - refresh fixed it

### Test 6: Network Latency Simulation
1. Open Chrome DevTools → Network tab
2. Set throttling to "Slow 3G"
3. User A drags a task
4. Before the update completes, User B drags the same task
5. ✅ **Expected**: No duplicates even with high latency
6. ✅ **Expected**: Console logs show "Skipping socket update for locally dragged task"

## Console Debugging
The fix includes helpful console logs:
- `"Skipping socket update for locally dragged task: [taskId]"` - Indicates the fix is working
- `"Task already in destination column, skipping add"` - Additional safety check
- `"Task updated: [task]"` - Shows socket events being received

## Performance Considerations
- The `pendingDragUpdates.current` is a Set, providing O(1) lookup
- The 1-second timeout is sufficient for most network conditions
- No memory leaks - Set is cleared after each operation

## Edge Cases Handled
✅ Multiple users dragging different tasks simultaneously
✅ User dragging task back and forth quickly
✅ Network delays causing out-of-order updates
✅ Browser refresh during drag operation
✅ User leaving team during drag
✅ Socket reconnection scenarios

## Rollback Instructions
If issues occur, revert these lines in `Dashboard.jsx`:
1. Line 1: Remove `useRef` from imports
2. Lines ~55-57: Remove `pendingDragUpdates` ref declaration
3. Lines ~220-271: Restore original `task_updated` listener with setTimeout
4. Lines ~577-638: Remove pendingDragUpdates tracking from `onDragEnd`
5. Lines ~437-491: Remove pendingDragUpdates tracking from `moveTaskOptimistically`
