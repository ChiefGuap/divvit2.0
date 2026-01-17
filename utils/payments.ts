import { Linking, Alert } from 'react-native';

/**
 * Opens Venmo app with pre-filled payment details.
 * @param handle - The Venmo handle (with or without @)
 * @param amount - The amount in dollars
 * @param note - A note for the payment
 */
export async function openVenmo(
    handle: string,
    amount: number,
    note: string
): Promise<void> {
    // Clean the handle - remove @ if present
    const cleanHandle = handle.replace(/^@/, '');

    // Encode the note for URL
    const encodedNote = encodeURIComponent(note);

    // Construct the Venmo deep link URL
    const url = `venmo://paycharge?txn=pay&recipients=${cleanHandle}&amount=${amount.toFixed(2)}&note=${encodedNote}`;

    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert(
                'Venmo Not Installed',
                'Please install Venmo to use this payment method.',
                [{ text: 'OK' }]
            );
        }
    } catch (error) {
        console.error('Error opening Venmo:', error);
        Alert.alert(
            'Venmo Not Installed',
            'Please install Venmo to use this payment method.',
            [{ text: 'OK' }]
        );
    }
}

/**
 * Opens Cash App with pre-filled payment details.
 * @param handle - The Cash App handle (with or without $)
 * @param amount - The amount in dollars
 */
export async function openCashApp(
    handle: string,
    amount: number
): Promise<void> {
    // Clean the handle - remove $ if present
    const cleanHandle = handle.replace(/^\$/, '');

    // Construct the Cash App URL (uses web URL which redirects to app if installed)
    const url = `https://cash.app/$${cleanHandle}/${amount.toFixed(2)}`;

    try {
        await Linking.openURL(url);
    } catch (error) {
        console.error('Error opening Cash App:', error);
        Alert.alert(
            'Unable to Open Cash App',
            'There was an error opening Cash App. Please try again.',
            [{ text: 'OK' }]
        );
    }
}
