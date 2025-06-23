import DisTube, { DisTubePlugin, ExtractorPlugin } from "distube";

export async function getPluginForUrl(distube: DisTube, url: string): Promise<ExtractorPlugin | DisTubePlugin> {
    for (const plugin of distube.plugins) {
        if (await plugin.validate(url)) {
            return plugin;
        }
    }
    return distube.plugins.find(plugin => plugin.constructor.name === 'YouTubePlugin') as ExtractorPlugin;
}
