import { Linking, Alert, Platform, Clipboard } from 'react-native'; // NOTE: Clipboard from 'react-native' is deprecated. If expo-clipboard is installed, you can replace this with: import * as Clipboard from 'expo-clipboard';

const VENMO_APP_STORE = 'https://apps.apple.com/app/venmo/id351727428';
const VENMO_PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.venmo';

/**
 * Opens Venmo app with pre-filled payment details.
 * If the app is not installed, prompts the user to install it
 * or continue to the Venmo website.
 */
export async function openVenmo(
    handle: string,
    amount: number,
    note: string
): Promise<void> {
    const cleanHandle = handle.replace(/^@/, '');
    const encodedNote = encodeURIComponent(note);
    const formattedAmount = amount.toFixed(2);

    const deepLink = `venmo://paycharge?txn=pay&recipients=${cleanHandle}&amount=${formattedAmount}&note=${encodedNote}`;
    const webFallback = `https://venmo.com/${cleanHandle}`;
    const storeLink = Platform.OS === 'ios' ? VENMO_APP_STORE : VENMO_PLAY_STORE;

    try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
            await Linking.openURL(deepLink);
        } else {
            // App not installed — prompt to install or continue to web
            Alert.alert(
                'Venmo App Not Found',
                `Install the Venmo app for the best experience. You can also pay @${cleanHandle} $${formattedAmount} on the Venmo website.`,
                [
                    { text: 'Install Venmo', onPress: () => Linking.openURL(storeLink) },
                    { text: 'Continue to Website', onPress: () => Linking.openURL(webFallback) },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        }
    } catch (error) {
        console.error('Venmo link error:', error);
        Alert.alert(
            'Cannot Open Venmo',
            `Please pay @${cleanHandle} $${formattedAmount} on Venmo.`,
            [
                { text: 'Install Venmo', onPress: () => Linking.openURL(storeLink) },
                { text: 'Open Venmo.com', onPress: () => Linking.openURL(webFallback) },
                { text: 'OK' },
            ]
        );
    }
}

/**
 * Opens Cash App with pre-filled payment details.
 * Falls back to cash.app web if app is not installed.
 */
export async function openCashApp(
    handle: string,
    amount: number
): Promise<void> {
    const cleanHandle = handle.replace(/^\$/, '');
    const formattedAmount = amount.toFixed(2);

    const deepLink = `cashme://${cleanHandle}/${formattedAmount}`;
    const webFallback = `https://cash.app/$${cleanHandle}/${formattedAmount}`;

    try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
            await Linking.openURL(deepLink);
        } else {
            await Linking.openURL(webFallback);
        }
    } catch (error) {
        console.error('CashApp link error:', error);
        Alert.alert(
            'Cannot Open Cash App',
            `Please pay $${cleanHandle} $${formattedAmount} on Cash App.`,
            [
                { text: 'Open Cash App', onPress: () => Linking.openURL(webFallback) },
                { text: 'OK' },
            ]
        );
    }
}

/**
 * Opens Venmo app with a charge (request money) deep link.
 * Used by the host to request payment from a guest.
 * If the app is not installed, prompts the user to install it
 * or continue to the Venmo website.
 */
export async function requestVenmo(
    handle: string,
    amount: number,
    note: string
): Promise<void> {
    const cleanHandle = handle.replace(/^@/, '');
    const encodedNote = encodeURIComponent(note);
    const formattedAmount = amount.toFixed(2);

    const deepLink = `venmo://paycharge?txn=charge&recipients=${cleanHandle}&amount=${formattedAmount}&note=${encodedNote}`;
    const webFallback = `https://venmo.com/${cleanHandle}`;
    const storeLink = Platform.OS === 'ios' ? VENMO_APP_STORE : VENMO_PLAY_STORE;

    try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
            await Linking.openURL(deepLink);
        } else {
            Alert.alert(
                'Venmo App Not Found',
                `Install the Venmo app for the best experience. You can also request $${formattedAmount} from @${cleanHandle} on the Venmo website.`,
                [
                    { text: 'Install Venmo', onPress: () => Linking.openURL(storeLink) },
                    { text: 'Continue to Website', onPress: () => Linking.openURL(webFallback) },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        }
    } catch (error) {
        console.error('Venmo request link error:', error);
        Alert.alert(
            'Cannot Open Venmo',
            `Please request $${formattedAmount} from @${cleanHandle} on Venmo.`,
            [
                { text: 'Install Venmo', onPress: () => Linking.openURL(storeLink) },
                { text: 'Open Venmo.com', onPress: () => Linking.openURL(webFallback) },
                { text: 'OK' },
            ]
        );
    }
}

/**
 * Opens Cash App to request money from a guest.
 */
export async function requestCashApp(
    handle: string,
    amount: number
): Promise<void> {
    const cleanHandle = handle.replace(/^\$/, '');
    const formattedAmount = amount.toFixed(2);

    const deepLink = `cashme://${cleanHandle}/${formattedAmount}`;
    const webFallback = `https://cash.app/$${cleanHandle}/${formattedAmount}`;

    try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
            await Linking.openURL(deepLink);
        } else {
            await Linking.openURL(webFallback);
        }
    } catch (error) {
        console.error('CashApp request link error:', error);
        Alert.alert(
            'Cannot Open Cash App',
            `Please request $${formattedAmount} from $${cleanHandle} on Cash App.`,
            [
                { text: 'Open Cash App', onPress: () => Linking.openURL(webFallback) },
                { text: 'OK' },
            ]
        );
    }
}

/**
 * Opens Venmo with a charge (request) deep link WITHOUT a recipient.
 * The amount and note are pre-filled so the host can search for
 * the participant manually in Venmo.
 */
export async function requestVenmoNoRecipient(
    amount: number,
    note: string
): Promise<void> {
    const encodedNote = encodeURIComponent(note);
    const formattedAmount = amount.toFixed(2);

    // Open Venmo with txn=charge but no recipients — Venmo will prompt the user to pick one
    const deepLink = `venmo://paycharge?txn=charge&amount=${formattedAmount}&note=${encodedNote}`;
    const storeLink = Platform.OS === 'ios' ? VENMO_APP_STORE : VENMO_PLAY_STORE;

    try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
            await Linking.openURL(deepLink);
        } else {
            Alert.alert(
                'Venmo App Not Found',
                `Install the Venmo app to request $${formattedAmount}. You can search for the person in Venmo.`,
                [
                    { text: 'Install Venmo', onPress: () => Linking.openURL(storeLink) },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        }
    } catch (error) {
        console.error('Venmo request (no recipient) error:', error);
        Alert.alert(
            'Cannot Open Venmo',
            `Please open Venmo and request $${formattedAmount}.`,
            [
                { text: 'Install Venmo', onPress: () => Linking.openURL(storeLink) },
                { text: 'OK' },
            ]
        );
    }
}

/**
 * Opens Cash App WITHOUT a recipient pre-filled.
 * The host can search for the participant manually.
 */
export async function requestCashAppNoRecipient(
    amount: number
): Promise<void> {
    const formattedAmount = amount.toFixed(2);

    const deepLink = `cashme://launch`;
    const webFallback = `https://cash.app`;

    try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
            await Linking.openURL(deepLink);
        } else {
            await Linking.openURL(webFallback);
        }
    } catch (error) {
        console.error('CashApp request (no recipient) error:', error);
        Alert.alert(
            'Cannot Open Cash App',
            `Please open Cash App and request $${formattedAmount}.`,
            [
                { text: 'Open Cash App', onPress: () => Linking.openURL(webFallback) },
                { text: 'OK' },
            ]
        );
    }
}

/**
 * Opens Apple Cash (via iMessage) with a pre-filled amount and recipient.
 */
export async function openAppleCash(
    handle: string,
    amount: number,
    note: string
): Promise<void> {
    if (Platform.OS !== 'ios') {
        Alert.alert('Not Available', 'Apple Cash is only available on iOS.');
        return;
    }

    const formattedAmount = amount.toFixed(2);
    const encodedNote = encodeURIComponent(note);
    // Apple Cash uses the sms: scheme to trigger the iMessage payment UI
    const url = `sms:${handle}?body=${encodedNote} (Pay $${formattedAmount})`;

    try {
        await Linking.openURL(url);
    } catch (error) {
        console.error('Apple Cash error:', error);
        Alert.alert(
            'Cannot Open Messages',
            `Please send $${formattedAmount} to ${handle} via Apple Cash in Messages.`
        );
    }
}

/**
 * Opens Zelle Gateway after copying the handle to clipboard.
 */
export async function openZelle(
    handle: string
): Promise<void> {
    // Copy handle to clipboard
    // If you migrate to expo-clipboard, replace the line below with: await Clipboard.setStringAsync(handle);
    Clipboard.setString(handle);

    const gatewayUrl = 'https://www.zellepay.com/get-started';

    Alert.alert(
        'Zelle Handle Copied',
        `${handle} has been copied to your clipboard.\n\nNow opening Zelle to choose your bank.`,
        [
            {
                text: 'Wait, Cancel',
                style: 'cancel'
            },
            {
                text: 'Continue to Zelle',
                onPress: async () => {
                    try {
                        await Linking.openURL(gatewayUrl);
                    } catch (error) {
                        console.error('Zelle gateway error:', error);
                        Alert.alert('Error', 'Could not open Zelle.com in your browser.');
                    }
                }
            }
        ]
    );
}

/**
 * Apple Pay via Stripe Platform Pay.
 * Uses createPlatformPayPaymentMethod to present the Apple Pay sheet.
 * Since there's no Stripe backend for payment intents, this verifies
 * user authorization via Apple Pay and returns success/failure.
 * The actual money transfer happens via Venmo/CashApp — this is a
 * verified "I authorize this payment" UX.
 *
 * IMPORTANT: This must be called from a component that has access to
 * the useStripe/usePlatformPay hook. The hook-based version is in
 * payment.tsx. This function is a non-hook fallback.
 */
export async function initiateApplePay(
    amount: number,
    merchantName: string,
): Promise<boolean> {
    if (Platform.OS !== 'ios') {
        Alert.alert('Not Available', 'Apple Pay is only available on iOS.');
        return false;
    }

    // This function cannot use hooks (it's not a component).
    // The real Apple Pay flow is in payment.tsx via usePlatformPay().
    // This fallback shows an informational alert.
    Alert.alert(
        'Apple Pay',
        `Authorize $${amount.toFixed(2)} payment to ${merchantName} via the Apple Pay button above.`,
        [{ text: 'OK' }]
    );
    return false;
}
