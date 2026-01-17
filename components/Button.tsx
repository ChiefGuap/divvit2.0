import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline';
    className?: string;
    textClassName?: string;
    icon?: React.ReactNode;
}

export const Button = ({ title, variant = 'primary', style, className, textClassName, onPress, icon, ...props }: ButtonProps) => {

    const handlePress = (e: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.(e);
    };

    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return 'bg-divvit-primary';
            case 'secondary':
                return 'bg-divvit-secondary';
            case 'outline':
                return 'border border-divvit-muted bg-transparent';
            default:
                return 'bg-divvit-primary';
        }
    };

    const getTextColor = () => {
        if (variant === 'outline') return 'text-divvit-text';
        return 'text-black';
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            className={`py-4 px-6 rounded-2xl flex-row items-center justify-center gap-3 ${getVariantStyles()} ${className}`}
            {...props}
        >
            <Text className={`font-heading text-lg font-bold uppercase tracking-wider ${getTextColor()} ${textClassName}`}>
                {title}
            </Text>
            {icon}
        </TouchableOpacity>
    );
};
