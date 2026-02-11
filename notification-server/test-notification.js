import amqp from 'amqplib';

const QUEUE_NAME = 'task_events';

async function testNotification() {
    try {
        console.log('Connecting to RabbitMQ...');
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        const testEvent = {
            eventType: 'TASK_CREATED',
            timestamp: new Date().toISOString(),
            task: {
                id: 999,
                title: 'DEBUG TEST NOTIFICATION',
                status: 'pending'
            }
        };

        console.log('Sending test event...');
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(testEvent)));
        console.log('Test event sent! Check your desktop/notification center.');

        setTimeout(() => {
            connection.close();
        }, 500);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testNotification();
