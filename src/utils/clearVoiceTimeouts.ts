// src/utils/clearVoiceTimeouts.ts

export function clearVoiceTimeouts(
    vcId: string,
    noSongTimeouts: Map<string, NodeJS.Timeout>,
    noPlayWarningTimeouts: Map<string, NodeJS.Timeout>
) {
    if (noSongTimeouts.has(vcId)) {
        clearTimeout(noSongTimeouts.get(vcId)!);
        noSongTimeouts.delete(vcId);
    }

    if (noPlayWarningTimeouts.has(vcId)) {
        clearTimeout(noPlayWarningTimeouts.get(vcId)!);
        noPlayWarningTimeouts.delete(vcId);
    }
}
