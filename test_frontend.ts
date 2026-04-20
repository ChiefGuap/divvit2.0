/**
 * test_frontend.ts
 * A standalone Node.js script to test the frontend utility logic.
 * Run with: npx ts-node test_frontend.ts
 */

import { parseReceiptWithGemini } from './utils/gemini';

// Mock image URI (using a local file path as if it were a URI)
const MOCK_IMAGE_URI = 'assets/images/icon.png';

async function runTest() {
    console.log('Testing parseReceiptWithGemini...');

    try {
        const result = await parseReceiptWithGemini(MOCK_IMAGE_URI);
        console.log('Test PASSED!');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Test FAILED!');
        console.error(error);
        process.exit(1);
    }
}

// Note: This script will fail if 'fetch' or 'FormData' are not available in the environment.
// It also depends on how 'fetch' handles local file URIs in Node.
// In a real React Native environment, this works differently.

runTest();
