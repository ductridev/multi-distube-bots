// Load .env
import 'dotenv/config'

require('./src/utils/logCollector');
const startAllBots = require('./src/botManager');
startAllBots();
