import { Linking, Alert, Platform, Clipboard } from 'react-native';

const VENMO_APP_STORE = 'https://apps.apple.com/app/venmo/id351727428';
const VENMO_PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.venmo';

/**
 * PAYMENT DEEP LINKS
 * 
 * iOS IMPORTANT: For Linking.canOpenURL() to work on iOS,
 * every URL scheme must be declared in LSApplicationQueriesSchemes
 * in app.config.ts → ios.infoPlist. Without this, canOpenURL()
 * ALWAYS returns false even if the app is installed.
 * 
 * After adding schemes, you MUST rebuild the native app.
 * Hot reload / Expo Go will NOT pick up this change.
 */

// ─── VENMO ──────────────────────────────────────────────
// App scheme: venmo://
// Pay URL: venmo://paycharge?txn=pay&recipients=USERNAME&amount=X&note=Y
// Request URL: venmo://paycharge?txn=charge&recipients=USERNAME&amount=X&note=Y

export const openVenmo = async (
  venmoUsername: string,
  amount: number,
  note: string
): Promise<void> => {
  const username = venmoUsername.replace('@', '').trim();
  const encodedNote = encodeURIComponent(`Divvit: ${note}`);
  const formattedAmount = amount.toFixed(2);

  const appUrl = 
    `venmo://paycharge?txn=pay` +
    `&recipients=${username}` +
    `&amount=${formattedAmount}` +
    `&note=${encodedNote}`;

  const webUrl = 
    `https://venmo.com/${username}`;

  console.log('[PaymentLinks] Trying Venmo app URL:', appUrl);

  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    console.log('[PaymentLinks] Venmo canOpen:', canOpen);
    
    if (canOpen) {
      await Linking.openURL(appUrl);
    } else {
      // App not installed — open App Store
      const appStoreUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/us/app/venmo/id351727428'
        : 'https://play.google.com/store/apps/details?id=com.venmo';
      
      Alert.alert(
        'Venmo Not Installed',
        'Download the Venmo app to pay instantly, or pay via web.',
        [
          { 
            text: 'Download Venmo', 
            onPress: () => Linking.openURL(appStoreUrl)
          },
          {
            text: 'Pay via Web',
            onPress: () => Linking.openURL(webUrl)
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  } catch (error) {
    console.error('[PaymentLinks] Venmo error:', error);
    Alert.alert(
      'Cannot Open Venmo',
      `Please pay @${username} $${formattedAmount} manually on Venmo.`
    );
  }
};

export const requestVenmo = async (
  venmoUsername: string,
  amount: number,
  note: string
): Promise<void> => {
  const username = venmoUsername.replace('@', '').trim();
  const encodedNote = encodeURIComponent(`Divvit: ${note}`);
  const formattedAmount = amount.toFixed(2);

  // txn=charge means REQUEST money from them
  const appUrl = 
    `venmo://paycharge?txn=charge` +
    `&recipients=${username}` +
    `&amount=${formattedAmount}` +
    `&note=${encodedNote}`;

  console.log('[PaymentLinks] Trying Venmo request URL:', appUrl);

  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    
    if (canOpen) {
      await Linking.openURL(appUrl);
    } else {
      const appStoreUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/us/app/venmo/id351727428'
        : 'https://play.google.com/store/apps/details?id=com.venmo';
      
      Alert.alert(
        'Venmo Not Installed',
        `Ask @${username} to pay you $${formattedAmount} on Venmo.`,
        [
          { 
            text: 'Download Venmo',
            onPress: () => Linking.openURL(appStoreUrl)
          },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  } catch (error) {
    console.error('[PaymentLinks] Venmo request error:', error);
  }
};

// ─── CASH APP ────────────────────────────────────────────
// App scheme: cashme://
// Pay URL format varies by version:
//   cashme://CASHTAG/AMOUNT  (older)
//   cash.app/$CASHTAG        (newer universal link)
// Best approach: try cashme:// first, fallback to cash.app universal link
// Universal links (cash.app/...) open the app if installed on iOS

export const openCashApp = async (
  cashtag: string,
  amount: number
): Promise<void> => {
  const tag = cashtag.replace('$', '').trim();
  const formattedAmount = amount.toFixed(2);

  // Cash App universal link — opens app if installed on iOS
  // This is more reliable than cashme:// scheme
  const universalUrl = `https://cash.app/$${tag}/${formattedAmount}`;
  
  // Also try the direct scheme
  const appSchemeUrl = `cashme://$${tag}/${formattedAmount}`;

  console.log('[PaymentLinks] Trying Cash App URLs:', {
    scheme: appSchemeUrl,
    universal: universalUrl
  });

  try {
    // Try app scheme first
    const canOpenScheme = await Linking.canOpenURL(appSchemeUrl);
    console.log('[PaymentLinks] Cash App scheme canOpen:', canOpenScheme);
    
    if (canOpenScheme) {
      await Linking.openURL(appSchemeUrl);
    } else {
      // Use universal link — on iOS this opens the Cash App if installed
      // If not installed, it opens Safari which redirects to App Store
      await Linking.openURL(universalUrl);
    }
  } catch (error) {
    console.error('[PaymentLinks] Cash App error:', error);
    // Final fallback
    try {
      await Linking.openURL(universalUrl);
    } catch {
      Alert.alert(
        'Cannot Open Cash App',
        `Please pay $${tag} $${formattedAmount} manually on Cash App.`
      );
    }
  }
};

export const requestCashApp = async (
  cashtag: string,
  amount: number
): Promise<void> => {
  // Cash App doesn't support pre-filled payment requests via deep link
  // Best we can do is open their profile page in the app
  const tag = cashtag.replace('$', '').trim();
  const formattedAmount = amount.toFixed(2);
  
  const universalUrl = `https://cash.app/$${tag}`;

  try {
    await Linking.openURL(universalUrl);
  } catch (error) {
    Alert.alert(
      'Request via Cash App',
      `Open Cash App and request $${formattedAmount} from $${tag}.`,
      [{ text: 'OK' }]
    );
  }
};

// ─── APPLE CASH (via iMessage) ───────────────────────────
export const openAppleCash = async (
  handle: string,
  amount: number,
  note: string
): Promise<void> => {
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
};

// ─── ZELLE ───────────────────────────────────────────────
// Zelle does NOT have a public deep link scheme.
// The only option is to open the user's banking app.
// Best UX: show instructions + open their bank app or Zelle website

export const openZelle = async (
  zelleContact: string,
  amount: number,
  recipientName: string
): Promise<void> => {
  const formattedAmount = amount.toFixed(2);
  
  // Copy handle to clipboard first
  Clipboard.setString(zelleContact);
  
  // Try to open Zelle app directly
  // Zelle's scheme is not publicly documented
  // Some banks have their own deep links
  const zelleScheme = 'zelle://';
  
  try {
    const canOpen = await Linking.canOpenURL(zelleScheme);
    
    if (canOpen) {
      await Linking.openURL(zelleScheme);
      // Show instructions since Zelle can't pre-fill
      Alert.alert(
        'Zelle Opened',
        `Send $${formattedAmount} to:\n${zelleContact}\n(${recipientName})\n\n(Contact info copied to clipboard)`,
        [{ text: 'Got it' }]
      );
    } else {
      // Zelle not installed as standalone — 
      // most people use it through their bank app
      Alert.alert(
        'Pay via Zelle',
        `Contact info copied to clipboard: ${zelleContact}\n\nOpen your bank's app and use Zelle to send $${formattedAmount} to:\n👤 ${recipientName}`,
        [
          {
            text: 'Open Zelle App',
            onPress: () => {
              const appStoreUrl = Platform.OS === 'ios'
                ? 'https://apps.apple.com/us/app/zelle/id1260755201'
                : 'https://play.google.com/store/apps/details?id=com.zellepay.zelle';
              Linking.openURL(appStoreUrl);
            }
          },
          { text: 'I\'ll do it manually', style: 'cancel' }
        ]
      );
    }
  } catch (error) {
    console.error('[PaymentLinks] Zelle error:', error);
    Alert.alert(
      'Pay via Zelle',
      `Open your banking app and send $${formattedAmount} via Zelle to ${zelleContact}.`
    );
  }
};

// ─── PAYPAL ──────────────────────────────────────────────
// App scheme: paypal://
// Pay URL: paypal://paypalme/USERNAME/AMOUNT

export const openPayPal = async (
  paypalUsername: string,
  amount: number
): Promise<void> => {
  const username = paypalUsername.replace('@', '').trim();
  const formattedAmount = amount.toFixed(2);
  
  // PayPal.me universal link — opens app if installed
  const universalUrl = `https://paypal.me/${username}/${formattedAmount}`;
  const appSchemeUrl = `paypal://paypalme/${username}/${formattedAmount}`;

  try {
    const canOpen = await Linking.canOpenURL(appSchemeUrl);
    
    if (canOpen) {
      await Linking.openURL(appSchemeUrl);
    } else {
      // paypal.me universal link opens app on iOS if installed
      await Linking.openURL(universalUrl);
    }
  } catch (error) {
    console.error('[PaymentLinks] PayPal error:', error);
    try {
      await Linking.openURL(universalUrl);
    } catch {
      Alert.alert(
        'Cannot Open PayPal',
        `Please send $${formattedAmount} to ${username} on PayPal.`
      );
    }
  }
};

// ─── APPLE PAY (via Stripe) ──────────────────────────────
export const isApplePayAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  try {
    // Will be implemented via Stripe SDK
    // For now return false until Stripe is configured
    return false;
  } catch {
    return false;
  }
};

export async function initiateApplePay(
  amount: number,
  merchantName: string,
): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    Alert.alert('Not Available', 'Apple Pay is only available on iOS.');
    return false;
  }

  Alert.alert(
    'Apple Pay',
    `Authorize $${amount.toFixed(2)} payment to ${merchantName} via the Apple Pay button above.`,
    [{ text: 'OK' }]
  );
  return false;
}

// ─── HELPER: Open App Store for a payment app ────────────

export const openAppStore = async (
  appName: 'venmo' | 'cashapp' | 'zelle' | 'paypal'
): Promise<void> => {
  const urls: Record<string, { ios: string; android: string }> = {
    venmo: {
      ios: 'https://apps.apple.com/us/app/venmo/id351727428',
      android: 'https://play.google.com/store/apps/details?id=com.venmo'
    },
    cashapp: {
      ios: 'https://apps.apple.com/us/app/cash-app/id711923939',
      android: 'https://play.google.com/store/apps/details?id=com.squareup.cash'
    },
    zelle: {
      ios: 'https://apps.apple.com/us/app/zelle/id1260755201',
      android: 'https://play.google.com/store/apps/details?id=com.zellepay.zelle'
    },
    paypal: {
      ios: 'https://apps.apple.com/us/app/paypal/id283646709',
      android: 'https://play.google.com/store/apps/details?id=com.paypal.android.p2pmobile'
    },
  };

  const url = Platform.OS === 'ios' 
    ? urls[appName].ios 
    : urls[appName].android;
  
  await Linking.openURL(url);
};

export async function requestVenmoNoRecipient(
    amount: number,
    note: string
): Promise<void> {
    const encodedNote = encodeURIComponent(note);
    const formattedAmount = amount.toFixed(2);

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
