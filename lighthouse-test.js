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
       chromeFlags: ['--headless','--disable-mobile-emulation','--no-sandbox', '--disable-setuid-sandbox']
};

// Usage:
launchChromeAndRunLighthouse('https://www.macmillaneducation.com.au/account/login', opts, config).then(results => {
    const htmlReport = reportGenerator.generateReport(results,'html')
    const jsonReport = reportGenerator.generateReport(results,'json')
    
    fs.writeFile('reports/ReportHTML-LoginPage.html', htmlReport, (err) => {
        if (err) {
            console.error(err);
        }
    });
    fs.writeFile('reports/ReportJSON-LoginPage.json', jsonReport, (err) => {
        if (err) {
            console.error(err);
        }
    });
});