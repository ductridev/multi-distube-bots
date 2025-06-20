// src/utils/embedSettingsLoader.ts
import EmbedSettingsModel from '../models/EmbedSettings';

const defaultFooter = {
    footerText: 'BuNgo Music Bot 🎵 • Maded by Tổ Rắm Độc with ♥️',
    footerIconURL: 'https://i.imgur.com/YOUR_ICON.png',
};

export async function getEmbedFooter() {
    let settings = await EmbedSettingsModel.findOne();

    if (!settings) {
        settings = await EmbedSettingsModel.create(defaultFooter);
    }

    return {
        text: settings.footerText,
        iconURL: settings.footerIconURL,
    };
}
