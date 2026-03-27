/**
 * Receipt parsing via Python backend on Cloud Run.
 * Uploads the receipt image to the backend which uses Gemini for AI processing.
 */

export const parseReceiptWithGemini = async (imageUri: string) => {
    console.log('[Gemini] Starting Cloud Scan via Python Backend...');
    console.log('[Gemini] Image URI:', imageUri?.substring(0, 80));

    const formData = new FormData();
    // React Native expects this specific object format for file uploads
    formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
    } as any);

    // Deployed Google Cloud Run URL
    const BACKEND_URL = "https://divvit-backend-899345323923.us-central1.run.app/api/v1/scan";

    // 60-second timeout — Gemini receipt parsing can take 15-30s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.error('[Gemini] Request timed out after 60s');
        controller.abort();
    }, 60000);

    try {
        console.log('[Gemini] Sending POST to:', BACKEND_URL);
        const startTime = Date.now();

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            // Let React Native set Content-Type: multipart/form-data; boundary=...
        });

        const elapsed = Date.now() - startTime;
        console.log(`[Gemini] Response received in ${elapsed}ms, status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('[Gemini] Cloud Scan Success:', JSON.stringify(data).substring(0, 200));
        return data;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('[Gemini] Request was aborted (timeout)');
            throw new Error('Receipt scan timed out. Please try again.');
        }
        console.error('[Gemini] Backend Connection Error:', error.message || error);
        console.error('[Gemini] Error type:', error.name, '| Full:', JSON.stringify(error));
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

// Alias for backward compatibility
export const scanReceipt = parseReceiptWithGemini;
