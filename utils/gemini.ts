/**
 * Receipt parsing via Python backend on Cloud Run.
 * Uploads the receipt image to the backend which uses Gemini for AI processing.
 */

export const parseReceiptWithGemini = async (imageUri: string) => {
    console.log('Starting Cloud Scan via Python Backend...');

    const formData = new FormData();
    // React Native expects this specific object format for file uploads
    formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
    } as any);

    // Deployed Google Cloud Run URL
    const BACKEND_URL = "https://divvit-backend-899345323923.us-central1.run.app/api/v1/scan";

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Cloud Scan Success:', data);
        return data;
    } catch (error) {
        console.error("Backend Connection Error:", error);
        throw error;
    }
};

// Alias for backward compatibility
export const scanReceipt = parseReceiptWithGemini;
