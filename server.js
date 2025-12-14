const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const FRONT_PORT = Number(process.env.PORT || 3000);
const API_PORT = Number(process.env.API_PORT || 4000);

const ROOT = process.cwd();
const BUILD_DIR = path.join(ROOT, "build");
const DB_PATH = path.join(ROOT, "db.json");

function exists(p) {
    try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

function readFileSafe(p) {
    return fs.promises.readFile(p);
}

function send(res, status, headers, body) {
    res.writeHead(status, headers);
    res.end(body);
}

function sendJson(res, status, obj) {
    const body = Buffer.from(JSON.stringify(obj, null, 2));
    send(res, status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": body.length,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }, body);
}

function sendText(res, status, text) {
    const body = Buffer.from(String(text));
    send(res, status, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": body.length,
    }, body);
}

function contentTypeByExt(ext) {
    switch (ext) {
        case ".html": return "text/html; charset=utf-8";
        case ".js": return "application/javascript; charset=utf-8";
        case ".css": return "text/css; charset=utf-8";
        case ".json": return "application/json; charset=utf-8";
        case ".png": return "image/png";
        case ".jpg":
        case ".jpeg": return "image/jpeg";
        case ".svg": return "image/svg+xml; charset=utf-8";
        case ".ico": return "image/x-icon";
        case ".txt": return "text/plain; charset=utf-8";
        case ".map": return "application/json; charset=utf-8";
        case ".woff": return "font/woff";
        case ".woff2": return "font/woff2";
        default: return "application/octet-stream";
    }
}

async function readBodyJson(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf-8").trim();
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch { return "__INVALID_JSON__"; }
}

function ensureDbShape(db) {
    if (!db || typeof db !== "object") db = {};
    if (!Array.isArray(db.timetables)) db.timetables = [];
    if (!Array.isArray(db.subjects)) db.subjects = [];
    return db;
}

function readDb() {
    if (!exists(DB_PATH)) {
        const init = ensureDbShape({});
        fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2), "utf-8");
        return init;
    }
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    let db = {};
    try { db = JSON.parse(raw); } catch { db = {}; }
    return ensureDbShape(db);
}

function writeDb(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function nextId(arr) {
    let m = 0;
    for (const it of arr) {
        const id = Number(it?.id);
        if (Number.isFinite(id)) m = Math.max(m, id);
    }
    return m + 1;
}

function matchQuery(item, searchParams) {
    for (const [k, v] of searchParams.entries()) {
        if (k.startsWith("_")) continue;
        if (String(item?.[k]) !== String(v)) return false;
    }
    return true;
}

function applySortLimit(list, searchParams) {
    const sortKey = searchParams.get("_sort");
    const order = (searchParams.get("_order") || "asc").toLowerCase();
    const limit = Number(searchParams.get("_limit"));

    let out = [...list];
    if (sortKey) {
        out.sort((a, b) => {
            const av = a?.[sortKey];
            const bv = b?.[sortKey];
            if (av === bv) return 0;
            const r = av > bv ? 1 : -1;
            return order === "desc" ? -r : r;
        });
    }
    if (Number.isFinite(limit) && limit > 0) out = out.slice(0, limit);
    return out;
}

function parseIdFromPath(p, base) {
    const rest = p.slice(base.length);
    if (!rest || rest === "/") return null;
    const m = rest.match(/^\/(\d+)(?:\/)?$/);
    return m ? Number(m[1]) : NaN;
}

const apiServer = http.createServer(async (req, res) => {
    try {
        // CORS preflight
        if (req.method === "OPTIONS") {
            return send(res, 204, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "600",
            }, "");
        }

        const url = new URL(req.url, `http://127.0.0.1:${API_PORT}`);
        const p = url.pathname;

        if (p === "/" || p === "/health") {
            return sendJson(res, 200, { ok: true, apiPort: API_PORT, db: path.basename(DB_PATH) });
        }

        const db = readDb();

        const collections = [
            { name: "timetables", base: "/timetables" },
            { name: "subjects", base: "/subjects" },
        ];

        const col = collections.find(c => p === c.base || p.startsWith(c.base + "/"));
        if (!col) return sendJson(res, 404, { error: "Not Found", path: p });

        const list = db[col.name];
        const id = parseIdFromPath(p, col.base);

        if (req.method === "GET" && (id === null)) {
            const filtered = list.filter(it => matchQuery(it, url.searchParams));
            const out = applySortLimit(filtered, url.searchParams);
            return sendJson(res, 200, out);
        }

        if (req.method === "GET" && Number.isFinite(id)) {
            const found = list.find(it => Number(it.id) === id);
            if (!found) return sendJson(res, 404, { error: "Not Found", id });
            return sendJson(res, 200, found);
        }

        if (req.method === "POST" && (id === null)) {
            const body = await readBodyJson(req);
            if (body === "__INVALID_JSON__") return sendJson(res, 400, { error: "Invalid JSON" });
            const item = body && typeof body === "object" ? body : {};
            if (item.id == null) item.id = nextId(list);
            list.push(item);
            writeDb(db);
            return sendJson(res, 201, item);
        }

        if (req.method === "PUT" && Number.isFinite(id)) {
            const body = await readBodyJson(req);
            if (body === "__INVALID_JSON__") return sendJson(res, 400, { error: "Invalid JSON" });
            const idx = list.findIndex(it => Number(it.id) === id);
            if (idx < 0) return sendJson(res, 404, { error: "Not Found", id });
            const next = (body && typeof body === "object") ? body : {};
            next.id = id;
            list[idx] = next;
            writeDb(db);
            return sendJson(res, 200, next);
        }

        if (req.method === "PATCH" && Number.isFinite(id)) {
            const body = await readBodyJson(req);
            if (body === "__INVALID_JSON__") return sendJson(res, 400, { error: "Invalid JSON" });
            const idx = list.findIndex(it => Number(it.id) === id);
            if (idx < 0) return sendJson(res, 404, { error: "Not Found", id });
            const patch = (body && typeof body === "object") ? body : {};
            const merged = { ...list[idx], ...patch, id };
            list[idx] = merged;
            writeDb(db);
            return sendJson(res, 200, merged);
        }

        if (req.method === "DELETE" && Number.isFinite(id)) {
            const idx = list.findIndex(it => Number(it.id) === id);
            if (idx < 0) return sendJson(res, 404, { error: "Not Found", id });
            const removed = list.splice(idx, 1)[0];
            writeDb(db);
            return sendJson(res, 200, removed);
        }

        return sendJson(res, 405, { error: "Method Not Allowed", method: req.method, path: p });
    } catch (e) {
        console.error(e);
        return sendJson(res, 500, { error: "Internal Server Error", message: String(e?.message || e) });
    }
});

const frontServer = http.createServer(async (req, res) => {
    try {
        if (!exists(BUILD_DIR)) {
            return sendText(
                res,
                500,
                "build/ 폴더가 없습니다.\n\n1) npm install\n2) npm run build\n\n이후 node server.cjs 로 실행하세요."
            );
        }

        const url = new URL(req.url, `http://127.0.0.1:${FRONT_PORT}`);
        let p = decodeURIComponent(url.pathname);

        p = p.replace(/\\/g, "/");
        if (p.includes("..")) return sendText(res, 400, "Bad Request");

        let filePath = path.join(BUILD_DIR, p);

        if (exists(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, "index.html");
        }

        if (exists(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const buf = await readFileSafe(filePath);
            return send(res, 200, {
                "Content-Type": contentTypeByExt(ext),
                "Content-Length": buf.length,
                "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
            }, buf);
        }

        const isGet = req.method === "GET";
        const hasExt = path.extname(p) !== "";
        if (isGet && !hasExt) {
            const indexPath = path.join(BUILD_DIR, "index.html");
            const buf = await readFileSafe(indexPath);
            return send(res, 200, {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Length": buf.length,
                "Cache-Control": "no-cache",
            }, buf);
        }

        return sendText(res, 404, "Not Found");
    } catch (e) {
        console.error(e);
        return sendText(res, 500, "Server Error: " + String(e?.message || e));
    }
});

frontServer.listen(FRONT_PORT, "127.0.0.1", () => {
    console.log(`[front] http://127.0.0.1:${FRONT_PORT}`);
    console.log(`[front] serving: ${BUILD_DIR}`);
});

apiServer.listen(API_PORT, "127.0.0.1", () => {
    console.log(`[api]   http://127.0.0.1:${API_PORT}`);
    console.log(`[api]   db: ${DB_PATH}`);
});

