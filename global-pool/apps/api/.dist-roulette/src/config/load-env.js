"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findApiRoot = findApiRoot;
exports.loadEnvFiles = loadEnvFiles;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
/** Find the @gp/api package root by walking up from `start` (works from src/ and from dist/src/). */
function findApiRoot(start = __dirname) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
        const pkg = (0, node_path_1.resolve)(dir, 'package.json');
        if ((0, node_fs_1.existsSync)(pkg)) {
            try {
                if (JSON.parse((0, node_fs_1.readFileSync)(pkg, 'utf8')).name === '@gp/api')
                    return dir;
            }
            catch {
                // keep walking
            }
        }
        const parent = (0, node_path_1.dirname)(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return process.cwd();
}
/**
 * Load apps/api/.env and global-pool/.env WITHOUT overriding variables that are already set
 * (docker / CI / test env wins). Missing files are skipped (production uses real env vars).
 */
function loadEnvFiles(apiRoot = findApiRoot()) {
    for (const file of [(0, node_path_1.resolve)(apiRoot, '.env'), (0, node_path_1.resolve)(apiRoot, '../../.env')]) {
        if ((0, node_fs_1.existsSync)(file))
            process.loadEnvFile(file);
    }
}
//# sourceMappingURL=load-env.js.map