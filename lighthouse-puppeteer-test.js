const chromeLauncher = require('chrome-launcher');
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const config = require('lighthouse/lighthouse-core/config/lr-desktop-config.js');
const reportGenerator = require('lighthouse/lighthouse-core/report/report-generator');
const request = require('request');
const util = require('util');
const fs = require('fs');
const sleep = seconds =>
    new Promise(resolve => setTimeout(resolve, (seconds || 1) * 1000));
let scoresBelowBaseline=false;
let assert = require('assert');


const app_name = "MacEdAu";


(async () => {

    const loginURL = 'https://www.macmillaneducation.com.au/account/login';
    const logoutURL = 'https://www.macmillaneducation.com.au/account/logout';

    const opts = {
        logLevel: 'info',
        output: 'json',
        disableDeviceEmulation: true,
        defaultViewport: {
            width: 1200,
            height: 900
        },
        chromeFlags: ['--headless','--disable-mobile-emulation','--no-sandbox', '--disable-setuid-sandbox']
    };

// Launch chrome using chrome-launcher
    const chrome = await chromeLauncher.launch(opts);
    opts.port = chrome.port;

// Connect to it using puppeteer.connect().
    const resp = await util.promisify(request)(`http://localhost:${opts.port}/json/version`);
    const {webSocketDebuggerUrl} = JSON.parse(resp.body);
    const browser = await puppeteer.connect({browserWSEndpoint: webSocketDebuggerUrl});

    // Macmillan User WelcomePage
    page = (await browser.pages())[0];
    await page.setViewport({width: 1200, height: 900});
    await page.goto(loginURL, {waitUntil: 'networkidle2'});
    await sleep(4);
    await runLighthouseForURL(page.url(), opts, "LoginPage").catch( e => {
        console.error("LoginPage", e);
    });
    await sleep(2);
    await page.type('[id="customer_email"]', 'nagesh.agiletester@gmail.com');
    await page.type('[id="customer_password"]', 'Macmillan@175');
    await page.evaluate(() => {
        document.querySelector('.button-primary.form-action--submit').click();
    });
    await page.evaluate(() => {
        document.querySelector('a[href="/pages/about-us"]').click();
    });
    await page.waitForNavigation({waitUntil: 'networkidle2'});
    await sleep(4);
    await runLighthouseForURL(page.url(), opts, "AboutUsPage").catch( e => {
        console.error("WelcomePage", e);
    });

    //  user logout
    await page.goto(logoutURL, {waitUntil: 'networkidle2'});

    await browser.disconnect();
    await chrome.kill();


    try {
        assert.equal(scoresBelowBaseline, false, 'One of the scores was found below baseline. Failing test');
    } catch (error) {
        console.error('Failing Test: One of the scores was found below baseline. Failing test');
        process.exit(1);
    }

})().catch( e => {
    console.error(e);
    process.exit(1);
});



async function runLighthouseForURL(pageURL, opts, reportName) {

    const reportNameForFile = reportName.replace(/\s/g, '');

    let scores = {Performance: 0, Accessibility: 0, "Best Practices": 0, SEO: 0};
    let slackArray = [];

    const report = await lighthouse(pageURL, opts, config).then(results => {
        return results;
    });
    const html = reportGenerator.generateReport(report.lhr, 'html');
    const json = reportGenerator.generateReport(report.lhr, 'json');
    scores.Performance = JSON.parse(json).categories.performance.score;
    scores.Accessibility = JSON.parse(json).categories.accessibility.score;
    scores["Best Practices"] = JSON.parse(json)["categories"]["best-practices"]["score"];
    scores.SEO = JSON.parse(json).categories.seo.score;

    console.log(scores);

    let baselineScores = {
        "Performance": 0.50,
        "Accessibility": 0.60,
        "Best Practices": 0.60,
        "SEO": 0.60
    };

    fs.writeFile('reports/ReportHTML-' + reportNameForFile + '.html', html, (err) => {
        if (err) {
            console.error(err);
        }
    });

    fs.writeFile('reports/ReportJSON-' + reportNameForFile + '.json', json, (err) => {
        if (err) {
            console.error(err);
        }
    });

   let BreakException = {};
    let SlackHeadline = "Default Headline";

    try {
        Object.keys(baselineScores).forEach(key => {
            let baselineValue = baselineScores[key];
            

            if (scores[key] != null && baselineValue > scores[key]) {
                Object.keys(baselineScores).forEach(key => {
                    const scorePercent=scores[key]*100;
                    slackArray.push({title: `${key}`, value: `${scorePercent}%`, short: true});
                });
                console.log(slackArray);
                console.log(`${app_name}: ` + key + " score " + scores[key]*100 + "% for " + reportName + " is less than the defined baseline of " + baselineValue*100 + "%");
                SlackHeadline = `*${app_name}:* _` + key + `_ score for <${pageURL}|` + reportName + "> below " + baselineValue*100 + "%";
                throw BreakException;
            }
        });
    } catch (e) {
        if (e !== BreakException) throw e;
    }
   

    
     
}