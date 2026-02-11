#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TASKS_FILE = path.join(__dirname, 'tasks.json');

// Task storage
let tasks = [];
let nextId = 1;

// Load tasks from file
async function loadTasks() {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf-8');
        tasks = JSON.parse(data);
        if (tasks.length > 0) {
            nextId = Math.max(...tasks.map(t => t.id)) + 1;
        }
    } catch (error) {
        // File doesn't exist or is empty, start fresh
        tasks = [];
        nextId = 1;
    }
}

// Save tasks to file
async function saveTasks() {
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
}
// RabbitMQ setup
import amqp from 'amqplib';

let channel = null;
const QUEUE_NAME = 'task_events';

// Debug logging
async function logDebug(msg) {
    const logLine = `[${new Date().toISOString()}] ${msg}\n`;
    await fs.appendFile(path.join(__dirname, 'server-debug.log'), logLine);
}

async function connectRabbitMQ() {
    try {
        await logDebug('Attempting to connect to RabbitMQ...');
        const connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await logDebug('Successfully connected to RabbitMQ');
    } catch (error) {
        await logDebug(`Failed to connect to RabbitMQ: ${error.message}`);
        setTimeout(connectRabbitMQ, 5000);
    }
}

async function publishEvent(eventType, task) {
    if (!channel) {
        await logDebug('Cannot publish event: Channel is null');
        return;
    }

    const message = {
        eventType,
        timestamp: new Date().toISOString(),
        task
    };

    try {
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), { persistent: true });
        await logDebug(`Published event: ${eventType} for task ${task.id}`);
    } catch (error) {
        await logDebug(`Failed to publish event: ${error.message}`);
    }
}

// Initialize server
const server = new Server(
    {
        name: 'mcp-task-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'add_task',
                description: 'Add a new task to the to-do list',
                inputSchema: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            description: 'The title of the task',
                        },
                        description: {
                            type: 'string',
                            description: 'Optional description of the task',
                        },
                    },
                    required: ['title'],
                },
            },
            {
                name: 'update_task',
                description: 'Update the status of a task',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'number',
                            description: 'The ID of the task to update',
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'in-progress', 'completed'],
                            description: 'The new status of the task',
                        },
                    },
                    required: ['id', 'status'],
                },
            },
            {
                name: 'list_tasks',
                description: 'List all tasks or filter by status',
                inputSchema: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['pending', 'in-progress', 'completed', 'all'],
                            description: 'Filter tasks by status (default: all)',
                        },
                    },
                },
            },
            {
                name: 'delete_task',
                description: 'Delete a task by ID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'number',
                            description: 'The ID of the task to delete',
                        },
                    },
                    required: ['id'],
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'add_task': {
                const task = {
                    id: nextId++,
                    title: args.title,
                    description: args.description || '',
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                };
                tasks.push(task);
                await saveTasks();
                await publishEvent('TASK_CREATED', task);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Task added successfully!\nID: ${task.id}\nTitle: ${task.title}\nStatus: ${task.status}`,
                        },
                    ],
                };
            }

            case 'update_task': {
                const task = tasks.find(t => t.id === args.id);
                if (!task) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: Task with ID ${args.id} not found`,
                            },
                        ],
                        isError: true,
                    };
                }
                task.status = args.status;
                task.updatedAt = new Date().toISOString();
                await saveTasks();
                await publishEvent('TASK_UPDATED', task);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Task updated successfully!\nID: ${task.id}\nTitle: ${task.title}\nStatus: ${task.status}`,
                        },
                    ],
                };
            }

            case 'list_tasks': {
                const filterStatus = args.status || 'all';
                const filteredTasks = filterStatus === 'all'
                    ? tasks
                    : tasks.filter(t => t.status === filterStatus);

                if (filteredTasks.length === 0) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'No tasks found',
                            },
                        ],
                    };
                }

                const taskList = filteredTasks
                    .map(t => `[${t.id}] ${t.title}\n    Status: ${t.status}\n    Description: ${t.description || 'N/A'}`)
                    .join('\n\n');

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Tasks (${filteredTasks.length}):\n\n${taskList}`,
                        },
                    ],
                };
            }

            case 'delete_task': {
                const index = tasks.findIndex(t => t.id === args.id);
                if (index === -1) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: Task with ID ${args.id} not found`,
                            },
                        ],
                        isError: true,
                    };
                }
                const deletedTask = tasks.splice(index, 1)[0];
                await saveTasks();
                await publishEvent('TASK_DELETED', deletedTask);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Task deleted successfully!\nID: ${deletedTask.id}\nTitle: ${deletedTask.title}`,
                        },
                    ],
                };
            }

            default:
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Unknown tool: ${name}`,
                        },
                    ],
                    isError: true,
                };
        }
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});

// Start server
async function main() {
    await loadTasks();
    await connectRabbitMQ();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Task Server running on stdio');
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
