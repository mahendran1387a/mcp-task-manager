import amqp from 'amqplib';

const QUEUE_NAME = 'task_events';

async function testNotification() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        const testEvent = {
            eventType: 'TASK_CREATED',
            timestamp: new Date().toISOString(),
            task: {
                id: 999,
                title: 'Test Notification',
                status: 'pending'
            }
        };

        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(testEvent)));
        console.log('Test event sent!');

        setTimeout(() => {
            connection.close();
            process.exit(0);
        }, 500);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testNotification();
