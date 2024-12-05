# niconama-recorder
ニコ生の配信ID (例: `lv123456789`) を指定して録画するツール

## 実行手順

ソースコードを落とす

```sh
git pull origin git@github.com:genkaieng/niconama-recorder.git
```

依存パッケージをインストール
```sh
pnpm i
```

### 生放送録画
配信IDを指定して録画開始
```sh
pnpm dev lv123456789
```



### タイムシフト録画

タイムシフトを録画するには、タイムシフトを見れるアカウントのセッションIDを渡す必要があります。

```sh
SESSION=<セッションID> pnpm dev lv123456789
```

#### セッションIDを取得するには

1. ブラウザで[ニコニコ生放送ページ](https://live.nicovideo.jp)を開いてログインする。
2. ブラウザの開発者ツールを開く(F12キー)
3. Cookiesタブで`https://live.nicovideo.jp`のCookieの中からキー名`user_session`の値を取り出す<br>
**※セッションIDは**`user_session_<ユーザーID>_<ランダムな文字列>`**の形になってます。**
