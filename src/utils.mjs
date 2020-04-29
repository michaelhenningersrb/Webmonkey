import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import R from 'ramda';
import * as actions from './actions/index.mjs';
import presets from './helpers/network-presets.mjs';

const getCDPSession = R.once((page) => page.target().createCDPSession());

const defaultNetworkConditions = R.find(R.propEq('label', 'Regular 4G'))(
    presets
);

export function runAction(action, params) {
    if (!R.isNil(action)) return actions[action](params);

    const keys = Object.keys(actions);
    const count = keys.length;
    const name = keys[Math.floor(Math.random() * count)];
    return actions[name](params);
}

export function silenceDialogs(page) {
    page.exposeFunction('print', R.identity);
}

export function exposeFunctions(page) {
    page.exposeFunction('randomBetween', randomBetween);
    page.exposeFunction('fiftyFifty', fiftyFifty);
}

export function pageDimensions(page) {
    return page.evaluate(() => ({
        height: window.innerHeight,
        width: window.innerWidth,
    }));
}

export async function emulateNetworkConditions(
    page,
    conditions = defaultNetworkConditions
) {
    const client = await getCDPSession(page);
    return client.send(
        'Network.emulateNetworkConditions',
        R.dissoc('label')(conditions)
    );
}

export function handleDialogs(page) {
    page.on('dialog', (dialog) => {
        if (dialog.type() === 'beforeunload') {
            return dialog.dismiss();
        }
        const f = fiftyFifty() ? 'accept' : 'dismiss';
        return dialog[f];
    });
}

export function preventNavigation(page) {
    return page.evaluate(() => {
        window.history.pushState = () => {};
        window.history.replaceState = () => {};

        window.onbeforeunload = () => {
            return 'You are not going anywhere...';
        };
    });
}

export function allowNavigation(page) {
    return page.evaluate(() => {
        window.onbeforeunload = () => {};
    });
}

export function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function fiftyFifty() {
    return Math.random() > 0.5;
}

export function writeTemplate(config, actions) {
    const writeFile = promisify(fs.writeFile);

    return writeFile(
        path.join(config.report, 'history.json'),
        JSON.stringify(
            {
                url: config.url,
                actions: [...actions],
            },
            null,
            '\t'
        )
    );
}
