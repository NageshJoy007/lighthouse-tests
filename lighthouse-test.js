const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const config = require('lighthouse/lighthouse-core/config/lr-desktop-config.js');
const fs = require('fs');
const reportGenerator = require('lighthouse/lighthouse-core/report/report-generator');

function launchChromeAndRunLighthouse(url, opts, config) {
    return chromeLauncher.launch(opts).then(chrome => {
        opts.port = chrome.port;
        return lighthouse(url, opts, config).then(results => {
            return chrome.kill().then(() => results)
      
        });  
    });
}

const opts = {
       chromeFlags: ['--disable-mobile-emulation']
};

// Usage:
launchChromeAndRunLighthouse('https://facebook.com', opts, config).then(results => {
    fs.writeFile('reports/LoginPage.html', reportGenerator.generateReport(results.lhr, 'html'), (err) => {
        if (err) {
            console.error(err);
        }
    });
    fs.writeFile('reports/LoginPage.json', reportGenerator.generateReport(results.lhr, 'json'), (err) => {
        if (err) {
            console.error(err);
        }
    });
});

