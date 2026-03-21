(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__8978dbac._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/src/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
const PROTECTED = [
    "/vehicles",
    "/calendar",
    "/settings",
    "/profile"
];
const AUTH_PAGES = [
    "/login"
]; // можеш да добавиш и /register ако имаш отделно
function middleware(req) {
    const { pathname } = req.nextUrl;
    const access = req.cookies.get("access_token")?.value;
    const refresh = req.cookies.get("refresh_token")?.value;
    // ✅ ако има refresh, приеми че сесията може да се възстанови
    const isAuthed = !!access || !!refresh;
    const isProtected = PROTECTED.some((p)=>pathname === p || pathname.startsWith(p + "/"));
    const isAuthPage = AUTH_PAGES.some((p)=>pathname === p || pathname.startsWith(p + "/"));
    // 1) ако няма access И няма refresh и отваря protected -> login
    if (!isAuthed && isProtected) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url);
    }
    // 2) ако е "authed" (има access или refresh) и отваря login -> vehicles
    if (isAuthed && isAuthPage) {
        const url = req.nextUrl.clone();
        url.pathname = "/vehicles";
        url.searchParams.delete("next");
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url);
    }
    // 3) landing
    if (isAuthed && pathname === "/") {
        const url = req.nextUrl.clone();
        url.pathname = "/vehicles";
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url);
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        "/",
        "/login",
        "/vehicles/:path*",
        "/calendar/:path*",
        "/settings/:path*",
        "/profile/:path*"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__8978dbac._.js.map