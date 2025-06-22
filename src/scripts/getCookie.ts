// Load .env
import 'dotenv/config'

import { getYoutubeCookie } from "../utils/getCookiesAutomation";

getYoutubeCookie().then((cookie) => {
    if (cookie) {
        console.log('[Youtube Cookie] Lấy cookie thành công');
    } else {
        console.log('[Youtube Cookie] Lấy cookie thất bại');
    }
});