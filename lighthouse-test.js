const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const config = require('lighthouse/lighthouse-core/config/lr-desktop-config.js');
const fs = require('fs');
const reportGenerator = require('lighthouse/lighthouse-core/report/report-generator');

function launchChromeAndRunLighthouse(url, opts, config) {
    return chromeLauncher.launch(opts).then(chrome => {
        opts.port = chrome.port;
        return lighthouse(url, opts, config).then(results => {
            return chrome.kill().then(() => results.lhr)
      
        });  
    });
}

const opts = {
       chromeFlags: ['--disable-mobile-emulation']
};

// Usage:
launchChromeAndRunLighthouse('https://facebook.com', opts, config).then(results => {
    const htmlReport = reportGenerator.generateReport(results,'html')
    const jsonReport = reportGenerator.generateReport(results,'json')
    
    fs.writeFile('reports/LoginPage.html', htmlReport, (err) => {
        if (err) {
            console.error(err);
        }
    });
    fs.writeFile('reports/LoginPage.json', jsonReport, (err) => {
        if (err) {
            console.error(err);
        }
    });
});

