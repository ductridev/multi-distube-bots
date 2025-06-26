import DisTube, { DisTubePlugin, ExtractorPlugin, InfoExtractorPlugin, PlayableExtractorPlugin } from "distube";

export async function getPluginForUrl(distube: DisTube, url: string): Promise<ExtractorPlugin | DisTubePlugin> {
    for (const plugin of distube.plugins) {
        if (await plugin.validate(url)) {
            if (plugin instanceof InfoExtractorPlugin && plugin.constructor.name === 'SpotifyPlugin') {
                try {
                    await plugin.resolve(url, {});
                    return plugin;
                } catch { }
            } else {
                return plugin;
            }
        }
    }
    return distube.plugins.find(plugin => plugin.constructor.name === 'YouTubePlugin') as ExtractorPlugin;
}
