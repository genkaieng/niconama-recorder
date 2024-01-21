import "dotenv/config";

import path from "path";
import WebSocket from "ws";
import axios, { AxiosHeaders } from "axios";
import ffmpeg from "fluent-ffmpeg";

const session = process.env["SESSION"];

// 録画ファイルの出力先ディレクトリ
const outputDir = path.join(__dirname, "../output");

const args = process.argv;
const lvid = args.pop();
console.log("LVID:", lvid);

if (!lvid || !/lv\d+/.test(lvid)) {
  console.error("LVIDを指定してください。");
  process.exit(1);
}

async function run(lvid: string) {
  let RECORDING = false;

  const wsUri = await getWebSocketUri(lvid);
  if (!wsUri) {
    console.error("ERROR", "WebSocketのUri取得失敗。");
    process.exit(1);
  }

  const ws = new WebSocket(wsUri);
  ws.on("open", () => {
    ws.send(startWatch);
    console.info("INFO", "ws:", `⇑ ${startWatch}`);
  });
  ws.on("message", (data) => {
    console.info("INFO", `ws: ⇓ ${data}`);
    const msg = JSON.parse(data.toString());
    switch (msg.type) {
      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        console.info("INFO", "ws:", `⇑ {"type":"pong"}`);
        break;
      case "seat": {
        const keepInterval = msg.data.keepIntervalSec * 1000;
        // keepSeatを送るループ
        (async () => {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            await wait(keepInterval);
            ws.send(JSON.stringify({ type: "keepSeat" }));
            console.info("INFO", "ws:", `⇑ {"type":"keepSeat"}`);
          }
        })();
        break;
      }
      case "stream": {
        const hlsUri = msg.data.uri;
        // 録画開始
        RECORDING = true;
        ffmpeg(hlsUri)
          .output(path.join(outputDir, `${lvid}.mp4`))
          .videoCodec("copy") // ビデオコーデックをコピー
          .audioCodec("copy") // オーディオコーデックをコピー
          .outputOptions("-bsf:a", "aac_adtstoasc") // オーディオビットストリームフィルタ
          .on("end", () => {
            console.info("INFO", "FFmpeg:", "end");
            RECORDING = false;
          })
          .on("codecData", (data) => {
            console.log("INFO", "FFmpeg:", JSON.stringify(data));
          })
          .on("progress", (progress) => {
            console.log("INFO", "FFmpeg:", JSON.stringify(progress));
          })
          .on("error", (err) => {
            console.error("ERROR", "FFmpeg:", err);
            process.exit(1);
          })
          .run();
        break;
      }
      case "disconnect":
        // 終了処理
        break;
    }
  });

  while (ws.readyState !== WebSocket.CLOSED || RECORDING) {
    await wait(1000);
  }

  console.log("🎉 DONE!");
  process.exit();
}

async function getWebSocketUri(lvid: string): Promise<string | undefined> {
  const headers = new AxiosHeaders({
    Accept: "*/*",
    "User-Agent":
      "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  });
  if (session) {
    headers.set("Cookie", `user_session=${session}`);
  }
  const res = await axios.get(`https://live.nicovideo.jp/watch/${lvid}`, {
    headers,
  });
  const match = res.data
    .match(/wss:\/\/[\w./?=+\-&#%]+/)?.[0]
    ?.replace("&quot", "");
  return match;
}

const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), duration);
  });

const startWatch = JSON.stringify({
  type: "startWatching",
  data: {
    stream: {
      quality: "abr",
      protocol: "hls+fmp4",
      latency: "low",
      chasePlay: false,
    },
    room: { protocol: "webSocket", commentable: true },
    reconnect: false,
  },
});

run(lvid);
