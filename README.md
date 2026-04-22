# 视唱练耳 · 上下行

一个最小可用的视唱练耳网页应用：随机播放几个音（多种乐器音色），由用户判断每相邻两音是上行 ↑ 还是下行 ↓，提交后揭示答案。

## 技术栈

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- [Tone.js](https://tonejs.github.io/) — Web Audio 之上的音乐库
- [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) 真实乐器采样（在线加载）

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)。

## 构建

```bash
npm run build
npm run preview
```

## 部署到 Vercel

仓库根目录已经包含 `vercel.json`，框架预设为 Vite。两种方式任选：

**A. CLI**

```bash
npm i -g vercel
vercel        # 首次会引导登录 + 关联项目
vercel --prod # 部署到生产环境
```

**B. GitHub 接入**

把仓库推到 GitHub，然后在 [vercel.com/new](https://vercel.com/new) 导入仓库即可，构建命令和输出目录会自动识别。
