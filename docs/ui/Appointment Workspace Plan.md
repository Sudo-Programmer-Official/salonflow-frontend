# Appointment Workspace Plan

This document captures the next scheduling direction for SalonFlow.

## Goal

Evolve the current appointments surface into a single Appointment Workspace that supports:

- Day timeline
- Week timeline
- Quick create
- Drag and move
- Resize duration
- Conflict detection
- Live updates

## Architecture

The important split is:

- `Scheduler` owns business logic
- `Timeline` only renders

The scheduling engine should provide the shared data model for every calendar view.

## Delivery Order

### PR 1: Scheduling Engine

Backend:

- Scheduling query service
- Date range API
- Staff grouping
- Business hours
- Blocked times
- Time-slot generation
- Timezone handling

Frontend:

- `useScheduler()` composable/store
- Scheduler types
- Appointment mapper
- Grid calculations

No new UI yet.

### PR 2: Day Timeline

Consume the engine with:

- 15-minute grid
- Staff lanes
- Current time marker
- Appointment cards
- Existing drawer/modal reuse

### PR 3: Calendar Interactions

Add:

- Slot click
- Appointment click
- Keyboard navigation
- Scroll to current time

### PR 4: Scheduling Rules

Add:

- Conflict detection
- Business-hours validation
- Blocked-time validation
- Staff availability checks

### PR 5: Quick Create

Reuse the existing appointment creation flow from an empty slot.

### PR 6: Drag and Move

Enable rescheduling only after the rules layer exists.

### PR 7: Resize

Allow duration changes via the bottom edge.

### PR 8: Week View

Reuse the same engine and rendering components.

### PR 9: Live Updates

Add real-time refresh via SSE or WebSocket.

### PR 10: Polish

Finish with hover, preview, touch, and animation tuning.

## Model Shape

The appointment model should be ready for future scheduling features:

```ts
Appointment {
  id
  customerId
  staffId
  resourceId
  serviceId
  startTime
  endTime
  duration
  status
  source
  notes
  color
  isBlocked
  recurrenceId
  locationId
}
```

Only a subset is required initially, but the shape should avoid future migrations.

## Current Rule

Do not replace the existing appointments workflow until the scheduling engine, day view, drag-and-drop, and resizing all work together.
