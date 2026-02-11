# MCP Task Manager - Quick Start Guide

## Overview
A complete MCP (Model Context Protocol) implementation with a task management server and interactive CLI client.

## Project Structure
```
MCP/
├── server/          # MCP server with task CRUD operations
│   ├── index.js     # Server implementation
│   ├── tasks.json   # Persistent storage
│   └── package.json
└── client/          # Interactive CLI client
    ├── index.js     # Client implementation
    └── package.json
```

## Prerequisites
- **Docker Desktop**: Ensure Docker is installed and running.
- **Node.js**: Required to run the client and server.

## Quick Start (Docker)

1. **Start Infrastructure**:
   ```bash
   docker-compose up -d
   ```
   This starts RabbitMQ with the Management UI at http://localhost:15672 (user: guest / pass: guest).

2. **Install & Run Components**:
   Follow the steps below to start the services.

## Running the Application

### Step 1: Start Notification Server (Optional but Recommended)
To receive desktop notifications for task updates:
```bash
cd notification-server
npm install
npm start
```
Keep this terminal open.

### Step 2: Start Client (Main Application)
The client automatically starts the MCP server:
```bash
# Open a new terminal
cd client
npm install
npm start
```

### Alternative: Run Server Separately
For debugging or testing:
```bash
# Terminal 1 - Start server
cd server
npm install
node index.js

# Terminal 2 - Start client
cd client
npm install
node index.js
```

## Features

### Available Operations
1. **Add Task** - Create new tasks with title and optional description
2. **List Tasks** - View all tasks or filter by status (pending/in-progress/completed)
3. **Update Task** - Change task status
4. **Delete Task** - Remove tasks by ID

### Task Persistence
All tasks are automatically saved to `server/tasks.json` and persist across restarts.

## Example Usage

```
=== MCP Task Manager ===
1. Add a new task
2. List all tasks
3. Update task status
4. Delete a task
5. Exit
========================

Select an option (1-5): 1
Enter task title: Build MCP server
Enter task description: Implement task management with MCP protocol

Task added successfully!
ID: 1
Title: Build MCP server
Status: pending
```

## Technical Details

### MCP Protocol
- **Transport**: stdio (standard input/output)
- **Tools**: 4 tools (add_task, update_task, list_tasks, delete_task)
- **SDK Version**: @modelcontextprotocol/sdk ^1.0.4

### Server Features
- Persistent JSON storage
- Auto-incrementing task IDs
- Timestamp tracking (createdAt, updatedAt)
- Input validation and error handling

### Client Features
- Interactive menu-driven interface
- User-friendly prompts
- Real-time server communication
- Graceful error handling
