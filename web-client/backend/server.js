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
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

let mcpClient;
let rabbitConnection;
let rabbitChannel;

const TASK_EVENT_QUEUE = 'task_events';
const APPROVED_EVENT_QUEUE = 'approved_task_events';
const pendingApprovalMessages = new Map();
const approvedNotifications = [];

const serviceState = {
    backend: { status: 'online', details: 'API and Socket.IO are running' },
    mcp: { status: 'connecting', details: 'Connecting to MCP server...' },
    rabbitmq: { status: 'connecting', details: 'Connecting to RabbitMQ...' },
    queue: {
        name: TASK_EVENT_QUEUE,
        status: 'unknown',
        messageCount: 0,
        consumerCount: 0,
        details: 'Queue status unavailable'
    },
    approvedQueue: {
        name: APPROVED_EVENT_QUEUE,
        status: 'unknown',
        messageCount: 0,
        consumerCount: 0,
        details: 'Approved notifications queue status unavailable'
    }
};

async function connectToMcpServer() {
    const serverPath = path.join(__dirname, '..', '..', 'server', 'index.js');
    const transport = new StdioClientTransport({ command: 'node', args: [serverPath] });

    mcpClient = new Client(
        { name: 'mcp-web-client', version: '2.0.0' },
        { capabilities: {} }
    );

    await mcpClient.connect(transport);
    serviceState.mcp = { status: 'online', details: 'Connected via stdio transport' };
}

function simplifyToolResponse(result) {
    if (!result?.content) {
        return '';
    }

    return result.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n')
        .trim();
}

function toQueueEntry(msg, event) {
    return {
        deliveryTag: String(msg.fields.deliveryTag),
        exchange: msg.fields.exchange,
        routingKey: msg.fields.routingKey,
        redelivered: msg.fields.redelivered,
        receivedAt: new Date().toISOString(),
        event
    };
}

async function refreshQueueState() {
    if (!rabbitChannel) {
        return;
    }

    try {
        const queueInfo = await rabbitChannel.checkQueue(TASK_EVENT_QUEUE);
        serviceState.queue = {
            name: TASK_EVENT_QUEUE,
            status: 'online',
            messageCount: queueInfo.messageCount,
            consumerCount: queueInfo.consumerCount,
            details: 'Main task event queue is reachable'
        };

        const approvedInfo = await rabbitChannel.checkQueue(APPROVED_EVENT_QUEUE);
        serviceState.approvedQueue = {
            name: APPROVED_EVENT_QUEUE,
            status: 'online',
            messageCount: approvedInfo.messageCount,
            consumerCount: approvedInfo.consumerCount,
            details: 'Approved notifications queue is reachable'
        };
    } catch (error) {
        serviceState.queue = {
            ...serviceState.queue,
            status: 'degraded',
            details: `Queue probe failed: ${error.message}`
        };
        serviceState.approvedQueue = {
            ...serviceState.approvedQueue,
            status: 'degraded',
            details: `Queue probe failed: ${error.message}`
        };
    }
}

async function connectRabbitMQ() {
    try {
        rabbitConnection = await amqp.connect('amqp://localhost');
        rabbitChannel = await rabbitConnection.createChannel();
        await rabbitChannel.assertQueue(TASK_EVENT_QUEUE, { durable: true });
        await rabbitChannel.assertQueue(APPROVED_EVENT_QUEUE, { durable: true });

        serviceState.rabbitmq = { status: 'online', details: 'Broker connection established' };
        await refreshQueueState();

        rabbitConnection.on('error', (err) => {
            serviceState.rabbitmq = { status: 'offline', details: `Connection error: ${err.message}` };
        });

        rabbitConnection.on('close', () => {
            serviceState.rabbitmq = { status: 'offline', details: 'Connection closed. Retrying...' };
            serviceState.queue = {
                ...serviceState.queue,
                status: 'offline',
                details: 'Queue unavailable while RabbitMQ is disconnected'
            };
            serviceState.approvedQueue = {
                ...serviceState.approvedQueue,
                status: 'offline',
                details: 'Approved queue unavailable while RabbitMQ is disconnected'
            };
            setTimeout(connectRabbitMQ, 5000);
        });

        rabbitChannel.consume(APPROVED_EVENT_QUEUE, (msg) => {
            if (!msg) {
                return;
            }

            const event = JSON.parse(msg.content.toString());
            const item = {
                ...event,
                consumedAt: new Date().toISOString()
            };

            approvedNotifications.unshift(item);
            approvedNotifications.splice(40);
            io.emit('notification_event', item);
            rabbitChannel.ack(msg);
        });
    } catch (error) {
        serviceState.rabbitmq = { status: 'offline', details: error.message };
        serviceState.queue = {
            ...serviceState.queue,
            status: 'offline',
            details: 'Queue unavailable because RabbitMQ is offline'
        };
        serviceState.approvedQueue = {
            ...serviceState.approvedQueue,
            status: 'offline',
            details: 'Approved queue unavailable because RabbitMQ is offline'
        };
        setTimeout(connectRabbitMQ, 5000);
    }
}

async function loadTasks() {
    const tasksFile = path.join(__dirname, '..', '..', 'server', 'tasks.json');
    const fs = await import('fs/promises');

    try {
        const data = await fs.readFile(tasksFile, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function buildOverviewStats() {
    const tasks = await loadTasks();
    await refreshQueueState();

    return {
        generatedAt: Date.now(),
        services: serviceState,
        tasks: {
            total: tasks.length,
            pending: tasks.filter((task) => task.status === 'pending').length,
            inProgress: tasks.filter((task) => task.status === 'in-progress').length,
            completed: tasks.filter((task) => task.status === 'completed').length
        },
        queueWorkbench: {
            pendingApprovals: pendingApprovalMessages.size,
            consumedNotifications: approvedNotifications.length
        }
    };
}

app.get('/api/tasks', async (req, res) => {
    try {
        const status = req.query.status || 'all';
        await mcpClient.callTool({ name: 'list_tasks', arguments: { status } });

        const tasks = await loadTasks();
        const filteredTasks = status === 'all'
            ? tasks
            : tasks.filter((task) => task.status === status);

        res.json(filteredTasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/overview', async (req, res) => {
    try {
        const overview = await buildOverviewStats();
        res.json(overview);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/mcp/tools', async (req, res) => {
    try {
        const toolsResult = await mcpClient.listTools();
        res.json(toolsResult.tools ?? []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/mcp/call', async (req, res) => {
    try {
        const { name, arguments: toolArguments = {} } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Tool name is required' });
            return;
        }

        const result = await mcpClient.callTool({ name, arguments: toolArguments });
        res.json({ success: true, summary: simplifyToolResponse(result), raw: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/queue/pull', async (req, res) => {
    try {
        if (!rabbitChannel) {
            res.status(503).json({ error: 'RabbitMQ is not connected' });
            return;
        }

        const count = Math.min(Number(req.body.count) || 5, 20);
        const pulled = [];

        for (let i = 0; i < count; i += 1) {
            const msg = await rabbitChannel.get(TASK_EVENT_QUEUE, { noAck: false });
            if (!msg) {
                break;
            }

            const event = JSON.parse(msg.content.toString());
            const queueEntry = toQueueEntry(msg, event);
            pendingApprovalMessages.set(queueEntry.deliveryTag, { msg, queueEntry });
            pulled.push(queueEntry);
        }

        await refreshQueueState();
        io.emit('queue_pending_updated', Array.from(pendingApprovalMessages.values()).map((entry) => entry.queueEntry));

        res.json({ success: true, pulled, pendingCount: pendingApprovalMessages.size });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/queue/pending', async (req, res) => {
    const pending = Array.from(pendingApprovalMessages.values()).map((entry) => entry.queueEntry);
    res.json({ pending, count: pending.length });
});

app.post('/api/queue/:deliveryTag/approve', async (req, res) => {
    try {
        const { deliveryTag } = req.params;
        const held = pendingApprovalMessages.get(deliveryTag);

        if (!held) {
            res.status(404).json({ error: 'Message not found in pending approvals' });
            return;
        }

        rabbitChannel.ack(held.msg);

        const approvedEvent = {
            ...held.queueEntry.event,
            approvedAt: new Date().toISOString(),
            deliveryTag
        };
        rabbitChannel.sendToQueue(APPROVED_EVENT_QUEUE, Buffer.from(JSON.stringify(approvedEvent)), {
            persistent: true
        });

        pendingApprovalMessages.delete(deliveryTag);
        await refreshQueueState();
        io.emit('queue_pending_updated', Array.from(pendingApprovalMessages.values()).map((entry) => entry.queueEntry));

        res.json({ success: true, approvedEvent });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/queue/:deliveryTag/requeue', async (req, res) => {
    try {
        const { deliveryTag } = req.params;
        const held = pendingApprovalMessages.get(deliveryTag);

        if (!held) {
            res.status(404).json({ error: 'Message not found in pending approvals' });
            return;
        }

        rabbitChannel.nack(held.msg, false, true);
        pendingApprovalMessages.delete(deliveryTag);
        await refreshQueueState();
        io.emit('queue_pending_updated', Array.from(pendingApprovalMessages.values()).map((entry) => entry.queueEntry));

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/notifications', async (req, res) => {
    res.json({ notifications: approvedNotifications });
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
            arguments: { id: parseInt(id, 10), status }
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
            arguments: { id: parseInt(id, 10) }
        });
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
httpServer.listen(PORT, async () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    try {
        await connectToMcpServer();
    } catch (error) {
        serviceState.mcp = { status: 'offline', details: error.message };
    }
    await connectRabbitMQ();
});
