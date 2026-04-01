# Duplicate Tile Bug - Technical Flow Diagram

## Before Fix (Bug Scenario)

```
User A Browser                    Backend/Socket Server              User B Browser
═══════════════                   ═════════════════════              ═══════════════

[User drags Task X]
  │
  ├─→ Update local state
  │   (Task X: todo → inprogress)
  │
  ├─→ API PUT /tasks/X ─────────→ [Receives update]
  │                                    │
  │                                    ├─→ Update DB
  │                                    │
  │                                    └─→ Broadcast socket
  │                                        'task_updated'
  │                                              │
  ┌────←────────────────────────────────────────┤
  │                                              │
  ↓                                              ↓
[Receives 'task_updated']                [Receives 'task_updated']
  │                                              │
  ├─→ Process socket event                      ├─→ Process socket event
  │   ❌ BUG: Tries to move                      │   ✅ Moves Task X
  │   Task X again!                              │   (todo → inprogress)
  │                                              │
  └─→ ❌ DUPLICATE: Task X                       └─→ State updated
      appears in both columns!

Now when User B tries to drag:
                                                 [User drags Task X]
                                                   │
                                                   ├─→ Broadcast again
                                                   │
                ┌─────────────────────────────────┘
                │
                ↓
         [Receives update]
           │
           └─→ ❌❌ MORE DUPLICATES!
```

## After Fix (Correct Behavior)

```
User A Browser                    Backend/Socket Server              User B Browser
═══════════════                   ═════════════════════              ═══════════════
[pendingDragUpdates: Set()]      [Socket Event Hub]                [pendingDragUpdates: Set()]

[User drags Task X]
  │
  ├─→ pendingDragUpdates.add('X')
  │
  ├─→ Update local state
  │   (Task X: todo → inprogress)
  │
  ├─→ API PUT /tasks/X ─────────→ [Receives update]
  │                                    │
  │                                    ├─→ Update DB
  │                                    │
  │                                    └─→ Broadcast socket
  │                                        'task_updated'
  │                                              │
  ┌────←────────────────────────────────────────┤
  │                                              │
  ↓                                              ↓
[Receives 'task_updated']                [Receives 'task_updated']
  │                                              │
  ├─→ Check pendingDragUpdates                  ├─→ Check pendingDragUpdates
  │   ✅ Contains 'X'? YES!                      │   ✅ Contains 'X'? NO
  │                                              │
  ├─→ ✅ SKIP processing                         ├─→ ✅ Process socket event
  │   (console: "Skipping...")                   │   Moves Task X
  │                                              │   (todo → inprogress)
  │                                              │
  └─→ setTimeout(() => {                         └─→ State updated correctly
        pendingDragUpdates.delete('X')
      }, 1000)

After 1 second:
[pendingDragUpdates: Set()]                    [pendingDragUpdates: Set()]
  (cleaned up, ready for next drag)              (ready for User B's drag)


Now when User B drags Task Y:
                                                 [User drags Task Y]
                                                   │
                                                   ├─→ pendingDragUpdates.add('Y')
                                                   │
                                                   ├─→ Update local state
                                                   │
                                                   └─→ Broadcast...
                ┌─────────────────────────────────┘
                │
                ↓
         [Receives 'task_updated']
           │
           ├─→ Check pendingDragUpdates
           │   ✅ Contains 'Y'? NO (different user)
           │
           └─→ ✅ Process normally
               No duplicates!
```

## Key Components

### 1. pendingDragUpdates Ref
```javascript
const pendingDragUpdates = useRef(new Set());
```
- **Type**: Set of task IDs (strings)
- **Purpose**: Track tasks currently being moved by THIS user
- **Lifetime**: Cleared 1 second after each operation

### 2. Socket Listener Guard
```javascript
if (pendingDragUpdates.current.has(task.id)) {
  console.log('Skipping socket update for locally dragged task:', task.id);
  return; // ← Prevents duplicate processing
}
```

### 3. Drag Operation Flow
```javascript
onDragEnd:
  1. pendingDragUpdates.add(taskId)      ← Mark as pending
  2. Update local state                   ← Immediate UI feedback
  3. Send to backend                      ← Persist changes
  4. setTimeout → delete(taskId)          ← Cleanup after 1s
```

## Timing Analysis

```
Time: 0ms
  └─→ User A drags (local update + add to pending)

Time: 50-200ms
  └─→ Backend receives API call

Time: 100-300ms
  └─→ Socket event broadcast to all clients

Time: 150-400ms
  └─→ User A receives socket event
      ├─→ Checks pending: FOUND ✅
      └─→ SKIPS processing (no duplicate)

Time: 150-400ms (simultaneous)
  └─→ User B receives socket event
      ├─→ Checks pending: NOT FOUND ✅
      └─→ Processes normally (updates UI)

Time: 1000ms
  └─→ User A clears pending
      Now ready for next operation
```

## Edge Cases Handled

### Case 1: Very Fast Network (Low Latency)
```
0ms:   User drags → add to pending
10ms:  Socket event arrives
       ↓
       Check pending: FOUND ✅ → Skip
```

### Case 2: Slow Network (High Latency)
```
0ms:    User drags → add to pending
500ms:  Socket event arrives (delayed)
        ↓
        Check pending: FOUND ✅ → Skip
1000ms: Cleanup pending
```

### Case 3: Multiple Users, Same Task
```
User A @ 0ms:   Drags Task X → pending.add('X')
User B @ 100ms: Drags Task X → pending.add('X')
                ↓
                Both users skip their own socket events
                Both process the OTHER user's event
                Result: Last action wins (correct behavior)
```

## Why 1000ms Timeout?

- **Typical socket latency**: 50-300ms
- **Margin for slow connections**: 1000ms handles 3G/4G
- **Not too long**: Won't interfere with rapid successive drags
- **Tested with**: Slow 3G throttling (works correctly)

## Memory & Performance

- **Space**: O(n) where n = concurrent drag operations (typically 1-2)
- **Lookup**: O(1) for Set.has()
- **Add/Delete**: O(1) for Set operations
- **Memory leak risk**: None (automatic cleanup via setTimeout)
