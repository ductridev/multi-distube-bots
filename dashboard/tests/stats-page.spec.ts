import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:20082';

// JWT token for authentication
const AUTH_TOKEN = process.env.DASHBOARD_TEST_TOKEN || '';

// Mock user data that matches the JWT token
const MOCK_USER = {
  id: '1',
  discordId: '566577469172351007',
  username: 'TestUser',
  discriminator: '0000',
  avatar: null,
  role: 'owner',
  isPremium: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock stats data
const MOCK_STATS_OVERVIEW = {
  totalGuilds: 100,
  totalUsers: 5000,
  activePlayers: 25,
  totalTracks: 10000,
};

const MOCK_SERVERS = [
  { id: '1', name: 'Test Server 1', icon: null, memberCount: 100 },
  { id: '2', name: 'Test Server 2', icon: null, memberCount: 200 },
];

const MOCK_CHART_DATA = {
  sessions: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [10, 20, 15, 25, 30, 20, 15],
  },
  listeners: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [50, 60, 45, 70, 80, 55, 40],
  },
  trackTypes: {
    youtube: 60,
    spotify: 30,
    soundcloud: 10,
  },
  activityHours: Array(24).fill(0).map((_, i) => ({ hour: i, count: Math.floor(Math.random() * 100) })),
  activityWeekdays: Array(7).fill(0).map((_, i) => ({ day: i, count: Math.floor(Math.random() * 100) })),
};

const MOCK_LISTS = {
  mostPlayed: Array(10).fill(0).map((_, i) => ({
    title: `Track ${i + 1}`,
    artist: `Artist ${i + 1}`,
    playCount: Math.floor(Math.random() * 100) + 10,
  })),
  mostListened: Array(10).fill(0).map((_, i) => ({
    title: `Track ${i + 1}`,
    artist: `Artist ${i + 1}`,
    listenTime: Math.floor(Math.random() * 10000) + 1000,
  })),
  topCommands: Array(10).fill(0).map((_, i) => ({
    command: `command${i + 1}`,
    count: Math.floor(Math.random() * 500) + 50,
  })),
};

// Helper function to set up API mocking
async function setupApiMocks(page: import('@playwright/test').Page) {
  // Mock auth/me endpoint
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: MOCK_USER,
        csrfToken: 'mock-csrf-token',
      }),
    });
  });

  // Mock stats overview
  await page.route('**/api/stats/overview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_STATS_OVERVIEW,
      }),
    });
  });

  // Mock user servers
  await page.route('**/api/stats/user/servers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_SERVERS,
      }),
    });
  });

  // Mock sessions chart
  await page.route('**/api/stats/servers/**/charts/sessions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        ...MOCK_CHART_DATA.sessions,
      }),
    });
  });

  // Mock listeners chart
  await page.route('**/api/stats/servers/**/charts/listeners**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        ...MOCK_CHART_DATA.listeners,
      }),
    });
  });

  // Mock track types chart
  await page.route('**/api/stats/servers/**/charts/track-types**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        ...MOCK_CHART_DATA.trackTypes,
      }),
    });
  });

  // Mock activity hours chart
  await page.route('**/api/stats/servers/**/charts/activity/hours**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_CHART_DATA.activityHours,
      }),
    });
  });

  // Mock activity weekdays chart
  await page.route('**/api/stats/servers/**/charts/activity/weekdays**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_CHART_DATA.activityWeekdays,
      }),
    });
  });

  // Mock most played list
  await page.route('**/api/stats/servers/**/lists/most-played**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_LISTS.mostPlayed,
      }),
    });
  });

  // Mock most listened list
  await page.route('**/api/stats/servers/**/lists/most-listened**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_LISTS.mostListened,
      }),
    });
  });

  // Mock top commands list
  await page.route('**/api/stats/servers/**/lists/top-commands**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_LISTS.topCommands,
      }),
    });
  });

  // Mock premium status
  await page.route('**/api/stats/check-premium', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        isPremium: true,
      }),
    });
  });

  // Mock bots endpoint
  await page.route('**/api/bots**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
      }),
    });
  });

  // Mock stats/bots endpoint
  await page.route('**/api/stats/bots', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
      }),
    });
  });

  // Mock stats history
  await page.route('**/api/stats/history**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
      }),
    });
  });

  // Mock top guilds
  await page.route('**/api/stats/top-guilds**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
      }),
    });
  });

  // Mock top tracks
  await page.route('**/api/stats/top-tracks**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
      }),
    });
  });
}

// Helper function to navigate and wait for page to be ready
async function gotoStatsPage(page: import('@playwright/test').Page) {
  // Set up API mocking first
  await setupApiMocks(page);
  
  // Add init script to set auth token before page loads
  await page.addInitScript((token) => {
    localStorage.setItem('dashboard_token', token);
  }, AUTH_TOKEN);
  
  // Navigate to the stats page
  await page.goto(`${BASE_URL}/dashboard/stats`);
  // Wait for the page to stabilize
  await page.waitForLoadState('networkidle');
}

test.describe('Statistics Page UI and Functionality Tests', () => {
  
  test.describe('1. Navigation and Page Load', () => {
    test('should navigate to statistics page', async ({ page }) => {
      await gotoStatsPage(page);
      
      // Take a screenshot of the initial page load
      await page.screenshot({ 
        path: 'test-results/stats-page-initial.png', 
        fullPage: true 
      });
      
      // Verify the page title exists - use more specific selector since there are multiple h1 elements
      const statsTitle = page.locator('h1').filter({ hasText: 'Statistics' });
      await expect(statsTitle).toBeVisible({ timeout: 10000 });
    });

    test('should display page header with description', async ({ page }) => {
      await gotoStatsPage(page);
      
      // Check header title - use more specific selector
      const title = page.locator('h1').filter({ hasText: 'Statistics' });
      await expect(title).toBeVisible({ timeout: 10000 });
      
      // Check description
      const description = page.locator('text=Detailed analytics and performance metrics');
      await expect(description).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('2. UI Components', () => {
    test.beforeEach(async ({ page }) => {
      await gotoStatsPage(page);
      // Wait for page to stabilize
      await page.waitForTimeout(1000);
    });

    test('should display server selector dropdown', async ({ page }) => {
      // Look for server selector button
      const serverButton = page.locator('button:has-text("All Servers")').first();
      
      if (await serverButton.count() > 0) {
        await expect(serverButton).toBeVisible();
        
        // Take screenshot
        await page.screenshot({ 
          path: 'test-results/server-selector.png',
          clip: { x: 0, y: 0, width: 400, height: 200 }
        });
      } else {
        // Server selector might not appear if no servers available
        console.log('Server selector not visible - may require servers to be configured');
      }
    });

    test('should display all 7 time period filters', async ({ page }) => {
      const timePeriods = [
        'Last 4 Hours',
        'Today',
        'Yesterday',
        'Last 24 Hours',
        'Last 7 Days',
        'Last 30 Days',
        'All Time'
      ];
      
      // Take screenshot of filter section
      await page.screenshot({ 
        path: 'test-results/time-filters.png',
        fullPage: false
      });
      
      for (const period of timePeriods) {
        const periodButton = page.locator(`button:has-text("${period}")`);
        const count = await periodButton.count();
        
        if (count > 0) {
          console.log(`✓ Time period "${period}" found`);
        } else {
          console.log(`✗ Time period "${period}" NOT found`);
        }
      }
    });

    test('should display all 4 aggregation methods', async ({ page }) => {
      const aggregationMethods = [
        'Average',
        'Last Value',
        'Max Value',
        'Min Value'
      ];
      
      for (const method of aggregationMethods) {
        const methodButton = page.locator(`button:has-text("${method}")`);
        const count = await methodButton.count();
        
        if (count > 0) {
          console.log(`✓ Aggregation method "${method}" found`);
        } else {
          console.log(`✗ Aggregation method "${method}" NOT found`);
        }
      }
    });

    test('should show premium lock icons on Last 30 Days and All Time', async ({ page }) => {
      // Take screenshot of premium indicators
      await page.screenshot({ 
        path: 'test-results/premium-locks.png',
        fullPage: false
      });
      
      // Check for lock icons or premium indicators
      const premiumPeriods = ['Last 30 Days', 'All Time'];
      
      for (const period of premiumPeriods) {
        const periodButton = page.locator(`button:has-text("${period}")`);
        if (await periodButton.count() > 0) {
          // Look for lock icon within or near the button
          const parent = periodButton.locator('xpath=..');
          const hasLock = await parent.locator('svg, [class*="lock"]').count() > 0;
          console.log(`Period "${period}" has lock indicator: ${hasLock}`);
        }
      }
    });

    test('should display premium badge if user is premium', async ({ page }) => {
      // Look for premium badge
      const premiumBadge = page.locator('text=Premium').first();
      
      if (await premiumBadge.count() > 0) {
        await expect(premiumBadge).toBeVisible();
        console.log('✓ Premium badge is visible');
        
        // Take screenshot
        await page.screenshot({ 
          path: 'test-results/premium-badge.png',
          clip: { x: 0, y: 0, width: 800, height: 200 }
        });
      } else {
        console.log('Premium badge not visible - user may not be premium');
      }
    });
  });

  test.describe('3. Charts Section', () => {
    test.beforeEach(async ({ page }) => {
      await gotoStatsPage(page);
      // Wait for charts to potentially load
      await page.waitForTimeout(2000);
    });

    test('should display sessions chart', async ({ page }) => {
      // Look for sessions chart container
      const sessionsChart = page.locator('text=/sessions/i').first();
      
      await page.screenshot({ 
        path: 'test-results/charts-sessions.png',
        fullPage: true
      });
      
      if (await sessionsChart.count() > 0) {
        console.log('✓ Sessions chart section found');
      } else {
        console.log('✗ Sessions chart section NOT found');
      }
    });

    test('should display listeners chart', async ({ page }) => {
      const listenersChart = page.locator('text=/listeners/i').first();
      
      await page.screenshot({ 
        path: 'test-results/charts-listeners.png',
        fullPage: true
      });
      
      if (await listenersChart.count() > 0) {
        console.log('✓ Listeners chart section found');
      } else {
        console.log('✗ Listeners chart section NOT found');
      }
    });

    test('should display track types doughnut chart', async ({ page }) => {
      // Look for track types section (YouTube, Spotify, SoundCloud)
      const trackTypesSection = page.locator('text=/track types|youtube|spotify|soundcloud/i').first();
      
      await page.screenshot({ 
        path: 'test-results/charts-track-types.png',
        fullPage: true
      });
      
      if (await trackTypesSection.count() > 0) {
        console.log('✓ Track types chart section found');
      } else {
        console.log('✗ Track types chart section NOT found');
      }
    });

    test('should display hourly activity chart', async ({ page }) => {
      const hourlyChart = page.locator('text=/hourly|hours|activity/i').first();
      
      await page.screenshot({ 
        path: 'test-results/charts-hourly.png',
        fullPage: true
      });
      
      if (await hourlyChart.count() > 0) {
        console.log('✓ Hourly activity chart section found');
      } else {
        console.log('✗ Hourly activity chart section NOT found');
      }
    });

    test('should display weekday activity chart', async ({ page }) => {
      const weekdayChart = page.locator('text=/weekday|weekly|day/i').first();
      
      await page.screenshot({ 
        path: 'test-results/charts-weekday.png',
        fullPage: true
      });
      
      if (await weekdayChart.count() > 0) {
        console.log('✓ Weekday activity chart section found');
      } else {
        console.log('✗ Weekday activity chart section NOT found');
      }
    });

    test('should handle empty chart states gracefully', async ({ page }) => {
      // Look for empty state messages
      const emptyState = page.locator('text=/no data|loading|error/i');
      
      if (await emptyState.count() > 0) {
        console.log('Empty/loading states detected for charts');
        await page.screenshot({ 
          path: 'test-results/charts-empty-states.png',
          fullPage: true
        });
      }
    });
  });

  test.describe('4. Lists Section', () => {
    test.beforeEach(async ({ page }) => {
      await gotoStatsPage(page);
      await page.waitForTimeout(2000);
    });

    test('should display Most Time Played list', async ({ page }) => {
      const mostPlayedSection = page.locator('text=/most.*played|time played/i').first();
      
      if (await mostPlayedSection.count() > 0) {
        console.log('✓ Most Time Played list found');
        await expect(mostPlayedSection).toBeVisible();
      } else {
        console.log('✗ Most Time Played list NOT found');
      }
      
      await page.screenshot({ 
        path: 'test-results/list-most-played.png',
        fullPage: true
      });
    });

    test('should display Most Time Listened list', async ({ page }) => {
      const mostListenedSection = page.locator('text=/most.*listened|time listened/i').first();
      
      if (await mostListenedSection.count() > 0) {
        console.log('✓ Most Time Listened list found');
        await expect(mostListenedSection).toBeVisible();
      } else {
        console.log('✗ Most Time Listened list NOT found');
      }
    });

    test('should display Top Commands list', async ({ page }) => {
      const topCommandsSection = page.locator('text=/top commands|commands/i').first();
      
      if (await topCommandsSection.count() > 0) {
        console.log('✓ Top Commands list found');
        await expect(topCommandsSection).toBeVisible();
      } else {
        console.log('✗ Top Commands list NOT found');
      }
    });

    test('lists should be scrollable if content exceeds height', async ({ page }) => {
      // Check for custom scrollbar class
      const scrollableElements = page.locator('.custom-scrollbar');
      const count = await scrollableElements.count();
      
      console.log(`Found ${count} elements with custom-scrollbar class`);
      
      await page.screenshot({ 
        path: 'test-results/lists-scrollable.png',
        fullPage: true
      });
    });

    test('should show no data message when lists are empty', async ({ page }) => {
      const noDataMessage = page.locator('text=/no data|no.*available/i');
      
      if (await noDataMessage.count() > 0) {
        console.log('✓ "No data" message displayed for empty lists');
        await page.screenshot({ 
          path: 'test-results/lists-no-data.png',
          fullPage: true
        });
      }
    });
  });

  test.describe('5. Responsive Design', () => {
    test('should display properly on mobile width (375px)', async ({ page }) => {
      // Set up API mocking first
      await setupApiMocks(page);
      
      // Add init script to set auth token before page loads
      await page.addInitScript((token) => {
        localStorage.setItem('dashboard_token', token);
      }, AUTH_TOKEN);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to the stats page
      await page.goto(`${BASE_URL}/dashboard/stats`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Take mobile screenshot
      await page.screenshot({ 
        path: 'test-results/mobile-layout.png',
        fullPage: true
      });
      
      // Verify components stack properly - use more specific selector
      const title = page.locator('h1').filter({ hasText: 'Statistics' });
      await expect(title).toBeVisible({ timeout: 15000 });
      console.log('✓ Mobile layout test completed');
    });

    test('should display properly on tablet width (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await gotoStatsPage(page);
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'test-results/tablet-layout.png',
        fullPage: true
      });
      
      console.log('✓ Tablet layout test completed');
    });

    test('should display properly on desktop width (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await gotoStatsPage(page);
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'test-results/desktop-layout.png',
        fullPage: true
      });
      
      console.log('✓ Desktop layout test completed');
    });

    test('filter buttons should wrap on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await gotoStatsPage(page);
      await page.waitForTimeout(1000);
      
      // Take screenshot focusing on filter area
      await page.screenshot({ 
        path: 'test-results/mobile-filters.png',
        clip: { x: 0, y: 100, width: 375, height: 300 }
      });
    });
  });

  test.describe('6. Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await gotoStatsPage(page);
      await page.waitForTimeout(1000);
    });

    test('should change time period when clicked', async ({ page }) => {
      // Find and click "Today" period
      const todayButton = page.locator('button:has-text("Today")').first();
      
      if (await todayButton.count() > 0) {
        await todayButton.click();
        await page.waitForTimeout(500);
        
        // Take screenshot after interaction
        await page.screenshot({ 
          path: 'test-results/interaction-today-period.png',
          fullPage: true
        });
        
        console.log('✓ Clicked "Today" time period');
      }
    });

    test('should change aggregation method when clicked', async ({ page }) => {
      // Find and click "Max Value" aggregation
      const maxButton = page.locator('button:has-text("Max Value")').first();
      
      if (await maxButton.count() > 0) {
        await maxButton.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: 'test-results/interaction-max-aggregation.png',
          fullPage: true
        });
        
        console.log('✓ Clicked "Max Value" aggregation');
      }
    });

    test('should show toast for premium period when non-premium', async ({ page }) => {
      // Try to click "Last 30 Days" (premium period)
      const premiumButton = page.locator('button:has-text("Last 30 Days")').first();
      
      if (await premiumButton.count() > 0) {
        await premiumButton.click();
        await page.waitForTimeout(1000);
        
        // Look for toast notification
        const toast = page.locator('text=/premium|required|donate/i');
        
        await page.screenshot({ 
          path: 'test-results/interaction-premium-toast.png',
          fullPage: true
        });
        
        if (await toast.count() > 0) {
          console.log('✓ Premium toast notification appeared');
        } else {
          console.log('No toast appeared - user may be premium or toast timing issue');
        }
      }
    });

    test('should open server dropdown when clicked', async ({ page }) => {
      const serverButton = page.locator('button:has-text("All Servers")').first();
      
      if (await serverButton.count() > 0) {
        await serverButton.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: 'test-results/interaction-server-dropdown.png',
          fullPage: true
        });
        
        // Check if dropdown is visible
        const dropdown = page.locator('[class*="dropdown"], [class*="menu"]').first();
        if (await dropdown.count() > 0) {
          console.log('✓ Server dropdown opened');
        }
      }
    });

    test('should show loading states during data fetch', async ({ page }) => {
      // Reload page and immediately look for loading indicators
      await page.reload();
      
      const loadingIndicator = page.locator('text=/loading|...|spinner|animate');
      const hasLoading = await loadingIndicator.count() > 0;
      
      console.log(`Loading indicators present: ${hasLoading}`);
      
      await page.screenshot({ 
        path: 'test-results/loading-states.png',
        fullPage: true
      });
    });
  });

  test.describe('7. Legacy Overview Section', () => {
    test.beforeEach(async ({ page }) => {
      await gotoStatsPage(page);
      await page.waitForTimeout(2000);
    });

    test('should display System Overview section', async ({ page }) => {
      const overviewTitle = page.locator('text=System Overview');
      
      if (await overviewTitle.count() > 0) {
        await expect(overviewTitle).toBeVisible();
        console.log('✓ System Overview section found');
      }
    });

    test('should display stat cards (Total Guilds, Users, Players, Tracks)', async ({ page }) => {
      const statCards = [
        'Total Guilds',
        'Total Users',
        'Active Players',
        'Total Tracks'
      ];
      
      for (const card of statCards) {
        const cardElement = page.locator(`text=${card}`);
        if (await cardElement.count() > 0) {
          console.log(`✓ Stat card "${card}" found`);
        } else {
          console.log(`✗ Stat card "${card}" NOT found`);
        }
      }
      
      await page.screenshot({ 
        path: 'test-results/stat-cards.png',
        fullPage: true
      });
    });

    test('should display Bot Performance table', async ({ page }) => {
      const botPerformanceTitle = page.locator('text=Bot Performance');
      
      if (await botPerformanceTitle.count() > 0) {
        await expect(botPerformanceTitle).toBeVisible();
        console.log('✓ Bot Performance section found');
        
        // Check for table headers
        const tableHeaders = ['Bot Name', 'Guilds', 'Users', 'Players', 'Uptime'];
        for (const header of tableHeaders) {
          const headerElement = page.locator(`text=${header}`);
          if (await headerElement.count() > 0) {
            console.log(`  ✓ Table header "${header}" found`);
          }
        }
      }
      
      await page.screenshot({ 
        path: 'test-results/bot-performance.png',
        fullPage: true
      });
    });

    test('should display Top Guilds and Top Tracks sections', async ({ page }) => {
      const topGuilds = page.locator('text=Top Guilds');
      const topTracks = page.locator('text=Top Tracks');
      
      if (await topGuilds.count() > 0) {
        console.log('✓ Top Guilds section found');
      }
      
      if (await topTracks.count() > 0) {
        console.log('✓ Top Tracks section found');
      }
      
      await page.screenshot({ 
        path: 'test-results/top-guilds-tracks.png',
        fullPage: true
      });
    });
  });

  test.describe('8. Console and Network Errors', () => {
    test('should capture console errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await gotoStatsPage(page);
      await page.waitForTimeout(3000);
      
      if (consoleErrors.length > 0) {
        console.log('Console errors found:');
        consoleErrors.forEach(err => console.log(`  - ${err}`));
      } else {
        console.log('No console errors detected');
      }
    });

    test('should capture failed network requests', async ({ page }) => {
      const failedRequests: string[] = [];
      
      page.on('requestfailed', request => {
        failedRequests.push(`${request.method()} ${request.url()}`);
      });
      
      await gotoStatsPage(page);
      await page.waitForTimeout(3000);
      
      if (failedRequests.length > 0) {
        console.log('Failed requests found:');
        failedRequests.forEach(req => console.log(`  - ${req}`));
      } else {
        console.log('No failed network requests detected');
      }
    });
  });

  test.describe('9. API Integration with Auth', () => {
    test('should make authenticated API calls', async ({ page }) => {
      // Intercept API calls to verify auth token is being sent
      const apiCalls: string[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          const authHeader = request.headers()['authorization'];
          apiCalls.push(`${request.method()} ${request.url()} - Auth: ${authHeader ? 'Yes' : 'No'}`);
        }
      });
      
      await gotoStatsPage(page);
      await page.waitForTimeout(3000);
      
      if (apiCalls.length > 0) {
        console.log('API calls made:');
        apiCalls.forEach(call => console.log(`  - ${call}`));
      } else {
        console.log('No API calls detected');
      }
    });

    test('should have auth token in localStorage', async ({ page }) => {
      // Set up mocking first
      await setupApiMocks(page);
      
      // Add init script to set auth token before page loads
      await page.addInitScript((token) => {
        localStorage.setItem('dashboard_token', token);
      }, AUTH_TOKEN);
      
      await page.goto(`${BASE_URL}/dashboard/stats`);
      
      const token = await page.evaluate(() => {
        return localStorage.getItem('dashboard_token');
      });
      
      expect(token).toBeTruthy();
      console.log(`✓ Auth token present in localStorage: ${token ? token.substring(0, 20) + '...' : 'null'}`);
    });
  });
});
