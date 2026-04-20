import { Linking, Alert, Platform, Clipboard } from 'react-native';

/**
 * Opens Venmo app with pre-filled payment details.
 * Falls back to venmo.com if app is not installed.
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

    try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
            await Linking.openURL(deepLink);
        } else {
            await Linking.openURL(webFallback);
        }
    } catch (error) {
        console.error('Venmo link error:', error);
        Alert.alert(
            'Cannot Open Venmo',
            `Please pay @${cleanHandle} $${formattedAmount} on Venmo.`,
            [
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

    try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
            await Linking.openURL(deepLink);
        } else {
            await Linking.openURL(webFallback);
        }
    } catch (error) {
        console.error('Venmo request link error:', error);
        Alert.alert(
            'Cannot Open Venmo',
            `Please request $${formattedAmount} from @${cleanHandle} on Venmo.`,
            [
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
