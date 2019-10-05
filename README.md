#  Lighthouse-Tests
Run Google Lighthouse programmatically and generate reports to measure performance, accessibility, and security on the fly.

### What is Lighthouse?
[Google Lighthouse](https://developers.google.com/web/tools/lighthouse/) is an open-source, automated tool for improving the quality of web pages. It has audits for performance, accessibility, best practices, seo, and progressive web apps.

<img src ="https://developers.google.com/web/progressive-web-apps/images/pwa-lighthouse.png" height = "110">

### Setup 
Install node via `brew install node`  Or download [Node.js](https://nodejs.org/en/download/)

Do `npm install` to download all project dependencies

### Run Tests
`node <filename.js>`

eg: `node lighthouse-test.js` - It will run a test against a single url

eg: `node lighthouse-puppeteer-test.js` - It will run a test against multiple urls with in a journey by interacting with page elements using puppeeteer and will send a slack alert in case of test fail

### Output
./reports folder -  HTML, JSON Reports 
