#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as readline from 'readline';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Promisify readline question
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

// Initialize MCP client
let client;

async function connectToServer() {
    const serverPath = path.join(__dirname, '..', 'server', 'index.js');

    const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
    });

    client = new Client(
        {
            name: 'mcp-task-client',
            version: '1.0.0',
        },
        {
            capabilities: {},
        }
    );

    await client.connect(transport);
    console.log('✓ Connected to MCP Task Server\n');
}

// Display menu
function displayMenu() {
    console.log('\n=== MCP Task Manager ===');
    console.log('1. Add a new task');
    console.log('2. List all tasks');
    console.log('3. Update task status');
    console.log('4. Delete a task');
    console.log('5. Exit');
    console.log('========================\n');
}

// Add task
async function addTask() {
    const title = await question('Enter task title: ');
    const description = await question('Enter task description (optional): ');

    const result = await client.callTool({
        name: 'add_task',
        arguments: {
            title,
            description: description || undefined,
        },
    });

    console.log('\n' + result.content[0].text + '\n');
}

// List tasks
async function listTasks() {
    console.log('\nFilter by status:');
    console.log('1. All tasks');
    console.log('2. Pending');
    console.log('3. In Progress');
    console.log('4. Completed');

    const choice = await question('\nSelect option (1-4): ');

    const statusMap = {
        '1': 'all',
        '2': 'pending',
        '3': 'in-progress',
        '4': 'completed',
    };

    const status = statusMap[choice] || 'all';

    const result = await client.callTool({
        name: 'list_tasks',
        arguments: { status },
    });

    console.log('\n' + result.content[0].text + '\n');
}

// Update task
async function updateTask() {
    const id = await question('Enter task ID: ');

    console.log('\nSelect new status:');
    console.log('1. Pending');
    console.log('2. In Progress');
    console.log('3. Completed');

    const choice = await question('\nSelect option (1-3): ');

    const statusMap = {
        '1': 'pending',
        '2': 'in-progress',
        '3': 'completed',
    };

    const status = statusMap[choice];

    if (!status) {
        console.log('\nInvalid choice!\n');
        return;
    }

    const result = await client.callTool({
        name: 'update_task',
        arguments: {
            id: parseInt(id),
            status,
        },
    });

    console.log('\n' + result.content[0].text + '\n');
}

// Delete task
async function deleteTask() {
    const id = await question('Enter task ID to delete: ');

    const result = await client.callTool({
        name: 'delete_task',
        arguments: {
            id: parseInt(id),
        },
    });

    console.log('\n' + result.content[0].text + '\n');
}

// Main loop
async function main() {
    try {
        await connectToServer();

        let running = true;
        while (running) {
            displayMenu();
            const choice = await question('Select an option (1-5): ');

            switch (choice) {
                case '1':
                    await addTask();
                    break;
                case '2':
                    await listTasks();
                    break;
                case '3':
                    await updateTask();
                    break;
                case '4':
                    await deleteTask();
                    break;
                case '5':
                    console.log('\nGoodbye!\n');
                    running = false;
                    break;
                default:
                    console.log('\nInvalid option. Please try again.\n');
            }
        }

        rl.close();
        await client.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        rl.close();
        process.exit(1);
    }
}

main();
