const puppeteer = require('puppeteer');
const { htmlToText } = require('html-to-text');
const inquirer = require('inquirer');
const Entities = require('html-entities').AllHtmlEntities;

const entities = new Entities();

let textOutput = '';
let storyChoices = [];
const c = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",

    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",

    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m",
}
const render = async function(page) {
    await page.waitForSelector('body > div:nth-child(3)');
    // const elements = await page.$$('body > div:nth-child(3) p');
    // textOutput = '';
    // for (const element of elements) {
    //     const text = await page.evaluate(element =>
    //         element.innerHTML, element);
    //     textOutput = textOutput += (text + '<br />');
    // }
    textOutput = '';
    const element = await page.$('body > div:nth-child(3) > div:nth-child(1)');
    const text = await page.evaluate(element =>
        element.innerHTML, element);
    textOutput = text
        .replace(/<u>/g, `<u>${c.Underscore}`)
        .replace(/<\/u>/g, `<\/u>${c.Reset}`)
        .replace(/[“|”]([^”]*)[“|”]/g, m =>
            `${c.FgYellow}"${m.substring(1, m.length - 1)}"${c.Reset}`)
        // .replace(/“/g, `${c.FgYellow}"`)
        // .replace(/”/g, `"${c.Reset}`)
        // .replace(/[A-Z]{2,}/g, m => `${c.FgMagenta}${m}${c.Reset}`);

    await page.waitForSelector('body > div:nth-child(3) ul');
    const choiceList = await page.$$('body > div:nth-child(3) ul li');
    storyChoices = [];
    let i = 1;
    for (const choice of choiceList) {
        let a = await page.evaluate(choice =>
            choice.textContent, choice);
        let li = await page.evaluate(choice =>
            choice.innerHTML, choice);
        if (entities.decode(li.trim()) === entities.decode(a.trim())) {
            a = '[chosen] ' + a.trim();
        }
        storyChoices.push(entities.decode(`${i} - ${a.trim()}`));
        i++;
    }
    storyChoices.push('Exit');

    const header = await page.$('h1');
    let headerText = '';
    if (header) {
        headerText = await page.evaluate(header => header.innerHTML, header);
    }
    console.info(`${c.Underscore}%s${c.Reset}`, headerText);
    console.info(`${c.FgWhite}%s${c.Reset}`, entities.decode(htmlToText.fromString(textOutput)));
    inquirer.prompt([{
        type: 'list',
        name: 'storyChoice',
        message: 'Your choice?',
        choices: storyChoices
    }]).then(async answers => {
        // console.info(`You chose: ${answers.storyChoice}`);
        if (answers.storyChoice === 'Exit') {
            // process.kill(process.pid, 'SIGTERM');
            process.exit(0);
        } else {
            let answerIndex = answers.storyChoice.match(/\d+/g)[0];
            let choiceLink = await page.$(`body > div:nth-child(3) ul > li:nth-child(${answerIndex}) a`);
            if (choiceLink)
                await choiceLink.click();
            await render(page);
        }
    });
}

puppeteer.launch({
    headless: true
}).then(async browser => {
    process.on('SIGTERM', async() => {
        await browser.close();
        console.log('Process terminated...');
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 })
            //10638
        await page.goto('https://chooseyourstory.com/story/viewer/default.aspx?StoryId=10638');
        await render(page);
    } catch (err) {
        console.error(err);
        process.kill(process.pid, 'SIGTERM');
    }
});