import DisTube, { ExtractorPlugin, InfoExtractorPlugin, PlayableExtractorPlugin, Playlist, Song } from "distube";
import { getPluginForUrl } from "./getPluginNameForUrl";

export const getSongOrPlaylist = async (distube: DisTube, query: string) => {
    const plugin = await getPluginForUrl(distube, query);
    if (plugin instanceof ExtractorPlugin && !(await plugin.validate(query))) {
        return await plugin.searchSong(query, {});
    } else if (plugin.constructor.name === 'YtDlpPlugin' && plugin instanceof PlayableExtractorPlugin) {
        // Get ExtractorPlugin & search song
        let searchPlugin: ExtractorPlugin | undefined = await plugin.distube.plugins.find(plugin => plugin instanceof ExtractorPlugin);
        if (!searchPlugin) throw Error("Please add atleast 1 ExtractorPlugin.");

        let song = await searchPlugin.searchSong(query, {});

        if (song && song.url) {
            return song;
        } else {
            return null;
        }
    } else {
        return await plugin.resolve(query, {});
    }
}