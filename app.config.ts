import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => {
    const appName = IS_DEV ? 'Divvit (Dev)' : 'Divvit';
    const bundleIdentifier = IS_DEV ? 'com.theraq17.divvit.dev' : 'com.theraq17.divvit';
    const scheme = IS_DEV ? 'divvit-dev' : 'divvit';

    return {
        ...config,
        name: appName,
        slug: 'frontend',
        version: '1.0.0',
        orientation: 'portrait',
        icon: './assets/images/icon.png',
        scheme,
        userInterfaceStyle: 'automatic',
        newArchEnabled: true,
        splash: {
            image: './assets/images/splash-icon.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier,
            buildNumber: '16',
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false,
                NSCameraUsageDescription: 'Divvit needs camera access to take group photos after splitting a bill.',
                NSPhotoLibraryUsageDescription: 'Divvit needs photo library access to save group photos.',
            },
        },
        android: {
            adaptiveIcon: {
                foregroundImage: './assets/images/adaptive-icon.png',
                backgroundColor: '#ffffff',
            },
            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: false,
        },
        web: {
            bundler: 'metro',
            output: 'static',
            favicon: './assets/images/favicon.png',
        },
        plugins: [
            'expo-router',
            [
                'expo-image-picker',
                {
                    cameraPermission: 'Divvit needs camera access to take group photos after splitting a bill.',
                },
            ],
            [
                '@stripe/stripe-react-native',
                {
                    merchantIdentifier: 'merchant.com.theraq17.divvit',
                    enableGooglePay: false,
                },
            ],
        ],
        experiments: {
            typedRoutes: false,
        },
        extra: {
            router: {},
            eas: {
                projectId: 'e29d46bc-e0b1-4c04-ad7e-a86c2936337f',
            },
        },
        runtimeVersion: {
            policy: 'appVersion',
        },
        updates: {
            url: 'https://u.expo.dev/e29d46bc-e0b1-4c04-ad7e-a86c2936337f',
        },
    };
};
