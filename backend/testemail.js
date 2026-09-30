import 'dotenv/config';
import { sendOtp } from './src/utils/email.js';

await sendOtp('bsse23015@itu.edu.pk', '123456');
console.log('Sent. Check your inbox (and spam folder).');