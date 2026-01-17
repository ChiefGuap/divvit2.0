import { Platform } from 'react-native';

// Use environment variable if set, otherwise fall back to defaults
// For tunnel mode, set EXPO_PUBLIC_API_URL in .env to your machine's IP or ngrok URL
const getBaseUrl = () => {
    // Check for explicit API URL first
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // Default fallbacks for local development
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8000';
    }
    return 'http://localhost:8000';
};

const BASE_URL = getBaseUrl();

export async function uploadReceipt(imageUri: string) {
    const formData = new FormData();

    // Extract filename and type
    const filename = imageUri.split('/').pop() || 'receipt.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // Append file to FormData
    if (Platform.OS === 'web') {
        // On Web, we need to convert the URI to a Blob
        const fetchResponse = await fetch(imageUri);
        const blob = await fetchResponse.blob();
        formData.append('file', blob, filename);
    } else {
        // React Native specific way to handle file uploads
        formData.append('file', {
            uri: imageUri,
            name: filename,
            type,
        } as any);
    }

    console.log(`[API] Uploading receipt to ${BASE_URL}/analyze...`);

    try {
        const response = await fetch(`${BASE_URL}/analyze`, {
            method: 'POST',
            body: formData,
            headers: {
                // 'Content-Type': 'multipart/form-data', // Often better to let the browser/engine set this with boundary
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API] Upload failed: ${response.status} ${errorText}`);
            throw new Error(`Upload failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('[API] Upload success, data received');
        return data; // Returns the parsed bill JSON
    } catch (error) {
        console.error('[API] Network error:', error);
        throw error;
    }
}
