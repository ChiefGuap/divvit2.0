import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';

export async function uploadBillPhoto(billId: string, uri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
    });

    const filePath = `${billId}.jpg`;
    const { error: uploadError } = await supabase.storage
        .from('bill-photos')
        .upload(filePath, decode(base64), {
            contentType: 'image/jpeg',
            upsert: true,
        });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('bill-photos')
        .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
        .from('bills')
        .update({ group_photo_url: publicUrl })
        .eq('id', billId);

    if (updateError) throw updateError;

    return publicUrl;
}
