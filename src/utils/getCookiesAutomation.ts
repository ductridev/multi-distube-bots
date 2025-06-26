import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { Cookie } from 'puppeteer';

// Cần để vượt lỗi "This browser or app may not be secure" sau khi điền form email của Google
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('iframe.contentWindow');
stealth.enabledEvasions.delete('media.codecs');
puppeteer.use(stealth);

const ytCookiesPath = path.resolve(__dirname, '../cookies.json');
const ytCookiesTxtPath = path.resolve(__dirname, '../cookies.txt');

function serializeCookiesToNetscape(cookies: Cookie[]): string {
    const lines = ['# Netscape HTTP Cookie File'];

    for (const cookie of cookies) {
        const domain = cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`;
        const flag = cookie.domain.startsWith('.') ? 'TRUE' : 'FALSE';
        const path = cookie.path ?? '/';
        const secure = cookie.secure ? 'TRUE' : 'FALSE';
        const expires = Math.floor(cookie.expires ?? (Date.now() / 1000 + 3600)); // <- FIXED
        const name = cookie.name;
        const value = cookie.value;

        lines.push([domain, flag, path, secure, expires, name, value].join('\t'));
    }

    return lines.join('\n');
}

export const getYoutubeCookie = async () => {
    if (!process.env.GOOGLE_EMAIL || !process.env.GOOGLE_PASSWORD) {
        console.warn('[Youtube Cookie Automation] GOOGLE_EMAIL hoặc GOOGLE_PASSWORD đang bị sai hoặc bị để trống');

        return;
    }

    console.log('[Youtube Cookie Automation] Đang cố gắng lấy cookie từ Google Auth, có thể mất một chút thời gian');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--remote-debugging-port=9222', '--remote-debugging-address=0.0.0.0', '--no-sandbox']
    });
    const page = await browser.newPage();
    await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });

    try {
        // Bấm "Đăng nhập" trên YouTube để đồng ý sử dụng cookie
        await page.click(
            '#topbar > div.top-buttons.style-scope.ytd-consent-bump-v2-lightbox > div:nth-child(2) > ytd-button-renderer > yt-button-shape > a'
        );
    } catch {
        // Bấm "Đăng nhập" trên thanh điều hướng
        await page.click('#buttons > ytd-button-renderer > yt-button-shape > a');
    }
    // Nhập email
    await page.waitForSelector('#identifierId', { visible: true });
    await page.type('#identifierId', process.env.GOOGLE_EMAIL);
    await page.click('#identifierNext');

    // Nhập mật khẩu
    await page.waitForSelector('#password', { visible: true });
    await page.type('#password input', process.env.GOOGLE_PASSWORD);
    // @ts-expect-error Bởi vì page.click() tại trường "#passwordNext" không hoạt động, vì vậy phải dùng page.evaluate() để thực hiện
    await page.evaluate((selector) => document.querySelector(selector).click(), '#passwordNext');

    // Bỏ qua các vấn đề về bảo mật (Nếu Google hỏi)
    try {
        const NotNowSelector =
            '#yDmH0d > c-wiz:nth-child(9) > div > div > div > div.L5MEH.Bokche.ypEC4c > div.lq3Znf > div:nth-child(1) > button > span';
        await page.waitForSelector(NotNowSelector, { timeout: 1e4 });
        await page.click(NotNowSelector);
    } catch {
        await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });
    }

    const cookies = await page.cookies();

    await browser.close();

    if (cookies.length < 10) {
        console.error('[Youtube Cookie Automation] Có gì đó đã xảy ra trong quá trình đăng nhập vào Google');
        return undefined;
    }

    const cookiesJson = JSON.stringify(cookies, null, 2);
    fs.writeFileSync(ytCookiesPath, cookiesJson);

    const netscapeCookies = serializeCookiesToNetscape(cookies);
    fs.writeFileSync(ytCookiesTxtPath, netscapeCookies);

    if (!cookies) console.error('[Youtube Cookie Automation] Không thể lấy cookie');
    if (cookiesJson) console.log('[Youtube Cookie Automation] Lấy cookie cho Youtube thành công');

    return cookies;
}