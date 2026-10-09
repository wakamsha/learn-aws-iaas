// 学習用の最小 API サーバー（依存パッケージなし）
// Dockerfile は学習者がレッスン 09 で自分で書く。
import { createServer } from "node:http";
import { hostname } from "node:os";

const PORT = Number(process.env.PORT ?? 3000);
const VERSION = process.env.APP_VERSION ?? "dev";
const startedAt = new Date();

// 構造化ログ（1 行 1 JSON）。レッスン 13 の Logs Insights で使う
const log = (level, msg, extra = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level, msg, ...extra }));

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const started = performance.now();

  res.on("finish", () => {
    log("info", "request", {
      method: req.method,
      path: url.pathname,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - started),
    });
  });

  switch (url.pathname) {
    // ロードバランサーのヘルスチェック用
    case "/health":
      return send(res, 200, { status: "ok" });

    // どのタスク / インスタンスが応答したかを確認する
    case "/api/info":
      return send(res, 200, {
        hostname: hostname(),
        version: VERSION,
        startedAt: startedAt.toISOString(),
        uptimeSec: Math.round(process.uptime()),
      });

    // 遅い応答（タイムアウト・504・レイテンシのアラームの実験用）例: /api/slow?ms=5000
    case "/api/slow": {
      const ms = Math.min(Number(url.searchParams.get("ms") ?? 3000), 120_000);
      await new Promise((r) => setTimeout(r, ms));
      return send(res, 200, { sleptMs: ms });
    }

    // 500 エラー（5xx アラームの実験用）
    case "/api/error":
      log("error", "intentional error");
      return send(res, 500, { error: "intentional error" });

    default:
      return send(res, 404, { error: "not found" });
  }
});

server.listen(PORT, () => log("info", "server started", { port: PORT, version: VERSION }));

// ECS はタスク停止時に SIGTERM を送り、猶予時間後に SIGKILL する。
// 新規接続の受付を止め、処理中のリクエストを終えてから終了する。
const shutdown = (signal) => {
  log("info", "shutdown requested", { signal });
  server.close(() => {
    log("info", "server closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
