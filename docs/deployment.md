# 当前发布状态：暂停对外发布

2026-10-02：用户要求仓库私有、撤下个人网站游戏子页，先在本地开发成熟后再决定开源。不得自动推送源码或恢复网站。以下步骤仅保留为未来获得明确发布授权后的参考。

# Publishing Gulou

- Source repository: https://github.com/wang-jiahao/gulou
- Public game: https://wang-jiahao.github.io/gulou/
- Source branch: `main`
- Website repository: `wang-jiahao/wang-jiahao.github.io`, `master` branch, `gulou/` subdirectory.

Build with `npm run build:pages`. This sets Vite's base to `/gulou/`, including asset, data, texture and model URLs. Copy the contents of `dist/` into the website repository’s `gulou/` directory, commit only this subdirectory (and an optional navigation link), then push its publishing branch. Do not copy local files or the source tree. The project repository and the existing academic homepage retain separate source histories.

The public music manifest intentionally contains no packaged commercial soundtrack. Players can import local audio in settings; the playlist is shuffled once per round and never immediately repeats a track when multiple tracks exist. Imported audio is never uploaded. Personal development playback is provided by an optional Vite middleware on loopback requests only.

Before release: typecheck, lint, asset integrity, the audio ordering test, and a browser check of the `/gulou/` build. Test the live URL after GitHub's Pages deployment completes. Original code is MIT; third-party resources retain their individual licenses.
