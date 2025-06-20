import { Queue } from "distube";

export function formatExtendedDuration(totalSeconds: number): string {
    const SECONDS_IN_YEAR = 31536000;
    const SECONDS_IN_MONTH = 2592000;
    const SECONDS_IN_WEEK = 604800;
    const SECONDS_IN_DAY = 86400;
    const SECONDS_IN_HOUR = 3600;
    const SECONDS_IN_MINUTE = 60;

    const years = Math.floor(totalSeconds / SECONDS_IN_YEAR);
    totalSeconds %= SECONDS_IN_YEAR;

    const months = Math.floor(totalSeconds / SECONDS_IN_MONTH);
    totalSeconds %= SECONDS_IN_MONTH;

    const weeks = Math.floor(totalSeconds / SECONDS_IN_WEEK);
    totalSeconds %= SECONDS_IN_WEEK;

    const days = Math.floor(totalSeconds / SECONDS_IN_DAY);
    totalSeconds %= SECONDS_IN_DAY;

    const hours = Math.floor(totalSeconds / SECONDS_IN_HOUR);
    totalSeconds %= SECONDS_IN_HOUR;

    const minutes = Math.floor(totalSeconds / SECONDS_IN_MINUTE);
    const seconds = Math.floor(totalSeconds % SECONDS_IN_MINUTE);

    const parts = [];
    if (years) parts.push(`${years}y`);
    if (months) parts.push(`${months}mo`);
    if (weeks) parts.push(`${weeks}w`);
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

export function getEstimatedWaitTime(queue: Queue) {
    if (!queue) return '00:00';
    let time = 0;
    for (let i = 0; i < queue.songs.length; i++) {
        time += queue.songs[i].duration || 0;
    }
    time -= queue.currentTime
    if (time <= 0) {
        return 'Ngay bây giờ';
    }

    return formatExtendedDuration(time);
}

export function getQueuePosition(queue: Queue) {
    if (!queue) return '1';
    return `${queue.songs.length + 1}`;
}

export function getUpcomingPosition(queue: Queue) {
    if (!queue || queue.songs.length === 0) return 'Ngay bây giờ';
    if (queue.songs.length === 1) return 'Tiếp theo';
    return `#${queue.songs.length + 1}`;
}
