import amqp from 'amqplib';
import notifier from 'node-notifier';
import path from 'path';

const QUEUE_NAME = 'task_events';
import fs from 'fs';

// Debug logging
function logDebug(msg) {
    const logLine = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(path.join(__dirname, 'notification-debug.log'), logLine);
}

async function startNotificationServer() {
    try {
        console.log('Connecting to RabbitMQ...');
        logDebug('Starting Notification Server...');
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        await channel.assertQueue(QUEUE_NAME, { durable: true });

        console.log('✅ Notification Server waiting for messages...');
        logDebug('Connected and waiting for messages...');

        channel.consume(QUEUE_NAME, (msg) => {
            if (msg !== null) {
                try {
                    logDebug('Raw message received');
                    const content = JSON.parse(msg.content.toString());
                    const { eventType, task } = content;

                    const logMsg = `Received event: ${eventType} for task "${task.title}"`;
                    console.log(logMsg);
                    logDebug(logMsg);

                    let title = 'MCP Task Manager';
                    let message = '';
                    let icon = undefined; // Default icon

                    // Customize notification based on event
                    switch (eventType) {
                        case 'TASK_CREATED':
                            title = '🆕 New Task Created';
                            message = `"${task.title}" has been added to your list.`;
                            break;
                        case 'TASK_UPDATED':
                            title = '🔄 Task Updated';
                            message = `"${task.title}" is now ${task.status}.`;
                            break;
                        case 'TASK_DELETED':
                            title = '🗑️ Task Deleted';
                            message = `"${task.title}" has been removed.`;
                            break;
                        default:
                            title = 'Task Event';
                            message = `Event ${eventType} occurred for "${task.title}"`;
                    }

                    // Send Windows notification
                    notifier.notify({
                        title,
                        message,
                        sound: true,
                        wait: false
                    }, (err, response) => {
                        if (err) console.error('Notification error:', err);
                    });

                    // Audible beep as backup
                    console.log('\x07');

                    channel.ack(msg);
                } catch (error) {
                    console.error('Error processing message:', error);
                    // Reject but don't requeue if malformed
                    channel.nack(msg, false, false);
                }
            }
        });

        // Handle connection close
        connection.on('close', () => {
            console.error('RabbitMQ connection closed. Reconnecting in 5s...');
            setTimeout(startNotificationServer, 5000);
        });

    } catch (error) {
        console.error('Failed to start notification server:', error.message);
        console.log('Retrying in 5 seconds...');
        setTimeout(startNotificationServer, 5000);
    }
}

startNotificationServer();
