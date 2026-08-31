# Open Source Dependency & Licensing Audit

All dependencies used in the Secure Examination System are free, permissive open-source software compatible with commercial and educational distribution.

| Package Name | Version | License | Purpose | Repository / Source |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | v20+ / v24+ | MIT | Core runtime | [nodejs/node](https://github.com/nodejs/node) |
| **Electron** | ^28.2.0 | MIT | Desktop application shell & hardened Chromium engine | [electron/electron](https://github.com/electron/electron) |
| **Fastify** | ^4.26.1 | MIT | High-performance backend server framework | [fastify/fastify](https://github.com/fastify/fastify) |
| **@fastify/cors** | ^9.0.1 | MIT | Cross-Origin Resource Sharing plugin for Fastify | [fastify/fastify-cors](https://github.com/fastify/fastify-cors) |
| **@fastify/websocket** | ^9.0.0 | MIT | WebSocket real-time telemetry streaming | [fastify/fastify-websocket](https://github.com/fastify/fastify-websocket) |
| **Zod** | ^3.22.4 | MIT | TypeScript-first schema declaration and validation | [colinhacks/zod](https://github.com/colinhacks/zod) |
| **Koffi** | ^2.8.11 | MIT | Fast, C-compatible FFI for native Win32 API calls | [korora/koffi](https://github.com/korora/koffi) |
| **Commander** | ^12.0.0 | MIT | Command-line interface framework for config tool | [tj/commander.js](https://github.com/tj/commander.js) |
| **TypeScript** | ^5.3.3 | Apache-2.0 | Static type checking and compiler | [microsoft/TypeScript](https://github.com/microsoft/TypeScript) |
| **Vitest** | ^1.2.1 | MIT | Next-generation testing framework | [vitest-dev/vitest](https://github.com/vitest-dev/vitest) |
| **Vite** | ^5.0.12 | MIT | Frontend development server & bundler | [vitejs/vite](https://github.com/vitejs/vite) |

---

## Clean-Room Independence Notice
- This codebase contains **zero** proprietary code, assets, trademarks, or copyrighted files from Safe Exam Browser (SEB).
- All architectures, schemas, UI components, cryptography, and Win32 hook implementations were authored independently from scratch to meet modern cybersecurity standards.
