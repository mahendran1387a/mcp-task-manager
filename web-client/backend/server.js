import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import amqp from 'amqplib';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173", // Vite default port
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// MCP Client Setup
let mcpClient;
async function connectToMcpServer() {
    const serverPath = path.join(__dirname, '..', '..', 'server', 'index.js');
    console.log('Connecting to MCP Server at:', serverPath);

    const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
    });

    mcpClient = new Client(
        { name: 'mcp-web-client', version: '1.0.0' },
        { capabilities: {} }
    );

    await mcpClient.connect(transport);
    console.log('✓ Connected to MCP Task Server (stdio)');
}

// RabbitMQ Setup for Real-time Events
const QUEUE_NAME = 'task_events';
async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        console.log('✓ Connected to RabbitMQ');

        channel.consume(QUEUE_NAME, (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                console.log('Event received:', content.eventType);
                // Broadcast to frontend
                io.emit('task_event', content);
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('RabbitMQ connection error:', error.message);
        setTimeout(connectRabbitMQ, 5000);
    }
}

// API Routes
app.get('/api/tasks', async (req, res) => {
    try {
        const status = req.query.status || 'all';
        const result = await mcpClient.callTool({
            name: 'list_tasks',
            arguments: { status }
        });

        // Parse the text output from MCP tool (simple parsing for now)
        // ideally MCP tool should return JSON, but it returns text.
        // For the web UI, we might want to parse it back to JSON or
        // update the MCP server to return structured data.
        // For now, let's send text and handle parsing on frontend or here.
        // Actually, the current MCP tool returns unstructured text "Tasks (N): ..."
        // This is hard to parse reliably. 
        // OPTIMIZATION: We should probably update the MCP server to return JSON if requested,
        // but to avoid changing core server logic too much, 
        // let's try to pass the raw text or do a quick parse.
        // Wait, the MCP server keeps state in `tasks.json`.
        // We could read `tasks.json` directly here since we are Local...
        // BUT that violates the "Client" pattern.
        // Let's stick to calling the tool and maybe parsing.
        // OR better: The tool implementation in `server/index.js` returns formatted text.
        // Let's just return the text for now and display it, 
        // OR modify `server/index.js` to support JSON output?
        // Let's modify `server/index.js` to return JSON if a flag is passed? 
        // Or simpler: We read `tasks.json` directly for the initial list since we share the filesystem.
        // Direct file read is pragmatic here.

        // Reading file directly for structured data (Bypassing MCP for READ to get JSON)
        // This is a "cheat" but efficient for this demo.
        // Ideally we'd improve the MCP tool to return structured data.
        // Let's do direct read for now.
        const tasksFile = path.join(__dirname, '..', '..', 'server', 'tasks.json');

        // Dynamic import fs/promises
        const fs = await import('fs/promises');
        try {
            const data = await fs.readFile(tasksFile, 'utf-8');
            res.json(JSON.parse(data));
        } catch (e) {
            res.json([]);
        }

    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description } = req.body;
        const result = await mcpClient.callTool({
            name: 'add_task',
            arguments: { title, description }
        });
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await mcpClient.callTool({
            name: 'update_task',
            arguments: { id: parseInt(id), status }
        });
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await mcpClient.callTool({
            name: 'delete_task',
            arguments: { id: parseInt(id) }
        });
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
httpServer.listen(PORT, async () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    await connectToMcpServer();
    await connectRabbitMQ();
});
