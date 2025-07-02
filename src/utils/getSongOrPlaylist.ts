import DisTube, { ExtractorPlugin, InfoExtractorPlugin, PlayableExtractorPlugin, Playlist, Song } from "distube";
import { getPluginForUrl } from "./getPluginNameForUrl";
import ytsr from '@distube/ytsr';
import ytpl from '@distube/ytpl';
import path from "path";
import fs from 'fs';

// Get ExtractorPlugin & search song
const ytCookiesPath = path.resolve(__dirname, '../cookies.json');
const ytCookie = JSON.parse(fs.readFileSync(ytCookiesPath, { encoding: 'utf8', flag: 'r' }));

const toSecond = (input: string) => {
    if (!input) return 0;
    if (typeof input !== "string") return Number(input) || 0;
    if (input.includes(":")) {
        const time = input.split(":").reverse();
        let seconds = 0;
        for (let i = 0; i < 3; i++) if (time[i]) seconds += Number(time[i].replace(/[^\d.]+/g, "")) * Math.pow(60, i);
        if (time.length > 3) seconds += Number(time[3].replace(/[^\d.]+/g, "")) * 24 * 60 * 60;
        return seconds;
    } else {
        return Number(input.replace(/[^\d.]+/g, "")) || 0;
    }
}

const parseNumber = (input: string | number) => {
    if (typeof input === "string") return Number(input.replace(/[^\d.]+/g, "")) || 0;
    return Number(input) || 0;
}

export const getSongOrPlaylist = async (distube: DisTube, query: string) => {
    const plugin = await getPluginForUrl(distube, query);
    if (plugin instanceof ExtractorPlugin && !(await plugin.validate(query))) {
        return await plugin.searchSong(query, {});
    } else if (await plugin.validate(query) && plugin instanceof ExtractorPlugin) {
        return await plugin.resolve(query, {});
    } else if (plugin.constructor.name === 'YtDlpPlugin' && plugin instanceof PlayableExtractorPlugin) {
        if (ytpl.validateID(query)) {
            const info = await ytpl(query, {
                limit: Infinity,
                requestOptions: {
                    headers: {
                        cookie: ytCookie
                    }
                }
            });

            const songs = info.items.map(
                (i) => new Song({
                    ...i,
                    plugin,
                    playFromSource: true,
                    source: "youtube",
                    id: i.id,
                    name: i.title,
                    url: i.url.split('&')[0],
                    thumbnail: i.thumbnail,
                    duration: toSecond(i.duration ?? "00:00:00"),
                    isLive: Boolean(i.isLive),
                    uploader: {
                        name: i.author?.name,
                        url: i.author?.url || i.author?.channelID ? `https://www.youtube.com/channel/${i.author.channelID}` : void 0
                    }
                })
            );

            return new Playlist({
                source: "youtube",
                id: info.id,
                name: info.title,
                url: info.url,
                thumbnail: info.thumbnail?.url,
                songs
            }, {})
        } else {
            let { items } = await ytsr(query, {
                hl: 'vi',
                gl: 'VN',
                utcOffsetMinutes: 7,
                type: "video",
                limit: 1,
                safeSearch: true,
                requestOptions: {
                    headers: {
                        cookie: ytCookie
                    }
                }
            });

            if (items.length === 0) {
                const result = await ytsr(query, {
                    hl: 'vi',
                    gl: 'VN',
                    utcOffsetMinutes: 7,
                    type: "video",
                    limit: 25,
                    safeSearch: false,
                    requestOptions: { headers: { cookie: ytCookie } }
                });

                items = result.items;
            }

            if (items.length === 0) {
                return null;
            }

            items = items.sort((a, b) => b.views - a.views);

            const songRaw = {
                plugin: distube.plugins.find(plugin => plugin.constructor.name === 'YouTubePlugin') as ExtractorPlugin,
                source: "youtube",
                playFromSource: true,
                id: items[0].id,
                name: items[0].name,
                url: `https://youtu.be/${items[0].id}`,
                thumbnail: items[0].thumbnail,
                isLive: items[0].isLive,
                duration: toSecond(items[0].duration),
                views: parseNumber(items[0].views),
                uploader: {
                    name: items[0].author?.name,
                    url: items[0].author?.url
                }
            };

            const song = new Song(
                {
                    plugin: songRaw.plugin,
                    source: "youtube",
                    playFromSource: true,
                    id: songRaw.id,
                    name: songRaw.name,
                    url: songRaw.url,
                    thumbnail: songRaw.thumbnail,
                    duration: songRaw.duration,
                    views: songRaw.views,
                    uploader: songRaw.uploader
                }
            );

            if (song && song.url) {
                return song;
            } else {
                return null;
            }
        }
    } else {
        return await plugin.resolve(query, {});
    }
}