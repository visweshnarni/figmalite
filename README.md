
# Figma-Lite Collab

This repository contains a complete implementation of a real-time collaborative design editor, similar to a simplified version of Figma. It's built with a Next.js frontend and an Express + Socket.IO backend.

## Features

- **Real-time Collaboration**: Multiple users can join a design document and see each other's changes live.
- **Vector Editing**: Create and manipulate rectangles, ellipses, lines, and freehand paths.
- **Image Support**: Upload images via drag-and-drop or file input.
- **Rich Interaction**: Select, move, resize, and rotate elements with interactive handles.
- **Undo/Redo**: Per-user undo/redo functionality that syncs with other clients.
- **Optimistic Locking**: Elements are locked during interactive transforms (drag, resize) to prevent conflicts.
- **Conflict Resolution**: The server uses a Last-Write-Wins (LWW) strategy based on server timestamps for conflicting updates.
- **Persistence**: Documents are saved to a JSON file on the server.
- **UI Features**: Minimap for navigation, layer panel, properties inspector, and a light/dark theme toggle.

## How to Run

### Prerequisites
- Node.js (v18 or later)
- npm

### 1. Backend Server

First, set up and run the backend server.

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Run the server
node server.js
```
The server will start on `http://localhost:4000`.

### 2. Frontend Application

Next, set up and run the Next.js frontend in a separate terminal.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```
The frontend will be available at `http://localhost:3000`.

### 3. How to Demo

1.  Open your browser and navigate to `http://localhost:3000/editor/doc-1`.
2.  Open a second browser window or tab and navigate to the same URL (`http://localhost:3000/editor/doc-1`).
3.  You now have two clients connected to the same document.
4.  Use the toolbar on the left to select a tool (e.g., Rectangle) and draw on the canvas in one window. The shape will appear instantly in the other window.
5.  Select a shape and drag, resize, or rotate it. You will see a lock icon on the shape in the other window, preventing the other user from editing it simultaneously.
6.  Change properties like fill color or stroke width from the properties panel on the right. The changes will sync.
7.  Use `Ctrl+Z` (or `Cmd+Z`) to undo and `Ctrl+Y` (or `Cmd+Y`) to redo. These actions will also be reflected for all users.

## Technical Explanation

### Collaboration Protocol

All real-time communication is handled via Socket.IO. Clients and the server exchange lightweight JSON objects called "Ops" (operations).

**Op Format:**
```json
{
  "opId": "uuid",          // Unique ID for the operation
  "docId": "doc-1",        // The document being edited
  "userId": "user-123",    // The client's unique socket ID
  "action": "create|update|delete|lock|unlock|presence",
  "elementId": "el-1",     // The ID of the element being affected
  "payload": { /* ... */ },// Data for the action (e.g., new element data, updated properties)
  "timestamp": 1690000000000 // Client-side timestamp
}
```

### Conflict Resolution: Locking & Last-Write-Wins (LWW)

To handle concurrent edits gracefully, we use a combination of optimistic locking and LWW merging.

1.  **Optimistic Locking**: When a user starts an interactive transform (like dragging, resizing, or rotating an element), the client immediately sends a `lock` op to the server. The server marks the element as locked by that user (`element.lockedBy = userId`) and broadcasts the lock to all other clients. Other clients will then see a visual indicator (a lock icon) and are prevented from transforming that element. When the user finishes the transform, an `unlock` op is sent. This prevents two users from, for example, dragging the same object at the same time.

2.  **Last-Write-Wins (LWW)**: For non-interactive property changes (like changing a color) or at the end of an interactive transform, an `update` op is sent. When the server receives an `update` op, it iterates through the fields in the `payload`. For each field, it compares the timestamp of the incoming op with the last-updated timestamp for that field on the server's authoritative copy of the element. **The update with the higher timestamp wins.** This ensures that even if two users change the same property (e.g., fill color) at nearly the same time, the final state is consistent for everyone. The server attaches its own timestamp to the op before broadcasting it, making the server the final authority on ordering.

### Undo/Redo

Undo/Redo is implemented on the client-side with a per-user stack.

-   **State**: Each client maintains an `undoStack` and a `redoStack`.
-   **Action**: When a user performs an action (e.g., creating a shape), the client calculates the *inverse* of that action (e.g., a `delete` op for the new shape) and pushes it onto the `undoStack`.
-   **Undo**: When the user hits Undo, the client:
    1.  Pops the inverse op from the `undoStack`.
    2.  Applies this inverse op to its local state immediately for a responsive feel.
    3.  Sends this inverse op to the server.
    4.  The server processes and broadcasts this op to all other clients, just like any other action.
    5.  The client calculates the inverse of the *undo* action (which is the original action) and pushes it onto the `redoStack`.

**Limitations**: This is a straightforward implementation. If User A changes an element's color and then User B moves it, when User A undoes their color change, the element will revert to its original color but remain in the new position set by User B. The undo applies to the *current state* of the element, which is a common and predictable behavior in many collaborative editors.
