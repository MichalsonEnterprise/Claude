import { createConfig } from '../../eslint.config.mjs';

export default createConfig({ tsconfigRootDir: import.meta.dirname, typeChecked: true });
