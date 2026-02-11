import notifier from 'node-notifier';
import path from 'path';

console.log('Attempting to show notification...');

try {
    notifier.notify({
        title: 'Direct Test',
        message: 'If you see this, notifications work!',
        sound: true,
        wait: true
    }, (err, response, metadata) => {
        if (err) {
            console.error('Callback Error:', err);
        } else {
            console.log('Notification sent. Response:', response);
            console.log('Metadata:', metadata);
        }
    });

    console.log('Notification command executed.');
} catch (error) {
    console.error('Execution Error:', error);
}
