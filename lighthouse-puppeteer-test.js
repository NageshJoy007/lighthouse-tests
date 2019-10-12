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


const MY_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/<webhookKey>';


const app_name = "MacEdAu";


(async () => {

    const loginURL = 'https://www.macmillaneducation.com.au/account/login';
    const logoutURL = 'https://www.macmillaneducation.com.au/account/logout';

    const PORT = 8041;
    const opts = {port: PORT}

// Launch chrome using puppeteer
      
    const browser = await puppeteer.launch({
      args: [`--remote-debugging-port=${PORT}`,`--no-sandbox`, `--disable-setuid-sandbox`, `--disable-gpu`],
      // Optional, if you want to see the tests in action.
      headless: true,
      defaultViewport : {
        width : 1200,
        height: 900,
        isMobile : false
      },
      // slowMo: 50,
      devtools: true
    });


// Macmillan User WelcomePage
    console.log("starting with tests")
    page = await browser.newPage();
    await page.goto(loginURL, {waitUntil: 'networkidle2'});
    await sleep(4);
    await runLighthouseForURL(page.url(), opts, "Login Page");
    await page.type('[id="customer_email"]', 'youremailid');
    await page.type('[id="customer_password"]', 'yourpassword');
    await page.evaluate(() => {
        document.querySelector('.button-primary.form-action--submit').click();
    });
    await page.waitForNavigation({waitUntil: 'networkidle2'});
    console.log(page.url())
    await runLighthouseForURL(page.url(), opts, "Welcome Page");

    // Search Results Page
    await page.type('[name="q"]', '9781420240238');
    await page.evaluate(() => {
        document.querySelector('[type="submit"]').click();
    });
    await page.waitForNavigation();
    await runLighthouseForURL(page.url(), opts, "Search Results Page");

// Product Details Page
    await page.evaluate(() => {
        document.querySelector('.productitem--image').click();
    });
    await page.waitForNavigation();
     console.log(page.url())
    await runLighthouseForURL(page.url(), opts, "Product Details Page");


//  User logout
    await page.goto(logoutURL, {waitUntil: 'networkidle2'});

//Close browser
    await page.close();
    await browser.close();


//Asert on scores
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
        "Performance": 0.90,
        "Accessibility": 0.90,
        "Best Practices": 0.90,
        "SEO": 0.90
    };

    // Generate reports 
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
   
    // Sending alerts on slack in case of low scores/ test failure
    if (slackArray.length) {
        request.post( MY_SLACK_WEBHOOK_URL, {
                    json: {
                        attachments: [
                            {
                                pretext: `${SlackHeadline}`,
                                fallback: 'Nothing to show here',
                                color: "#ffdb8e",
                                fields: slackArray,
                                "footer": `Lighthouse Tests | ${reportName}`,
                                "footer_icon": "https://developers.google.com/web/progressive-web-apps/images/pwa-lighthouse.png"
                            }
                        ]
                    }
        }, (error, res, body) => {
        if (error) {
            console.error(error)
            return
        }
        console.log(`statusCode: ${res.statusCode}`)
        console.log(body)
        })
        scoresBelowBaseline = true;
        console.log("Slack alert sent coz scores below baseline");
    }

    
     
}