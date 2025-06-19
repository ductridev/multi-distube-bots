import DisTube, { DisTubePlugin } from "distube";

export async function getPluginForUrl(distube: DisTube, url: string): Promise<DisTubePlugin> {
    for (const plugin of distube.plugins) {
        if (await plugin.validate(url)) {
            return plugin;
        }
    }
    return distube.plugins[0];
}
