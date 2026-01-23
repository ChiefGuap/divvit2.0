/**
 * Client-side Gemini SDK utility for receipt scanning.
 * Replaces the Python backend dependency.
 */
import { readAsStringAsync } from 'expo-file-system/legacy';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Types for the receipt data
export interface ReceiptItem {
    name: string;
    price: number;
}

export interface ReceiptData {
    items: ReceiptItem[];
    subtotal: number;
    scannedTip: number;
}

// Initialize the Gemini client
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.warn('[Gemini] No API key found. Set EXPO_PUBLIC_GEMINI_API_KEY in .env');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

/**
 * Scans a receipt image and extracts items, subtotal, and tip.
 * @param imageUri - The local URI of the captured/picked image
 * @returns Parsed receipt data with items, subtotal, and scannedTip
 */
export async function scanReceipt(imageUri: string): Promise<ReceiptData> {
    console.log('[Gemini] Starting receipt scan...');

    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY in .env');
    }

    try {
        // Read the image as Base64
        console.log('[Gemini] Reading image as Base64...');
        const base64Data = await readAsStringAsync(imageUri, {
            encoding: 'base64',
        });

        // Determine the MIME type from the URI
        const extension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

        // Initialize the model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Strict prompt for JSON output
        const prompt = `Analyze this receipt image to extract data for a bill-splitting app.

CRITICAL INSTRUCTION - ITEMS ONLY:
- Extract ONLY individual menu items and their exact prices.
- For discounts (e.g., 'Combo Deal -1.00'), SUBTRACT from the item above and return the NET PRICE.
- DO NOT include tax, tip, gratuity, service charge, or total lines as items.

CRITICAL INSTRUCTION - TIP EXTRACTION:
- Look for any tip, gratuity, or service charge line on the receipt.
- Return this as "scannedTip" (for pre-fill purposes). If none found, return 0.

CRITICAL INSTRUCTION - OUTPUT FORMAT:
- Return ONLY a raw JSON object. DO NOT wrap in markdown code blocks.
- DO NOT include \`\`\`json or \`\`\` markers.
- The response must be ONLY valid JSON that can be parsed directly.

Required JSON schema:
{
  "items": [{"name": "string", "price": number}],
  "scannedTip": number
}`;

        console.log('[Gemini] Calling Gemini API...');
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType,
                    data: base64Data,
                },
            },
            { text: prompt },
        ]);

        const response = await result.response;
        const text = response.text();

        console.log('[Gemini] Raw response:', text.substring(0, 500));

        // Parse the JSON response
        const data = parseGeminiResponse(text);

        // Calculate subtotal from items
        const subtotal = data.items.reduce((sum, item) => sum + (item.price || 0), 0);

        console.log('[Gemini] Successfully parsed receipt:');
        console.log(`  - Items: ${data.items.length}`);
        console.log(`  - Subtotal: $${subtotal.toFixed(2)}`);
        console.log(`  - Scanned Tip: $${data.scannedTip.toFixed(2)}`);

        return {
            items: data.items,
            subtotal,
            scannedTip: data.scannedTip,
        };
    } catch (error: any) {
        console.error('[Gemini] Error scanning receipt:', error);
        throw new Error(error.message || 'Failed to analyze receipt');
    }
}

/**
 * Parses the Gemini response text to extract JSON data.
 * Handles various edge cases like markdown blocks and malformed JSON.
 */
function parseGeminiResponse(text: string): { items: ReceiptItem[]; scannedTip: number } {
    let cleanText = text.trim();

    // Remove markdown code block markers if present
    cleanText = cleanText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    // Try to extract JSON object if there's extra text
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleanText = jsonMatch[0];
    }

    // Remove trailing commas before closing braces/brackets
    cleanText = cleanText.replace(/,(\s*[\]}])/g, '$1');

    try {
        const data = JSON.parse(cleanText);

        // Validate and normalize the response
        const items: ReceiptItem[] = (data.items || []).map((item: any) => ({
            name: String(item.name || 'Unknown Item'),
            price: Number(item.price) || 0,
        }));

        const scannedTip = Number(data.scannedTip || data.total_tip || data.tip || 0);

        return { items, scannedTip };
    } catch (parseError) {
        console.error('[Gemini] JSON parse error:', parseError);
        console.error('[Gemini] Attempted to parse:', cleanText.substring(0, 500));
        throw new Error('Could not parse receipt data. Please try again.');
    }
}
