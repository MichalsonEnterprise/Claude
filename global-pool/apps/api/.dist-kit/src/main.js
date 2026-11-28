"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const app_setup_1 = require("./app.setup");
const app_config_1 = require("./config/app-config");
const load_env_1 = require("./config/load-env");
async function bootstrap() {
    // Env files are read before Nest builds the DI graph (nothing reads process.env at import time).
    (0, load_env_1.loadEnvFiles)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    (0, app_setup_1.configureApp)(app);
    const config = app.get(app_config_1.AppConfig);
    await app.listen(config.env.API_PORT, '0.0.0.0');
    const url = (await app.getUrl()).replace('[::1]', 'localhost').replace('0.0.0.0', 'localhost');
    console.info(`GLOBAL POOL API (DEMO / testnet) listening on ${url} — docs at ${url}/docs`);
}
bootstrap().catch((err) => {
    console.error(err instanceof Error ? (err.stack ?? err.message) : err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map