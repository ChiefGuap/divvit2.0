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
// Zelle does NOT have its own app — it's built into banking apps.
// We maintain a registry of major US banks with their iOS URL schemes
// so we can open the user's specific bank app directly.
//
// The payer's bank choice is saved locally (AsyncStorage) so they
// only pick once, then it's one-tap every time after that.

export type ZelleBank = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  iconLetter: string;
  iosScheme: string;
  appStoreId: string;
  androidPackage: string;
};

export const ZELLE_BANKS: ZelleBank[] = [
  {
    id: 'chase',
    name: 'Chase',
    shortName: 'Chase',
    color: '#117ACA',
    iconLetter: 'C',
    iosScheme: 'chase',
    appStoreId: '298867247',
    androidPackage: 'com.chase.sig.android',
  },
  {
    id: 'bofa',
    name: 'Bank of America',
    shortName: 'BofA',
    color: '#012169',
    iconLetter: 'B',
    iosScheme: 'bofa',
    appStoreId: '284847138',
    androidPackage: 'com.infonow.bofa',
  },
  {
    id: 'wellsfargo',
    name: 'Wells Fargo',
    shortName: 'Wells Fargo',
    color: '#D71E28',
    iconLetter: 'W',
    iosScheme: 'wellsfargo',
    appStoreId: '311548617',
    androidPackage: 'com.wf.wellsfargomobile',
  },
  {
    id: 'usbank',
    name: 'U.S. Bank',
    shortName: 'US Bank',
    color: '#002855',
    iconLetter: 'U',
    iosScheme: 'usbank',
    appStoreId: '401088882',
    androidPackage: 'com.usbank.mobilebanking',
  },
  {
    id: 'citi',
    name: 'Citibank',
    shortName: 'Citi',
    color: '#003B70',
    iconLetter: 'C',
    iosScheme: 'citi',
    appStoreId: '301724680',
    androidPackage: 'com.citi.citimobile',
  },
  {
    id: 'capitalone',
    name: 'Capital One',
    shortName: 'Cap One',
    color: '#004977',
    iconLetter: 'C',
    iosScheme: 'capitalone',
    appStoreId: '407558537',
    androidPackage: 'com.konylabs.capitalone',
  },
  {
    id: 'pnc',
    name: 'PNC Bank',
    shortName: 'PNC',
    color: '#FF6600',
    iconLetter: 'P',
    iosScheme: 'pncmobile',
    appStoreId: '303113127',
    androidPackage: 'com.pnc.ecommerce.mobile',
  },
  {
    id: 'td',
    name: 'TD Bank',
    shortName: 'TD',
    color: '#34A853',
    iconLetter: 'T',
    iosScheme: 'td',
    appStoreId: '463674454',
    androidPackage: 'com.tdbank',
  },
];

/**
 * Get the full bank registry for the bank picker UI.
 */
export const getZelleBanks = (): ZelleBank[] => ZELLE_BANKS;

/**
 * Get a bank by ID.
 */
export const getZelleBankById = (bankId: string): ZelleBank | undefined =>
  ZELLE_BANKS.find(b => b.id === bankId);

/**
 * Opens the user's specific banking app for Zelle payment.
 * Copies the host's Zelle contact to clipboard first.
 * Returns true if the bank app was opened successfully.
 */
export const openZelleViaBank = async (
  bank: ZelleBank,
  zelleContact: string,
  amount: number,
  recipientName: string
): Promise<boolean> => {
  const formattedAmount = amount.toFixed(2);

  // Copy host's Zelle contact to clipboard
  Clipboard.setString(zelleContact);

  const schemeUrl = `${bank.iosScheme}://`;

  console.log(`[PaymentLinks] Zelle via ${bank.name}: trying ${schemeUrl}`);

  try {
    const canOpen = await Linking.canOpenURL(schemeUrl);
    console.log(`[PaymentLinks] ${bank.name} canOpen:`, canOpen);

    if (canOpen) {
      await Linking.openURL(schemeUrl);
      return true;
    } else {
      // Bank app not installed — offer to download
      const appStoreUrl = Platform.OS === 'ios'
        ? `https://apps.apple.com/us/app/id${bank.appStoreId}`
        : `https://play.google.com/store/apps/details?id=${bank.androidPackage}`;

      Alert.alert(
        `${bank.name} Not Installed`,
        `Download ${bank.name} to pay $${formattedAmount} via Zelle to ${recipientName}.\n\nZelle contact copied to clipboard.`,
        [
          {
            text: `Get ${bank.shortName}`,
            onPress: () => Linking.openURL(appStoreUrl),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return false;
    }
  } catch (error) {
    console.error(`[PaymentLinks] ${bank.name} error:`, error);
    Alert.alert(
      'Cannot Open Bank App',
      `Please open ${bank.name} and send $${formattedAmount} via Zelle to ${zelleContact}.`,
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Legacy Zelle opener — tries zelle:// scheme, then shows generic instructions.
 * Used by checkout.tsx and as fallback.
 */
export const openZelle = async (
  zelleContact: string,
  amount: number,
  recipientName: string
): Promise<void> => {
  const formattedAmount = amount.toFixed(2);
  
  // Copy handle to clipboard first
  Clipboard.setString(zelleContact);
  
  const zelleScheme = 'zelle://';
  
  try {
    const canOpen = await Linking.canOpenURL(zelleScheme);
    
    if (canOpen) {
      await Linking.openURL(zelleScheme);
      Alert.alert(
        'Zelle Opened',
        `Send $${formattedAmount} to:\n${zelleContact}\n(${recipientName})\n\n(Contact info copied to clipboard)`,
        [{ text: 'Got it' }]
      );
    } else {
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

    // Copy amount to clipboard
    Clipboard.setString(formattedAmount);

    const deepLink = `venmo://paycharge?txn=charge&amount=${formattedAmount}&note=${encodedNote}`;
    const webFallback = `https://venmo.com`;

    // Prompt the user
    Alert.alert(
        'Amount Copied',
        `$${formattedAmount} has been copied to your clipboard.\n\nWould you like to open Venmo to search for the participant and request the payment?`,
        [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Open Venmo',
                onPress: async () => {
                    try {
                        await Linking.openURL(deepLink);
                    } catch (error) {
                        console.warn('Could not open Venmo app, opening website fallback:', error);
                        try {
                            await Linking.openURL(webFallback);
                        } catch (webError) {
                            console.error('Could not open Venmo website fallback:', webError);
                        }
                    }
                }
            }
        ]
    );
}

export async function requestCashAppNoRecipient(
    amount: number
): Promise<void> {
    const formattedAmount = amount.toFixed(2);

    // Copy amount to clipboard
    Clipboard.setString(formattedAmount);

    const deepLink = `cashme://launch`;
    const webFallback = `https://cash.app`;

    // Prompt the user
    Alert.alert(
        'Amount Copied',
        `$${formattedAmount} has been copied to your clipboard.\n\nWould you like to open Cash App to search for the participant and request the payment?`,
        [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Open Cash App',
                onPress: async () => {
                    try {
                        await Linking.openURL(deepLink);
                    } catch (error) {
                        console.warn('Could not open Cash App app, opening website fallback:', error);
                        try {
                            await Linking.openURL(webFallback);
                        } catch (webError) {
                            console.error('Could not open Cash App website fallback:', webError);
                        }
                    }
                }
            }
        ]
    );
}
