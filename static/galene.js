// Copyright (c) 2020 by Juliusz Chroboczek.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

/** @type {string} */
let group;

/** @type {ServerConnection} */
let serverConnection;

/** @type {Object} */
let groupStatus = {};

/** @type {string} */
let token = null;

/**
 * @typedef {Object} settings
 * @property {boolean} [localMute]
 * @property {string} [video]
 * @property {string} [audio]
 * @property {string} [simulcast]
 * @property {string} [send]
 * @property {string} [request]
 * @property {boolean} [activityDetection]
 * @property {Array.<number>} [resolution]
 * @property {boolean} [mirrorView]
 * @property {boolean} [blackboardMode]
 * @property {string} [filter]
 * @property {boolean} [preprocessing]
 * @property {boolean} [hqaudio]
 * @property {boolean} [forceRelay]
 */

/** @type{settings} */
let fallbackSettings = null;

/**
 * @param {settings} settings
 */
function storeSettings(settings) {
    try {
        window.sessionStorage.setItem('settings', JSON.stringify(settings));
        fallbackSettings = null;
    } catch(e) {
        console.warn("Couldn't store settings:", e);
        fallbackSettings = settings;
    }
}

/**
 * This always returns a dictionary.
 *
 * @returns {settings}
 */
function getSettings() {
    /** @type {settings} */
    let settings;
    try {
        let json = window.sessionStorage.getItem('settings');
        settings = JSON.parse(json);
    } catch(e) {
        console.warn("Couldn't retrieve settings:", e);
        settings = fallbackSettings;
    }
    return settings || {};
}

/**
 * @param {settings} settings
 */
function updateSettings(settings) {
    let s = getSettings();
    for(let key in settings)
        s[key] = settings[key];
    storeSettings(s);
}

/**
 * @param {string} key
 * @param {any} value
 */
function updateSetting(key, value) {
    let s = {};
    s[key] = value;
    updateSettings(s);
}

/**
 * @param {string} key
 */
function delSetting(key) {
    let s = getSettings();
    if(!(key in s))
        return;
    delete(s[key]);
    storeSettings(s);
}

/**
 * @param {string} id
 */
function getSelectElement(id) {
    let elt = document.getElementById(id);
    if(!elt || !(elt instanceof HTMLSelectElement))
        throw new Error(`Couldn't find ${id}`);
    return elt;
}

/**
 * @param {string} id
 */
function getInputElement(id) {
    let elt = document.getElementById(id);
    if(!elt || !(elt instanceof HTMLInputElement))
        throw new Error(`Couldn't find ${id}`);
    return elt;
}

/**
 * @param {string} id
 */
function getButtonElement(id) {
    let elt = document.getElementById(id);
    if(!elt || !(elt instanceof HTMLButtonElement))
        throw new Error(`Couldn't find ${id}`);
    return elt;
}

function reflectSettings() {
    let settings = getSettings();
    let store = false;

    setLocalMute(settings.localMute);

    let videoselect = getSelectElement('videoselect');
    if(!settings.hasOwnProperty('video') ||
       !selectOptionAvailable(videoselect, settings.video)) {
        settings.video = selectOptionDefault(videoselect);
        store = true;
    }
    videoselect.value = settings.video;

    let audioselect = getSelectElement('audioselect');
    if(!settings.hasOwnProperty('audio') ||
       !selectOptionAvailable(audioselect, settings.audio)) {
        settings.audio = selectOptionDefault(audioselect);
        store = true;
    }
    audioselect.value = settings.audio;

    if(settings.hasOwnProperty('filter')) {
        getSelectElement('filterselect').value = settings.filter;
    } else {
        let s = getSelectElement('filterselect').value;
        if(s) {
            settings.filter = s;
            store = true;
        }
    }

    if(settings.hasOwnProperty('request')) {
        getSelectElement('requestselect').value = settings.request;
    } else {
        settings.request = getSelectElement('requestselect').value;
        store = true;
    }

    if(settings.hasOwnProperty('send')) {
        getSelectElement('sendselect').value = settings.send;
    } else {
        settings.send = getSelectElement('sendselect').value;
        store = true;
    }

    if(settings.hasOwnProperty('simulcast')) {
        getSelectElement('simulcastselect').value = settings.simulcast
    } else {
        settings.simulcast = getSelectElement('simulcastselect').value;
        store = true;
    }

    if(settings.hasOwnProperty('blackboardMode')) {
        getInputElement('blackboardbox').checked = settings.blackboardMode;
    } else {
        settings.blackboardMode = getInputElement('blackboardbox').checked;
        store = true;
    }

    if(settings.hasOwnProperty('mirrorView')) {
        getInputElement('mirrorbox').checked = settings.mirrorView;
    } else {
        settings.mirrorView = getInputElement('mirrorbox').checked;
        store = true;
    }

    if(settings.hasOwnProperty('activityDetection')) {
        getInputElement('activitybox').checked = settings.activityDetection;
    } else {
        settings.activityDetection = getInputElement('activitybox').checked;
        store = true;
    }

    if(settings.hasOwnProperty('preprocessing')) {
        getInputElement('preprocessingbox').checked = settings.preprocessing;
    } else {
        settings.preprocessing = getInputElement('preprocessingbox').checked;
        store = true;
    }

    if(settings.hasOwnProperty('hqaudio')) {
        getInputElement('hqaudiobox').checked = settings.hqaudio;
    } else {
        settings.hqaudio = getInputElement('hqaudiobox').checked;
        store = true;
    }

    if(store)
        storeSettings(settings);
}

function isMobileLayout() {
    if (window.matchMedia('only screen and (max-width: 1024px)').matches)
        return true;
    return false;
}

/**
 * @param {boolean} [force]
 */
function hideVideo(force) {
    let mediadiv = document.getElementById('peers');
    if(mediadiv.childElementCount > 0 && !force)
        return;
    setVisibility('video-container', false);
    scheduleReconsiderDownRate();
}

function showVideo() {
    let hasmedia = document.getElementById('peers').childElementCount > 0;
    if(isMobileLayout()) {
        setVisibility('show-video', false);
        setVisibility('collapse-video', hasmedia);
    }
    setVisibility('video-container', hasmedia);
    scheduleReconsiderDownRate();
}

/**
  * @param{boolean} connected
  */
function setConnected(connected) {
    let userbox = document.getElementById('profile');
    let connectionbox = document.getElementById('login-container');
    if(connected) {
        clearChat();
        userbox.classList.remove('invisible');
        connectionbox.classList.add('invisible');
        displayUsername();
        window.onresize = function(e) {
            scheduleReconsiderDownRate();
        }
    } else {
        userbox.classList.add('invisible');
        connectionbox.classList.remove('invisible');
        displayError('Disconnected', 'error');
        hideVideo();
        window.onresize = null;
    }
}

/**
  * @this {ServerConnection}
  * @param {string} [username]
  */
async function gotConnected(username) {
    let credentials;
    if(token) {
        credentials = {
            type: 'token',
            token: token,
        };
        token = null;
    } else {
        setConnected(true);

        username = getInputElement('username').value.trim();
        let pw = getInputElement('password').value;
        getInputElement('password').value = '';
        if(!groupStatus.authServer)
            credentials = pw;
        else
            credentials = {
                type: 'authServer',
                authServer: groupStatus.authServer,
                location: location.href,
                password: pw,
            };
    }

    try {
        await this.join(group, username, credentials);
    } catch(e) {
        console.error(e);
        displayError(e);
        serverConnection.close();
    }
}

/**
 * @this {ServerConnection}
 */
function onPeerConnection() {
    if(!getSettings().forceRelay)
        return null;
    let old = this.rtcConfiguration;
    /** @type {RTCConfiguration} */
    let conf = {};
    for(let key in old)
        conf[key] = old[key];
    conf.iceTransportPolicy = 'relay';
    return conf;
}

/**
 * @this {ServerConnection}
 * @param {number} code
 * @param {string} reason
 */
function gotClose(code, reason) {
    closeUpMedia();
    setConnected(false);
    if(code != 1000) {
        console.warn('Socket close', code, reason);
    }
}

/**
 * @this {ServerConnection}
 * @param {Stream} c
 */
function gotDownStream(c) {
    c.onclose = function(replace) {
        if(!replace)
            delMedia(c.localId);
    };
    c.onerror = function(e) {
        console.error(e);
        displayError(e);
    };
    c.ondowntrack = function(track, transceiver, label, stream) {
        setMedia(c, false);
    };
    c.onnegotiationcompleted = function() {
        resetMedia(c);
    }
    c.onstatus = function(status) {
        setMediaStatus(c);
    };
    c.onstats = gotDownStats;
    if(getSettings().activityDetection)
        c.setStatsInterval(activityDetectionInterval);

    setMedia(c, false);
}

// Store current browser viewport height in css variable
function setViewportHeight() {
    document.documentElement.style.setProperty(
        '--vh', `${window.innerHeight/100}px`,
    );
    showVideo();
    // Ajust video component size
    resizePeers();
}

// On resize and orientation change, we update viewport height
addEventListener('resize', setViewportHeight);
addEventListener('orientationchange', setViewportHeight);

getButtonElement('presentbutton').onclick = async function(e) {
    e.preventDefault();
    let button = this;
    if(!(button instanceof HTMLButtonElement))
        throw new Error('Unexpected type for this.');
    // there's a potential race condition here: the user might click the
    // button a second time before the stream is set up and the button hidden.
    button.disabled = true;
    try {
        let id = findUpMedia('camera');
        if(!id)
            await addLocalMedia();
    } finally {
        button.disabled = false;
    }
};

getButtonElement('unpresentbutton').onclick = function(e) {
    e.preventDefault();
    closeUpMedia('camera');
    resizePeers();
};

/**
 * @param {string} id
 * @param {boolean} visible
 */
function setVisibility(id, visible) {
    let elt = document.getElementById(id);
    if(visible)
        elt.classList.remove('invisible');
    else
        elt.classList.add('invisible');
}

function setButtonsVisibility() {
    let connected = serverConnection && serverConnection.socket;
    let permissions = serverConnection.permissions;
    let present = permissions.indexOf('present') >= 0;
    let local = !!findUpMedia('camera');
    let canWebrtc = !(typeof RTCPeerConnection === 'undefined');
    let mediacount = document.getElementById('peers').childElementCount;
    let mobilelayout = isMobileLayout();

    // don't allow multiple presentations
    setVisibility('presentbutton', canWebrtc && present && !local);
    setVisibility('unpresentbutton', local);

    setVisibility('mutebutton', !connected || present);

    // allow multiple shared documents
    setVisibility('sharebutton', canWebrtc && present &&
                  ('getDisplayMedia' in navigator.mediaDevices));

    setVisibility('mediaoptions', present);
    setVisibility('sendform', present);
    setVisibility('simulcastform', present);

    setVisibility('collapse-video', mediacount && mobilelayout);
}

/**
 * @param {boolean} mute
 * @param {boolean} [reflect]
 */
function setLocalMute(mute, reflect) {
    muteLocalTracks(mute);
    let button = document.getElementById('mutebutton');
    let icon = button.querySelector("span .fas");
    if(mute){
        icon.classList.add('fa-microphone-slash');
        icon.classList.remove('fa-microphone');
        button.classList.add('muted');
    } else {
        icon.classList.remove('fa-microphone-slash');
        icon.classList.add('fa-microphone');
        button.classList.remove('muted');
    }
    if(reflect)
        updateSettings({localMute: mute});
}

getSelectElement('videoselect').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLSelectElement))
        throw new Error('Unexpected type for this');
    updateSettings({video: this.value});
    replaceCameraStream();
};

getSelectElement('audioselect').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLSelectElement))
        throw new Error('Unexpected type for this');
    updateSettings({audio: this.value});
    replaceCameraStream();
};

getInputElement('mirrorbox').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLInputElement))
        throw new Error('Unexpected type for this');
    updateSettings({mirrorView: this.checked});
    // no need to reopen the camera
    replaceUpStreams('camera');
};

getInputElement('blackboardbox').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLInputElement))
        throw new Error('Unexpected type for this');
    updateSettings({blackboardMode: this.checked});
    replaceCameraStream();
};

getInputElement('preprocessingbox').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLInputElement))
        throw new Error('Unexpected type for this');
    updateSettings({preprocessing: this.checked});
    replaceCameraStream();
};

getInputElement('hqaudiobox').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLInputElement))
        throw new Error('Unexpected type for this');
    updateSettings({hqaudio: this.checked});
    replaceCameraStream();
};

document.getElementById('mutebutton').onclick = function(e) {
    e.preventDefault();
    let localMute = getSettings().localMute;
    localMute = !localMute;
    setLocalMute(localMute, true);
};

document.getElementById('sharebutton').onclick = function(e) {
    e.preventDefault();
    addShareMedia();
};

getSelectElement('filterselect').onchange = async function(e) {
    if(!(this instanceof HTMLSelectElement))
        throw new Error('Unexpected type for this');
    updateSettings({filter: this.value});
    let c = findUpMedia('camera');
    if(c) {
        let filter = (this.value && filters[this.value]) || null;
        if(filter)
            c.userdata.filterDefinition = filter;
        else
            delete c.userdata.filterDefinition;
        replaceUpStream(c);
    }
};

/** @returns {number} */
function getMaxVideoThroughput() {
    let v = getSettings().send;
    switch(v) {
    case 'lowest':
        return 150000;
    case 'low':
        return 300000;
    case 'normal':
        return 700000;
    case 'unlimited':
        return null;
    default:
        console.error('Unknown video quality', v);
        return 700000;
    }
}

getSelectElement('sendselect').onchange = async function(e) {
    if(!(this instanceof HTMLSelectElement))
        throw new Error('Unexpected type for this');
    updateSettings({send: this.value});
    await reconsiderSendParameters();
};

getSelectElement('simulcastselect').onchange = async function(e) {
    if(!(this instanceof HTMLSelectElement))
        throw new Error('Unexpected type for this');
    updateSettings({simulcast: this.value});
    await reconsiderSendParameters();
};

/**
 * @param {string} what
 * @returns {Object<string,Array<string>>}
 */

function mapRequest(what) {
    switch(what) {
    case '':
        return {};
        break;
    case 'audio':
        return {'': ['audio']};
        break;
    case 'screenshare-low':
        return {screenshare: ['audio','video-low'], '': ['audio']};
        break;
    case 'screenshare':
        return {screenshare: ['audio','video'], '': ['audio']};
        break;
    case 'everything-low':
        return {'': ['audio','video-low']};
        break;
    case 'everything':
        return {'': ['audio','video']}
        break;
    default:
        throw new Error(`Unknown value ${what} in request`);
    }
}

/**
 * @param {string} what
 * @param {string} label
 * @returns {Array<string>}
 */

function mapRequestLabel(what, label) {
    let r = mapRequest(what);
    if(label in r)
        return r[label];
    else
        return r[''];
}


getSelectElement('requestselect').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLSelectElement))
        throw new Error('Unexpected type for this');
    updateSettings({request: this.value});
    serverConnection.request(mapRequest(this.value));
    reconsiderDownRate();
};

const activityDetectionInterval = 200;
const activityDetectionPeriod = 700;
const activityDetectionThreshold = 0.2;

getInputElement('activitybox').onchange = function(e) {
    if(!(this instanceof HTMLInputElement))
        throw new Error('Unexpected type for this');
    updateSettings({activityDetection: this.checked});
    for(let id in serverConnection.down) {
        let c = serverConnection.down[id];
        if(this.checked)
            c.setStatsInterval(activityDetectionInterval);
        else {
            c.setStatsInterval(0);
            setActive(c, false);
        }
    }
};

/**
 * @this {Stream}
 * @param {Object<string,any>} stats
 */
function gotUpStats(stats) {
    let c = this;

    let values = [];

    for(let id in stats) {
        if(stats[id] && stats[id]['outbound-rtp']) {
            let rate = stats[id]['outbound-rtp'].rate;
            if(typeof rate === 'number') {
                values.push(rate);
            }
        }
    }

    if(values.length === 0) {
        setLabel(c, '');
    } else {
        values.sort((x,y) => x - y);
        setLabel(c, values
                 .map(x => Math.round(x / 1000).toString())
                 .reduce((x, y) => x + '+' + y));
    }
}

/**
 * @param {Stream} c
 * @param {boolean} value
 */
function setActive(c, value) {
    let peer = document.getElementById('peer-' + c.localId);
    if(value)
        peer.classList.add('peer-active');
    else
        peer.classList.remove('peer-active');
}

/**
 * @this {Stream}
 * @param {Object<string,any>} stats
 */
function gotDownStats(stats) {
    if(!getInputElement('activitybox').checked)
        return;

    let c = this;

    let maxEnergy = 0;

    c.pc.getReceivers().forEach(r => {
        let tid = r.track && r.track.id;
        let s = tid && stats[tid];
        let energy = s && s['track'] && s['track'].audioEnergy;
        if(typeof energy === 'number')
            maxEnergy = Math.max(maxEnergy, energy);
    });

    // totalAudioEnergy is defined as the integral of the square of the
    // volume, so square the threshold.
    if(maxEnergy > activityDetectionThreshold * activityDetectionThreshold) {
        c.userdata.lastVoiceActivity = Date.now();
        setActive(c, true);
    } else {
        let last = c.userdata.lastVoiceActivity;
        if(!last || Date.now() - last > activityDetectionPeriod)
            setActive(c, false);
    }
}

/**
 * @param {HTMLSelectElement} select
 * @param {string} label
 * @param {string} [value]
 */
function addSelectOption(select, label, value) {
    if(!value)
        value = label;
    for(let i = 0; i < select.children.length; i++) {
        let child = select.children[i];
        if(!(child instanceof HTMLOptionElement)) {
            console.warn('Unexpected select child');
            continue;
        }
        if(child.value === value) {
            if(child.label !== label) {
                child.label = label;
            }
            return;
        }
    }

    let option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
}

/**
 * @param {HTMLSelectElement} select
 * @param {string} value
 */
function selectOptionAvailable(select, value) {
    let children = select.children;
    for(let i = 0; i < children.length; i++) {
        let child = select.children[i];
        if(!(child instanceof HTMLOptionElement)) {
            console.warn('Unexpected select child');
            continue;
        }
        if(child.value === value)
            return true;
    }
    return false;
}

/**
 * @param {HTMLSelectElement} select
 * @returns {string}
 */
function selectOptionDefault(select) {
    /* First non-empty option. */
    for(let i = 0; i < select.children.length; i++) {
        let child = select.children[i];
        if(!(child instanceof HTMLOptionElement)) {
            console.warn('Unexpected select child');
            continue;
        }
        if(child.value)
            return child.value;
    }
    /* The empty option is always available. */
    return '';
}

/* media names might not be available before we call getDisplayMedia.  So
   we call this twice, the second time to update the menu with user-readable
   labels. */
/** @type {boolean} */
let mediaChoicesDone = false;

/**
 * @param{boolean} done
 */
async function setMediaChoices(done) {
    if(mediaChoicesDone)
        return;

    let devices = [];
    try {
        devices = await navigator.mediaDevices.enumerateDevices();
    } catch(e) {
        console.error(e);
        return;
    }

    let cn = 1, mn = 1;

    devices.forEach(d => {
        let label = d.label;
        if(d.kind === 'videoinput') {
            if(!label)
                label = `Camera ${cn}`;
            addSelectOption(getSelectElement('videoselect'),
                            label, d.deviceId);
            cn++;
        } else if(d.kind === 'audioinput') {
            if(!label)
                label = `Microphone ${mn}`;
            addSelectOption(getSelectElement('audioselect'),
                            label, d.deviceId);
            mn++;
        }
    });

    mediaChoicesDone = done;
}


/**
 * @param {string} [localId]
 */
function newUpStream(localId) {
    let c = serverConnection.newUpStream(localId);
    c.onstatus = function(status) {
        setMediaStatus(c);
    };
    c.onerror = function(e) {
        console.error(e);
        displayError(e);
    };
    return c;
}

/**
 * Sets an up stream's video throughput and simulcast parameters.
 *
 * @param {Stream} c
 * @param {number} bps
 * @param {boolean} simulcast
 */
async function setSendParameters(c, bps, simulcast) {
    if(!c.up)
        throw new Error('Setting throughput of down stream');
    let senders = c.pc.getSenders();
    for(let i = 0; i < senders.length; i++) {
        let s = senders[i];
        if(!s.track || s.track.kind !== 'video')
            continue;
        let p = s.getParameters();
        if((!p.encodings ||
            !simulcast && p.encodings.length != 1) ||
           (simulcast && p.encodings.length != 2)) {
            await replaceUpStream(c);
            return;
        }
        p.encodings.forEach(e => {
            if(!e.rid || e.rid === 'h')
                e.maxBitrate = bps || unlimitedRate;
        });
        await s.setParameters(p);
    }
}

let reconsiderParametersTimer = null;

/**
 * Sets the send parameters for all up streams.
 */
async function reconsiderSendParameters() {
    cancelReconsiderParameters();
    let t = getMaxVideoThroughput();
    let s = doSimulcast();
    let promises = [];
    for(let id in serverConnection.up) {
        let c = serverConnection.up[id];
        promises.push(setSendParameters(c, t, s));
    }
    await Promise.all(promises);
}

/**
 * Schedules a call to reconsiderSendParameters after a delay.
 * The delay avoids excessive flapping.
 */
function scheduleReconsiderParameters() {
    cancelReconsiderParameters();
    reconsiderParametersTimer =
        setTimeout(reconsiderSendParameters, 10000 + Math.random() * 10000);
}

function cancelReconsiderParameters() {
    if(reconsiderParametersTimer) {
        clearTimeout(reconsiderParametersTimer);
        reconsiderParametersTimer = null;
    }
}

/**
 * @typedef {Object} filterDefinition
 * @property {string} [description]
 * @property {string} [contextType]
 * @property {Object} [contextAttributes]
 * @property {(this: Filter, ctx: RenderingContext) => void} [init]
 * @property {(this: Filter) => void} [cleanup]
 * @property {(this: Filter, src: CanvasImageSource, width: number, height: number, ctx: RenderingContext) => boolean} f
 */

/**
 * @param {MediaStream} stream
 * @param {filterDefinition} definition
 * @constructor
 */
function Filter(stream, definition) {
    /** @ts-ignore */
    if(!HTMLCanvasElement.prototype.captureStream) {
        throw new Error('Filters are not supported on this platform');
    }

    /** @type {MediaStream} */
    this.inputStream = stream;
    /** @type {filterDefinition} */
    this.definition = definition;
    /** @type {number} */
    this.frameRate = 30;
    /** @type {HTMLVideoElement} */
    this.video = document.createElement('video');
    /** @type {HTMLCanvasElement} */
    this.canvas = document.createElement('canvas');
    /** @type {any} */
    this.context = this.canvas.getContext(
        definition.contextType || '2d',
        definition.contextAttributes || null);
    /** @type {MediaStream} */
    this.captureStream = null;
    /** @type {MediaStream} */
    this.outputStream = null;
    /** @type {number} */
    this.timer = null;
    /** @type {number} */
    this.count = 0;
    /** @type {boolean} */
    this.fixedFramerate = false;
    /** @type {Object} */
    this.userdata = {}
    /** @type {MediaStream} */
    this.captureStream = this.canvas.captureStream(0);

    /** @ts-ignore */
    if(!this.captureStream.getTracks()[0].requestFrame) {
        console.warn('captureFrame not supported, using fixed framerate');
        /** @ts-ignore */
        this.captureStream = this.canvas.captureStream(this.frameRate);
        this.fixedFramerate = true;
    }

    this.outputStream = new MediaStream();
    this.outputStream.addTrack(this.captureStream.getTracks()[0]);
    this.inputStream.getTracks().forEach(t => {
        t.onended = e => this.stop();
        if(t.kind != 'video')
            this.outputStream.addTrack(t);
    });
    this.video.srcObject = stream;
    this.video.muted = true;
    this.video.play();
    if(this.definition.init)
        this.definition.init.call(this, this.context);
    this.timer = setInterval(() => this.draw(), 1000 / this.frameRate);
}

Filter.prototype.draw = function() {
    // check framerate every 30 frames
    if((this.count % 30) === 0) {
        let frameRate = 0;
        this.inputStream.getTracks().forEach(t => {
            if(t.kind === 'video') {
                let r = t.getSettings().frameRate;
                if(r)
                    frameRate = r;
            }
        });
        if(frameRate && frameRate != this.frameRate) {
            clearInterval(this.timer);
            this.timer = setInterval(() => this.draw(), 1000 / this.frameRate);
        }
    }

    let ok = false;
    try {
        ok = this.definition.f.call(this, this.video,
                                    this.video.videoWidth,
                                    this.video.videoHeight,
                                    this.context);
    } catch(e) {
        console.error(e);
    }
    if(ok && !this.fixedFramerate) {
        /** @ts-ignore */
        this.captureStream.getTracks()[0].requestFrame();
    }

    this.count++;
};

Filter.prototype.stop = function() {
    if(!this.timer)
        return;
    this.captureStream.getTracks()[0].stop();
    clearInterval(this.timer);
    this.timer = null;
    if(this.definition.cleanup)
        this.definition.cleanup.call(this);
};

/**
 * Removes any filter set on c.
 *
 * @param {Stream} c
 */
function removeFilter(c) {
    let old = c.userdata.filter;
    if(!old)
        return;

    if(!(old instanceof Filter))
        throw new Error('userdata.filter is not a filter');

    c.setStream(old.inputStream);
    old.stop();
    c.userdata.filter = null;
}

/**
 * Sets the filter described by c.userdata.filterDefinition on c.
 *
 * @param {Stream} c
 */
function setFilter(c) {
    removeFilter(c);

    if(!c.userdata.filterDefinition)
        return;

    let filter = new Filter(c.stream, c.userdata.filterDefinition);
    c.setStream(filter.outputStream);
    c.userdata.filter = filter;
}

/**
 * @type {Object.<string,filterDefinition>}
 */
let filters = {
    'mirror-h': {
        description: "Horizontal mirror",
        f: function(src, width, height, ctx) {
            if(!(ctx instanceof CanvasRenderingContext2D))
                throw new Error('bad context type');
            if(ctx.canvas.width !== width || ctx.canvas.height !== height) {
                ctx.canvas.width = width;
                ctx.canvas.height = height;
            }
            ctx.scale(-1, 1);
            ctx.drawImage(src, -width, 0);
            ctx.resetTransform();
            return true;
        },
    },
    'mirror-v': {
        description: "Vertical mirror",
        f: function(src, width, height, ctx) {
            if(!(ctx instanceof CanvasRenderingContext2D))
                throw new Error('bad context type');
            if(ctx.canvas.width !== width || ctx.canvas.height !== height) {
                ctx.canvas.width = width;
                ctx.canvas.height = height;
            }
            ctx.scale(1, -1);
            ctx.drawImage(src, 0, -height);
            ctx.resetTransform();
            return true;
        },
    },
};

function addFilters() {
    for(let name in filters) {
        let f = filters[name];
        let d = f.description || name;
        addSelectOption(getSelectElement('filterselect'), d, name);
    }
}

function isSafari() {
    let ua = navigator.userAgent.toLowerCase();
    return ua.indexOf('safari') >= 0 && ua.indexOf('chrome') < 0;
}

const unlimitedRate = 1000000000;
const simulcastRate = 100000;
const hqAudioRate = 128000;

/**
 * Decide whether we want to send simulcast.
 *
 * @returns {boolean}
 */
function doSimulcast() {
    switch(getSettings().simulcast) {
    case 'on':
        return true;
    case 'off':
        return false;
    default:
        let count = 0;
        for(let n in serverConnection.users) {
            if(!serverConnection.users[n].permissions["system"]) {
                count++;
                if(count > 2)
                    break;
            }
        }
        if(count <= 2)
            return false;
        let bps = getMaxVideoThroughput();
        return bps <= 0 || bps >= 2 * simulcastRate;
    }
}

/**
 * Sets up c to send the given stream.  Some extra parameters are stored
 * in c.userdata.
 *
 * @param {Stream} c
 * @param {MediaStream} stream
 */

function setUpStream(c, stream) {
    if(c.stream != null)
        throw new Error("Setting nonempty stream");

    c.setStream(stream);

    try {
        setFilter(c);
    } catch(e) {
        displayWarning("Couldn't set filter: " + e);
    }

    c.onclose = replace => {
        removeFilter(c);
        if(!replace) {
            stopStream(c.stream);
            if(c.userdata.onclose)
                c.userdata.onclose.call(c);
            delMedia(c.localId);
        }
    }

    /**
     * @param {MediaStreamTrack} t
     */
    function addUpTrack(t) {
        let settings = getSettings();
        if(c.label === 'camera') {
            if(t.kind == 'audio') {
                if(settings.localMute)
                    t.enabled = false;
            } else if(t.kind == 'video') {
                if(settings.blackboardMode) {
                    t.contentHint = 'detail';
                }
            }
        }
        t.onended = e => {
            stream.onaddtrack = null;
            stream.onremovetrack = null;
            c.close();
        };

        let encodings = [];
        let simulcast = doSimulcast();
        if(t.kind === 'video') {
            let bps = getMaxVideoThroughput();
            // Firefox doesn't like us setting the RID if we're not
            // simulcasting.
            if(simulcast) {
                encodings.push({
                    rid: 'h',
                    maxBitrate: bps || unlimitedRate,
                });
                encodings.push({
                    rid: 'l',
                    scaleResolutionDownBy: 2,
                    maxBitrate: simulcastRate,
                });
            } else {
                encodings.push({
                    maxBitrate: bps || unlimitedRate,
                });
            }
        } else {
            if(c.label !== 'camera' || settings.hqaudio) {
                encodings.push({
                    maxBitrate: hqAudioRate,
                });
            }
        }
        let tr = c.pc.addTransceiver(t, {
            direction: 'sendonly',
            streams: [stream],
            sendEncodings: encodings,
        });

        // Firefox workaround
        function match(a, b) {
            if(!a || !b)
                return false;
            if(a.length !== b.length)
                return false;
            for(let i = 0; i < a.length; i++) {
                if(a.maxBitrate !== b.maxBitrate)
                    return false;
            }
            return true;
        }

        let p = tr.sender.getParameters();
        if(!p || !match(p.encodings, encodings)) {
            p.encodings = encodings;
            tr.sender.setParameters(p);
        }
    }

    // c.stream might be different from stream if there's a filter
    c.stream.getTracks().forEach(addUpTrack);

    stream.onaddtrack = function(e) {
        addUpTrack(e.track);
    };

    stream.onremovetrack = function(e) {
        let t = e.track;

        /** @type {RTCRtpSender} */
        let sender;
        c.pc.getSenders().forEach(s => {
            if(s.track === t)
                sender = s;
        });
        if(sender) {
            c.pc.removeTrack(sender);
        } else {
            console.warn('Removing unknown track');
        }

        let found = false;
        c.pc.getSenders().forEach(s => {
            if(s.track)
                found = true;
        });
        if(!found) {
            stream.onaddtrack = null;
            stream.onremovetrack = null;
            c.close();
        }
    };

    c.onstats = gotUpStats;
    c.setStatsInterval(2000);
}

/**
 * Replaces c with a freshly created stream, duplicating any relevant
 * parameters in c.userdata.
 *
 * @param {Stream} c
 * @returns {Promise<Stream>}
 */
async function replaceUpStream(c) {
    removeFilter(c);
    let cn = newUpStream(c.localId);
    cn.label = c.label;
    if(c.userdata.filterDefinition)
        cn.userdata.filterDefinition = c.userdata.filterDefinition;
    if(c.userdata.onclose)
        cn.userdata.onclose = c.userdata.onclose;
    let media = /** @type{HTMLVideoElement} */
        (document.getElementById('media-' + c.localId));
    setUpStream(cn, c.stream);
    await setMedia(cn, true,
                   cn.label == 'camera' && getSettings().mirrorView,
                   cn.label == 'video' && media);
    return cn;
}

/**
 * Replaces all up streams with the given label.  If label is null,
 * replaces all up stream.
 *
 * @param {string} label
 */
async function replaceUpStreams(label) {
    let promises = [];
    for(let id in serverConnection.up) {
        let c = serverConnection.up[id];
        if(label && c.label !== label)
            continue
        promises.push(replaceUpStream(c));
    }
    await Promise.all(promises);
}

/**
 * Closes and reopens the camera then replaces the camera stream.
 */
function replaceCameraStream() {
    let c = findUpMedia('camera');
    if(c)
        addLocalMedia(c.localId);
}

/**
 * @param {string} [localId]
 */
async function addLocalMedia(localId) {
    let settings = getSettings();

    let audio = settings.audio ? {deviceId: settings.audio} : false;
    let video = settings.video ? {deviceId: settings.video} : false;

    if(video) {
        let resolution = settings.resolution;
        if(resolution) {
            video.width = { ideal: resolution[0] };
            video.height = { ideal: resolution[1] };
        } else if(settings.blackboardMode) {
            video.width = { min: 640, ideal: 1920 };
            video.height = { min: 400, ideal: 1080 };
        }
    }

    if(audio) {
        if(!settings.preprocessing) {
            audio.echoCancellation = false;
            audio.noiseSuppression = false;
            audio.autoGainControl = false;
        }
    }

    let old = serverConnection.findByLocalId(localId);
    if(old) {
        // make sure that the camera is released before we try to reopen it
        removeFilter(old);
        stopStream(old.stream);
    }

    let constraints = {audio: audio, video: video};
    /** @type {MediaStream} */
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch(e) {
        displayError(e);
        return;
    }

    setMediaChoices(true);

    let c;

    try {
        c = newUpStream(localId);
    } catch(e) {
        console.log(e);
        displayError(e);
        return;
    }

    c.label = 'camera';

    if(settings.filter) {
        let filter = filters[settings.filter];
        if(filter)
            c.userdata.filterDefinition = filter;
        else
            displayWarning(`Unknown filter ${settings.filter}`);
    }

    setUpStream(c, stream);
    await setMedia(c, true, settings.mirrorView);
    setButtonsVisibility();
}

let safariScreenshareDone = false;

async function addShareMedia() {
    /** @type {MediaStream} */
    let stream = null;
    try {
        if(!('getDisplayMedia' in navigator.mediaDevices))
            throw new Error('Your browser does not support screen sharing');
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });
    } catch(e) {
        console.error(e);
        displayError(e);
        return;
    }

    if(!safariScreenshareDone) {
        if(isSafari())
            displayWarning('Screen sharing under Safari is experimental.  ' +
                           'Please use a different browser if possible.');
        safariScreenshareDone = true;
    }

    let c = newUpStream();
    c.label = 'screenshare';
    setUpStream(c, stream);
    await setMedia(c, true);
    setButtonsVisibility();
}

/**
 * @param {File} file
 */
async function addFileMedia(file) {
    let url = URL.createObjectURL(file);
    let video = document.createElement('video');
    video.src = url;
    video.controls = true;
    let stream;
    /** @ts-ignore */
    if(video.captureStream)
        /** @ts-ignore */
        stream = video.captureStream();
    /** @ts-ignore */
    else if(video.mozCaptureStream)
        /** @ts-ignore */
        stream = video.mozCaptureStream();
    else {
        displayError("This browser doesn't support file playback");
        return;
    }

    let c = newUpStream();
    c.label = 'video';
    c.userdata.onclose = function() {
        let media = /** @type{HTMLVideoElement} */
            (document.getElementById('media-' + this.localId));
        if(media && media.src) {
            URL.revokeObjectURL(media.src);
            media.src = null;
        }
    };
    await setUpStream(c, stream);

    let presenting = !!findUpMedia('camera');
    let muted = getSettings().localMute;
    if(presenting && !muted) {
        setLocalMute(true, true);
        displayWarning('You have been muted');
    }

    await setMedia(c, true, false, video);
    c.userdata.play = true;
    setButtonsVisibility();
}

/**
 * @param {MediaStream} s
 */
function stopStream(s) {
    s.getTracks().forEach(t => {
        try {
            t.stop();
        } catch(e) {
            console.warn(e);
        }
    });
}

/**
 * closeUpMedia closes all up connections with the given label.  If label
 * is null, it closes all up connections.
 *
 * @param {string} [label]
*/
function closeUpMedia(label) {
    for(let id in serverConnection.up) {
        let c = serverConnection.up[id];
        if(label && c.label !== label)
            continue
        c.close();
    }
}

/**
 * @param {string} label
 * @returns {Stream}
 */
function findUpMedia(label) {
    for(let id in serverConnection.up) {
        let c = serverConnection.up[id]
        if(c.label === label)
            return c;
    }
    return null;
}

/**
 * @param {boolean} mute
 */
function muteLocalTracks(mute) {
    if(!serverConnection)
        return;
    for(let id in serverConnection.up) {
        let c = serverConnection.up[id];
        if(c.label === 'camera') {
            let stream = c.stream;
            stream.getTracks().forEach(t => {
                if(t.kind === 'audio') {
                    t.enabled = !mute;
                }
            });
        }
    }
}

/**
 * @param {string} id
 * @param {boolean} force
 * @param {boolean} [value]
 */
function forceDownRate(id, force, value) {
    let c = serverConnection.down[id];
    if(!c)
        throw new Error("Unknown down stream");
    if('requested' in c.userdata) {
        if(force)
            c.userdata.requested.force = !!value;
        else
            delete(c.userdata.requested.force);
    } else {
        if(force)
            c.userdata.requested = {force: value};
    }
    reconsiderDownRate(id);
}

/**
 * Maps 'video' to 'video-low'.  Returns null if nothing changed.
 *
 * @param {string[]} requested
 * @returns {string[]}
 */
function mapVideoToLow(requested) {
    let result = [];
    let found = false;
    for(let i = 0; i < requested.length; i++) {
        let r = requested[i];
        if(r === 'video') {
            r = 'video-low';
            found = true;
        }
        result.push(r);
    }
    if(!found)
        return null;
    return result;
}

/**
 * Reconsider the video track requested for a given down stream.
 *
 * @param {string} [id] - the id of the track to reconsider, all if null.
 */
function reconsiderDownRate(id) {
    if(!serverConnection)
        return;
    if(!id) {
        for(let id in serverConnection.down) {
            reconsiderDownRate(id);
        }
        return;
    }
    let c = serverConnection.down[id];
    if(!c)
        throw new Error("Unknown down stream");
    let normalrequest = mapRequestLabel(getSettings().request, c.label);

    let requestlow = mapVideoToLow(normalrequest);
    if(requestlow === null)
        return;

    let old = c.userdata.requested;
    let low = false;
    if(old && ('force' in old)) {
        low = old.force;
    } else {
        let media = /** @type {HTMLVideoElement} */
            (document.getElementById('media-' + c.localId));
        if(!media)
            throw new Error("No media for stream");
        let w = media.scrollWidth;
        let h = media.scrollHeight;
        if(w && h && w * h <= 320 * 240) {
            low = true;
        }
    }

    if(low !== !!(old && old.low)) {
        if('requested' in c.userdata)
            c.userdata.requested.low = low;
        else
            c.userdata.requested = {low: low};
        c.request(low ? requestlow : null);
    }
}

let reconsiderDownRateTimer = null;

/**
 * Schedules reconsiderDownRate() to be run later.  The delay avoids too
 * much recomputations when resizing the window.
 */
function scheduleReconsiderDownRate() {
    if(reconsiderDownRateTimer)
        return;
    reconsiderDownRateTimer =
        setTimeout(() => {
            reconsiderDownRateTimer = null;
            reconsiderDownRate();
        }, 200);
}

/**
 * setMedia adds a new media element corresponding to stream c.
 *
 * @param {Stream} c
 * @param {boolean} isUp
 *     - indicates whether the stream goes in the up direction
 * @param {boolean} [mirror]
 *     - whether to mirror the video
 * @param {HTMLVideoElement} [video]
 *     - the video element to add.  If null, a new element with custom
 *       controls will be created.
 */
async function setMedia(c, isUp, mirror, video) {
    let peersdiv = document.getElementById('peers');

    let div = document.getElementById('peer-' + c.localId);
    if(!div) {
        div = document.createElement('div');
        div.id = 'peer-' + c.localId;
        div.classList.add('peer');
        peersdiv.appendChild(div);
    }

    let media = /** @type {HTMLVideoElement} */
        (document.getElementById('media-' + c.localId));
    if(!media) {
        if(video) {
            media = video;
        } else {
            media = document.createElement('video');
            if(isUp)
                media.muted = true;
        }

        media.classList.add('media');
        media.autoplay = true;
        media.playsInline = true;
        media.id = 'media-' + c.localId;
        div.appendChild(media);
        addCustomControls(media, div, c, !!video);
    }

    if(mirror)
        media.classList.add('mirror');
    else
        media.classList.remove('mirror');

    if(!video && media.srcObject !== c.stream)
        media.srcObject = c.stream;

    if(!isUp) {
        media.onfullscreenchange = function(e) {
            forceDownRate(c.id, document.fullscreenElement === media, false);
        }
    }

    let label = document.getElementById('label-' + c.localId);
    if(!label) {
        label = document.createElement('div');
        label.id = 'label-' + c.localId;
        label.classList.add('label');
        div.appendChild(label);
    }

    setLabel(c);
    setMediaStatus(c);

    showVideo();
    resizePeers();

    if(!isUp && isSafari() && !findUpMedia('camera')) {
        // Safari doesn't allow autoplay unless the user has granted media access
        try {
            let stream = await navigator.mediaDevices.getUserMedia({audio: true});
            stream.getTracks().forEach(t => t.stop());
        } catch(e) {
        }
    }
}

/**
 * resetMedia resets the source stream of the media element associated
 * with c.  This has the side-effect of resetting any frozen frames.
 *
 * @param {Stream} c
 */
function resetMedia(c) {
    let media = /** @type {HTMLVideoElement} */
        (document.getElementById('media-' + c.localId));
    if(!media) {
        console.error("Resetting unknown media element")
        return;
    }
    media.srcObject = media.srcObject;
}

/**
 * @param {Element} elt
 */
function cloneHTMLElement(elt) {
    if(!(elt instanceof HTMLElement))
        throw new Error('Unexpected element type');
    return /** @type{HTMLElement} */(elt.cloneNode(true));
}

/**
 * @param {HTMLVideoElement} media
 * @param {HTMLElement} container
 * @param {Stream} c
 */
function addCustomControls(media, container, c, toponly) {
    if(!toponly && !document.getElementById('controls-' + c.localId)) {
        media.controls = false;

        let template =
            document.getElementById('videocontrols-template').firstElementChild;
        let controls = cloneHTMLElement(template);
        controls.id = 'controls-' + c.localId;

        let volume = getVideoButton(controls, 'volume');

        if(c.up && c.label === 'camera') {
            volume.remove();
        } else {
            setVolumeButton(media.muted,
                            getVideoButton(controls, "volume-mute"),
                            getVideoButton(controls, "volume-slider"));
        }
        container.appendChild(controls);
    }

    if(c.up && !document.getElementById('topcontrols-' + c.localId)) {
        let toptemplate =
            document.getElementById('topvideocontrols-template').firstElementChild;
        let topcontrols = cloneHTMLElement(toptemplate);
        topcontrols.id = 'topcontrols-' + c.localId;
        container.appendChild(topcontrols);
    }
    registerControlHandlers(c.localId, media, container);
}

/**
 * @param {HTMLElement} container
 * @param {string} name
 */
function getVideoButton(container, name) {
    return /** @type {HTMLElement} */(container.getElementsByClassName(name)[0]);
}

/**
 * @param {boolean} muted
 * @param {HTMLElement} button
 * @param {HTMLElement} slider
 */
function setVolumeButton(muted, button, slider) {
    if(!muted) {
        button.classList.remove("fa-volume-mute");
        button.classList.add("fa-volume-up");
    } else {
        button.classList.remove("fa-volume-up");
        button.classList.add("fa-volume-mute");
    }

    if(!(slider instanceof HTMLInputElement))
        throw new Error("Couldn't find volume slider");
    slider.disabled = muted;
}

/**
 * @param {string} localId
 * @param {HTMLVideoElement} media
 * @param {HTMLElement} container
 */
function registerControlHandlers(localId, media, container) {
    let play = getVideoButton(container, 'video-play');
    if(play) {
        play.onclick = function(event) {
            event.preventDefault();
            media.play();
        };
    }

    let stop = getVideoButton(container, 'video-stop');
    if(stop) {
        stop.onclick = function(event) {
            event.preventDefault();
            try {
                let c = serverConnection.findByLocalId(localId);
                if(!c)
                    throw new Error('Closing unknown stream');
                c.close();
            } catch(e) {
                console.error(e);
                displayError(e);
            }
        };
    }

    let volume = getVideoButton(container, 'volume');
    if (volume) {
        volume.onclick = function(event) {
            let target = /** @type{HTMLElement} */(event.target);
            if(!target.classList.contains('volume-mute'))
                // if click on volume slider, do nothing
                return;
            event.preventDefault();
            media.muted = !media.muted;
            setVolumeButton(media.muted, target,
                            getVideoButton(volume, "volume-slider"));
        };
        volume.oninput = function() {
          let slider = /** @type{HTMLInputElement} */
              (getVideoButton(volume, "volume-slider"));
          media.volume = parseInt(slider.value, 10)/100;
        };
    }

    let pip = getVideoButton(container, 'pip');
    if(pip) {
        if(HTMLVideoElement.prototype.requestPictureInPicture) {
            pip.onclick = function(e) {
                e.preventDefault();
                if(media.requestPictureInPicture) {
                    media.requestPictureInPicture();
                } else {
                    displayWarning('Picture in Picture not supported.');
                }
            };
        } else {
            pip.style.display = 'none';
        }
    }

    let fs = getVideoButton(container, 'fullscreen');
    if(fs) {
        if(HTMLVideoElement.prototype.requestFullscreen ||
           /** @ts-ignore */
           HTMLVideoElement.prototype.webkitRequestFullscreen) {
            fs.onclick = function(e) {
                e.preventDefault();
                if(media.requestFullscreen) {
                    media.requestFullscreen();
                /** @ts-ignore */
                } else if(media.webkitRequestFullscreen) {
                    /** @ts-ignore */
                    media.webkitRequestFullscreen();
                } else {
                    displayWarning('Full screen not supported!');
                }
            };
        } else {
            fs.style.display = 'none';
        }
    }
}

/**
 * @param {string} localId
 */
function delMedia(localId) {
    let mediadiv = document.getElementById('peers');
    let peer = document.getElementById('peer-' + localId);
    if(!peer)
        throw new Error('Removing unknown media');

    let media = /** @type{HTMLVideoElement} */
        (document.getElementById('media-' + localId));

    media.srcObject = null;
    mediadiv.removeChild(peer);

    setButtonsVisibility();
    resizePeers();
    hideVideo();
}

/**
 * @param {Stream} c
 */
function setMediaStatus(c) {
    let state = c && c.pc && c.pc.iceConnectionState;
    let good = state === 'connected' || state === 'completed';

    let media = document.getElementById('media-' + c.localId);
    if(!media) {
        console.warn('Setting status of unknown media.');
        return;
    }
    if(good) {
        media.classList.remove('media-failed');
        if(c.userdata.play) {
            if(media instanceof HTMLMediaElement)
                media.play().catch(e => {
                    console.error(e);
                    displayError(e);
                });
            delete(c.userdata.play);
        }
    } else {
        media.classList.add('media-failed');
    }
}


/**
 * @param {Stream} c
 * @param {string} [fallback]
 */
function setLabel(c, fallback) {
    let label = document.getElementById('label-' + c.localId);
    if(!label)
        return;
    let l = c.username;
    if(l) {
        label.textContent = l;
        label.classList.remove('label-fallback');
    } else if(fallback) {
        label.textContent = fallback;
        label.classList.add('label-fallback');
    } else {
        label.textContent = '';
        label.classList.remove('label-fallback');
    }
}

function resizePeers() {
    // Window resize can call this method too early
    if (!serverConnection)
        return;
    let count =
        Object.keys(serverConnection.up).length +
        Object.keys(serverConnection.down).length;
    let peers = document.getElementById('peers');
    let columns = Math.ceil(Math.sqrt(count));
    if (!count)
        // No video, nothing to resize.
        return;
    let container = document.getElementById("video-container");
    // Peers div has total padding of 40px, we remove 40 on offsetHeight
    // Grid has row-gap of 5px
    let rows = Math.ceil(count / columns);
    let margins = (rows - 1) * 5 + 40;

    if (count <= 2 && container.offsetHeight > container.offsetWidth) {
        peers.style['grid-template-columns'] = "repeat(1, 1fr)";
        rows = count;
    } else {
        peers.style['grid-template-columns'] = `repeat(${columns}, 1fr)`;
    }
    if (count === 1)
        return;
    let max_video_height = (peers.offsetHeight - margins) / rows;
    let media_list = peers.querySelectorAll(".media");
    for(let i = 0; i < media_list.length; i++) {
        let media = media_list[i];
        if(!(media instanceof HTMLMediaElement)) {
            console.warn('Unexpected media');
            continue;
        }
        media.style['max-height'] = max_video_height + "px";
    }
}

/**
 * Lexicographic order, with case differences secondary.
 * @param{string} a
 * @param{string} b
 */
function stringCompare(a, b) {
    let la = a.toLowerCase();
    let lb = b.toLowerCase();
    if(la < lb)
        return -1;
    else if(la > lb)
        return +1;
    else if(a < b)
        return -1;
    else if(a > b)
        return +1;
    return 0
}

/**
 * @param {HTMLElement} elt
 */
function userMenu(elt) {
    if(!elt.id.startsWith('user-'))
        throw new Error('Unexpected id for user menu');
    let id = elt.id.slice('user-'.length);
    let user = serverConnection.users[id];
    if(!user)
        throw new Error("Couldn't find user")
    let items = [];
    if(id === serverConnection.id) {
        let mydata = serverConnection.users[serverConnection.id].data;
        if(mydata['raisehand'])
            items.push({label: 'Unraise hand', onClick: () => {
                serverConnection.userAction(
                    'setdata', serverConnection.id, {'raisehand': null},
                );
            }});
        else
            items.push({label: 'Raise hand', onClick: () => {
                serverConnection.userAction(
                    'setdata', serverConnection.id, {'raisehand': true},
                );
            }});
        if(serverConnection.permissions.indexOf('present')>= 0 && canFile())
            items.push({label: 'Broadcast file', onClick: presentFile});
        items.push({label: 'Restart media', onClick: renegotiateStreams});
    } else {
        items.push({label: 'Send file', onClick: () => {
            sendFile(id);
        }});
        if(serverConnection.permissions.indexOf('op') >= 0) {
            items.push({type: 'seperator'}); // sic
            if(user.permissions.indexOf('present') >= 0)
                items.push({label: 'Forbid presenting', onClick: () => {
                    serverConnection.userAction('unpresent', id);
                }});
            else
                items.push({label: 'Allow presenting', onClick: () => {
                    serverConnection.userAction('present', id);
                }});
            items.push({label: 'Mute', onClick: () => {
                serverConnection.userMessage('mute', id);
            }});
            items.push({label: 'Kick out', onClick: () => {
                serverConnection.userAction('kick', id);
            }});
        }
    }
    /** @ts-ignore */
    new Contextual({
        items: items,
    });
}

/**
 * @param {string} id
 * @param {user} userinfo
 */
function addUser(id, userinfo) {
    let div = document.getElementById('users');
    let user = document.createElement('div');
    user.id = 'user-' + id;
    user.classList.add("user-p");
    setUserStatus(id, user, userinfo);
    user.addEventListener('click', function(e) {
        let elt = e.target;
        if(!elt || !(elt instanceof HTMLElement))
            throw new Error("Couldn't find user div");
        userMenu(elt);
    });

    let us = div.children;

    if(id === serverConnection.id) {
        if(us.length === 0)
            div.appendChild(user);
        else
            div.insertBefore(user, us[0]);
        return;
    }

    if(userinfo.username) {
        for(let i = 0; i < us.length; i++) {
            let child = us[i];
            let childid = child.id.slice('user-'.length);
            if(childid === serverConnection.id)
                continue;
            let childuser = serverConnection.users[childid] || null;
            let childname = (childuser && childuser.username) || null;
            if(!childname || stringCompare(childname, userinfo.username) > 0) {
                div.insertBefore(user, child);
                return;
            }
        }
    }

    div.appendChild(user);
}

 /**
  * @param {string} id
  * @param {user} userinfo
  */
function changeUser(id, userinfo) {
    let elt = document.getElementById('user-' + id);
    if(!elt) {
        console.warn('Unknown user ' + id);
        return;
    }
    setUserStatus(id, elt, userinfo);
}

/**
 * @param {string} id
 * @param {HTMLElement} elt
 * @param {user} userinfo
 */
function setUserStatus(id, elt, userinfo) {
    elt.textContent = userinfo.username ? userinfo.username : '(anon)';
    if(userinfo.data.raisehand)
        elt.classList.add('user-status-raisehand');
    else
        elt.classList.remove('user-status-raisehand');
}

/**
 * @param {string} id
 */
function delUser(id) {
    let div = document.getElementById('users');
    let user = document.getElementById('user-' + id);
    div.removeChild(user);
}

/**
 * @param {string} id
 * @param {string} kind
 */
function gotUser(id, kind) {
    switch(kind) {
    case 'add':
        addUser(id, serverConnection.users[id]);
        if(Object.keys(serverConnection.users).length == 3)
            reconsiderSendParameters();
        break;
    case 'delete':
        delUser(id);
        if(Object.keys(serverConnection.users).length < 3)
            scheduleReconsiderParameters();
        break;
    case 'change':
        changeUser(id, serverConnection.users[id]);
        break;
    default:
        console.warn('Unknown user kind', kind);
        break;
    }
}

function displayUsername() {
    document.getElementById('userspan').textContent = serverConnection.username;
    let op = serverConnection.permissions.indexOf('op') >= 0;
    let present = serverConnection.permissions.indexOf('present') >= 0;
    let text = '';
    if(op && present)
        text = '(op, presenter)';
    else if(op)
        text = 'operator';
    else if(present)
        text = 'presenter';
    document.getElementById('permspan').textContent = text;
}

let presentRequested = null;

/**
 * @param {string} s
 */
function capitalise(s) {
    if(s.length <= 0)
        return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * @param {string} title
 */
function setTitle(title) {
    function set(title) {
        document.title = title;
        document.getElementById('title').textContent = title;
    }
    if(title)
        set(title);
    else
        set('Galène');
}


/**
 * @this {ServerConnection}
 * @param {string} group
 * @param {Array<string>} perms
 * @param {Object<string,any>} status
 * @param {Object<string,any>} data
 * @param {string} message
 */
async function gotJoined(kind, group, perms, status, data, message) {
    let present = presentRequested;
    presentRequested = null;

    switch(kind) {
    case 'fail':
        displayError('The server said: ' + message);
        this.close();
        setButtonsVisibility();
        return;
    case 'redirect':
        this.close();
        document.location.href = message;
        return;
    case 'leave':
        this.close();
        setButtonsVisibility();
        return;
    case 'join':
    case 'change':
        groupStatus = status;
        setTitle((status && status.displayName) || capitalise(group));
        displayUsername();
        setButtonsVisibility();
        if(kind === 'change')
            return;
        break;
    default:
        displayError('Unknown join message');
        this.close();
        return;
    }

    let input = /** @type{HTMLTextAreaElement} */
        (document.getElementById('input'));
    input.placeholder = 'Type /help for help';
    setTimeout(() => {input.placeholder = '';}, 8000);

    if(status.locked)
        displayWarning('This group is locked');

    if(typeof RTCPeerConnection === 'undefined')
        displayWarning("This browser doesn't support WebRTC");
    else
        this.request(mapRequest(getSettings().request));

    if(serverConnection.permissions.indexOf('present') >= 0 &&
       !findUpMedia('camera')) {
        if(present) {
            if(present === 'mike')
                updateSettings({video: ''});
            else if(present === 'both')
                delSetting('video');
            reflectSettings();

            let button = getButtonElement('presentbutton');
            button.disabled = true;
            try {
                await addLocalMedia();
            } finally {
                button.disabled = false;
            }
        } else {
            displayMessage(
                "Press Enable to enable your camera or microphone"
            );
        }
    }
}

/** @type {Object<string,TransferredFile>} */
let transferredFiles = {};

/**
 * A file in the process of being transferred.
 *
 * @constructor
 */
function TransferredFile(id, userid, up, username, name, type, size) {
    /** @type {string} */
    this.id = id;
    /** @type {string} */
    this.userid = userid;
    /** @type {boolean} */
    this.up = up;
    /** @type {string} */
    this.username = username;
    /** @type {string} */
    this.name = name;
    /** @type {string} */
    this.type = type;
    /** @type {number} */
    this.size = size;
    /** @type {File} */
    this.file = null;
    /** @type {RTCPeerConnection} */
    this.pc = null;
    /** @type {RTCDataChannel} */
    this.dc = null;
    /** @type {Array<RTCIceCandidateInit>} */
    this.candidates = [];
    /** @type {Array<Blob|ArrayBuffer>} */
    this.data = [];
    /** @type {number} */
    this.datalen = 0;
}

TransferredFile.prototype.fullid = function() {
    return this.userid + (this.up ? '+' : '-') + this.id;
};

/**
 * @param {boolean} up
 * @param {string} userid
 * @param {string} fileid
 * @returns {TransferredFile}
 */
TransferredFile.get = function(up, userid, fileid) {
    return transferredFiles[userid + (up ? '+' : '-') + fileid];
};

TransferredFile.prototype.close = function() {
    if(this.dc) {
        this.dc.onclose = null;
        this.dc.onerror = null;
        this.dc.onmessage = null;
    }
    if(this.pc)
        this.pc.close();
    this.dc = null;
    this.pc = null;
    this.data = [];
    this.datalen = 0;
    delete(transferredFiles[this.fullid()]);
}

TransferredFile.prototype.pushData = function(data) {
    if(data instanceof Blob) {
        this.datalen += data.size;
    } else if(data instanceof ArrayBuffer) {
        this.datalen += data.byteLength;
    } else {
        throw new Error('unexpected type for received data');
    }
    this.data.push(data);
}

TransferredFile.prototype.getData = function() {
    let blob = new Blob(this.data, {type: this.type});
    if(blob.size != this.datalen)
        throw new Error('Inconsistent data size');
    this.data = [];
    this.datalen = 0;
    return blob;
}

/**
 * @param {TransferredFile} f
 */
function fileTransferBox(f) {
    let p = document.createElement('p');
    if(f.up)
        p.textContent =
        `We have offered to send a file called "${f.name}" ` +
        `to user ${f.username}.`;
    else
        p.textContent =
        `User ${f.username} offered to send us a file ` +
        `called "${f.name}" of size ${f.size}.`
    let bno = null, byes = null;
    if(f.up) {
        bno = document.createElement('button');
        bno.textContent = 'Cancel';
        bno.onclick = function(e) {
            cancelFile(f);
        };
        bno.id = "bno-" + f.fullid();
    } else {
        byes = document.createElement('button');
        byes.textContent = 'Accept';
        byes.onclick = function(e) {
            getFile(f);
        };
        byes.id = "byes-" + f.fullid();
        bno = document.createElement('button');
        bno.textContent = 'Decline';
        bno.onclick = function(e) {
            rejectFile(f);
        };
        bno.id = "bno-" + f.fullid();
    }
    let status = document.createElement('div');
    status.id = 'status-' + f.fullid();
    if(!f.up) {
        status.textContent =
            '(Choosing "Accept" will disclose your IP address.)';
    }
    let div = document.createElement('div');
    div.id = 'file-' + f.fullid();
    div.appendChild(p);
    if(byes)
        div.appendChild(byes);
    if(bno)
        div.appendChild(bno);
    div.appendChild(status);
    div.classList.add('message');
    div.classList.add('message-private');
    div.classList.add('message-row');
    let box = document.getElementById('box');
    box.appendChild(div);
    return div;
}

/**
 * @param {TransferredFile} f
 * @param {string} status
 * @param {boolean} [delyes]
 * @param {boolean} [delno]
 */
function setFileStatus(f, status, delyes, delno) {
    let statusdiv = document.getElementById('status-' + f.fullid());
    if(!statusdiv)
        throw new Error("Couldn't find statusdiv");
    statusdiv.textContent = status;
    if(delyes || delno) {
        let div = document.getElementById('file-' + f.fullid());
        if(!div)
            throw new Error("Couldn't find file div");
        if(delyes) {
            let byes = document.getElementById('byes-' + f.fullid())
            if(byes)
                div.removeChild(byes);
        }
        if(delno) {
            let bno = document.getElementById('bno-' + f.fullid())
            if(bno)
                div.removeChild(bno);
        }
    }
}

/**
 * @param {TransferredFile} f
 * @param {any} message
 */
function failFile(f, message) {
    if(!f.dc)
        return;
    console.error('File transfer failed:', message);
    setFileStatus(f, message ? `Failed: ${message}` : 'Failed.');
    f.close();
}

/**
 * @param {string} id
 * @param {File} file
 */
function offerFile(id, file) {
    let fileid = newRandomId();
    let username = serverConnection.users[id].username;
    let f = new TransferredFile(
        fileid, id, true, username, file.name, file.type, file.size,
    );
    f.file = file;
    transferredFiles[f.fullid()] = f;
    try {
        fileTransferBox(f);
        serverConnection.userMessage('offerfile', id, {
            id: fileid,
            name: f.name,
            size: f.size,
            type: f.type,
        });
    } catch(e) {
        displayError(e);
        f.close();
    }
}

/**
 * @param {TransferredFile} f
 */
function cancelFile(f) {
    serverConnection.userMessage('cancelfile', f.userid, {
        id: f.id,
    });
    f.close();
    setFileStatus(f, 'Cancelled.', true, true);
}

/**
 * @param {TransferredFile} f
 */
async function getFile(f) {
    if(f.pc)
        throw new Error("Download already in progress");
    setFileStatus(f, 'Connecting...', true);
    let pc = new RTCPeerConnection(serverConnection.getRTCConfiguration());
    if(!pc)
        throw new Error("Couldn't create peer connection");
    f.pc = pc;
    f.candidates = [];
    pc.onsignalingstatechange = function(e) {
        if(pc.signalingState === 'stable') {
            f.candidates.forEach(c => pc.addIceCandidate(c).catch(console.warn));
            f.candidates = [];
        }
    };
    pc.onicecandidate = function(e) {
        serverConnection.userMessage('filedownice', f.userid, {
            id: f.id,
            candidate: e.candidate,
        });
    };
    f.dc = pc.createDataChannel('file');
    f.data = [];
    f.datalen = 0;
    f.dc.onclose = function(e) {
        try {
            closeReceiveFileData(f);
        } catch(e) {
            failFile(f, e);
        }
    };
    f.dc.onmessage = function(e) {
        try {
            receiveFileData(f, e.data);
        } catch(e) {
            failFile(f, e);
        }
    };
    f.dc.onerror = function(e) {
        /** @ts-ignore */
        let err = e.error;
        failFile(f, err);
    };
    let offer = await pc.createOffer();
    if(!offer)
        throw new Error("Couldn't create offer");
    await pc.setLocalDescription(offer);
    serverConnection.userMessage('getfile', f.userid, {
        id: f.id,
        offer: pc.localDescription.sdp,
    });
    setFileStatus(f, 'Negotiating...', true);
}

/**
 * @param {TransferredFile} f
 */
async function rejectFile(f) {
    serverConnection.userMessage('rejectfile', f.userid, {
        id: f.id,
    });
    setFileStatus(f, 'Rejected.', true, true);
    f.close();
}

/**
 * @param {TransferredFile} f
 * @param {string} sdp
 */
async function sendOfferedFile(f, sdp) {
    if(f.pc)
        throw new Error('Transfer already in progress');

    setFileStatus(f, 'Negotiating...', true);
    let pc = new RTCPeerConnection(serverConnection.getRTCConfiguration());
    if(!pc)
        throw new Error("Couldn't create peer connection");
    f.pc = pc;
    f.candidates = [];
    pc.onicecandidate = function(e) {
        serverConnection.userMessage('fileupice', f.userid, {
            id: f.id,
            candidate: e.candidate,
        });
    };
    pc.onsignalingstatechange = function(e) {
        if(pc.signalingState === 'stable') {
            f.candidates.forEach(c => pc.addIceCandidate(c).catch(console.warn));
            f.candidates = [];
        }
    };
    pc.ondatachannel = function(e) {
        if(f.dc)
            throw new Error('Duplicate datachannel');
        f.dc = /** @type{RTCDataChannel} */(e.channel);
        f.dc.onclose = function(e) {
            try {
                closeSendFileData(f);
            } catch(e) {
                failFile(f, e);
            }
        };
        f.dc.onerror = function(e) {
            /** @ts-ignore */
            let err = e.error;
            failFile(f, err);
        }
        f.dc.onmessage = function(e) {
            try {
                ackSendFileData(f, e.data);
            } catch(e) {
                failFile(f, e);
            }
        };
        sendFileData(f).catch(e => failFile(f, e));
    };

    await pc.setRemoteDescription({
        type: 'offer',
        sdp: sdp,
    });

    let answer = await pc.createAnswer();
    if(!answer)
        throw new Error("Couldn't create answer");
    await pc.setLocalDescription(answer);
    serverConnection.userMessage('sendfile', f.userid, {
        id: f.id,
        answer: pc.localDescription.sdp,
    });
    setFileStatus(f, 'Uploading...', true);
}

/**
 * @param {TransferredFile} f
 * @param {string} sdp
 */
async function receiveFile(f, sdp) {
    await f.pc.setRemoteDescription({
        type: 'answer',
        sdp: sdp,
    });
    setFileStatus(f, 'Downloading...', true);
}

/**
 * @param {TransferredFile} f
 */
async function sendFileData(f) {
    let r = f.file.stream().getReader();

    f.dc.bufferedAmountLowThreshold = 65536;

    async function write(a) {
        while(f.dc.bufferedAmount > f.dc.bufferedAmountLowThreshold) {
            await new Promise((resolve, reject) => {
                if(!f.dc) {
                    reject(new Error('File is closed.'));
                    return;
                }
                f.dc.onbufferedamountlow = function(e) {
                    if(!f.dc) {
                        reject(new Error('File is closed.'));
                        return;
                    }
                    f.dc.onbufferedamountlow = null;
                    resolve();
                }
            });
        }
        f.dc.send(a);
        f.datalen += a.length;
        setFileStatus(f, `Uploading... ${f.datalen}/${f.size}`, true);
    }

    while(true) {
        let v = await r.read();
        if(v.done)
            break;
        if(!(v.value instanceof Uint8Array))
            throw new Error('Unexpected type for chunk');
        if(v.value.length <= 16384) {
            await write(v.value);
        } else {
            for(let i = 0; i < v.value.length; i += 16384) {
                let a = new Uint8Array(
                    v.value.buffer, i, Math.min(16384, v.value.length - i),
                );
                await write(a);
            }
        }
    }
}

/**
 * @param {TransferredFile} f
 */
function ackSendFileData(f, data) {
    if(data === 'done' && f.datalen == f.size)
        setFileStatus(f, 'Done.', true, true);
    else
        setFileStatus(f, 'Failed.', true, true);
    f.dc.onclose = null;
    f.dc.onerror = null;
    f.close();
}

/**
 * @param {TransferredFile} f
 */
function closeSendFileData(f) {
    setFileStatus(f, 'Failed.', true, true);
    f.close();
}

/**
 * @param {TransferredFile} f
 * @param {Blob|ArrayBuffer} data
 */
function receiveFileData(f, data) {
    f.pushData(data);
    setFileStatus(f, `Downloading... ${f.datalen}/${f.size}`, true);

    if(f.datalen < f.size)
        return;

    if(f.datalen != f.size) {
        setFileStatus(f, 'Failed.', true, true);
        f.close();
        return;
    }

    f.dc.onmessage = null;
    doneReceiveFileData(f);
}

/**
 * @param {TransferredFile} f
 */
async function doneReceiveFileData(f) {
    setFileStatus(f, 'Done.', true, true);
    let blob = f.getData();

    await new Promise((resolve, reject) => {
        let timer = setTimeout(function(e) { resolve(); }, 2000);
        f.dc.onclose = function(e) {
            clearTimeout(timer);
            resolve();
        };
        f.dc.onerror = function(e) {
            clearTimeout(timer);
            resolve();
        };
        f.dc.send('done');
    });

    f.dc.onclose = null;
    f.dc.onerror = null;
    f.close();

    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.textContent = f.name;
    a.download = f.name;
    a.type = f.type;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * @param {TransferredFile} f
 */
function closeReceiveFileData(f) {
    if(f.datalen !== f.size) {
        setFileStatus(f, 'Failed.', true, true)
        f.close();
    }
}

/**
 * @param {string} id
 * @param {string} dest
 * @param {string} username
 * @param {number} time
 * @param {boolean} privileged
 * @param {string} kind
 * @param {any} message
 */
function gotUserMessage(id, dest, username, time, privileged, kind, message) {
    switch(kind) {
    case 'kicked':
    case 'error':
    case 'warning':
    case 'info':
        let from = id ? (username || 'Anonymous') : 'The Server';
        if(privileged)
            displayError(`${from} said: ${message}`, kind);
        else
            console.error(`Got unprivileged message of kind ${kind}`);
        break;
    case 'mute':
        if(privileged) {
            setLocalMute(true, true);
            let by = username ? ' by ' + username : '';
            displayWarning(`You have been muted${by}`);
        } else {
            console.error(`Got unprivileged message of kind ${kind}`);
        }
        break;
    case 'clearchat':
        if(privileged) {
            clearChat();
        } else {
            console.error(`Got unprivileged message of kind ${kind}`);
        }
        break;
    case 'offerfile': {
        let f = new TransferredFile(
            message.id, id, false, username,
            message.name, message.type, message.size,
        );
        transferredFiles[f.fullid()] = f;
        fileTransferBox(f);
        break;
    }
    case 'cancelfile': {
        let f = TransferredFile.get(false, id, message.id);
        if(!f)
            throw new Error('unexpected cancelfile');
        setFileStatus(f, 'Cancelled.', true, true);
        f.close();
        break;
    }
    case 'getfile': {
        let f = TransferredFile.get(true, id, message.id);
        if(!f)
            throw new Error('unexpected getfile');
        sendOfferedFile(f, message.offer);
        break;
    }
    case 'rejectfile': {
        let f = TransferredFile.get(true, id, message.id);
        if(!f)
            throw new Error('unexpected rejectfile');
        setFileStatus(f, 'Rejected.', true, true);
        f.close();
        break;
    }
    case 'sendfile': {
        let f = TransferredFile.get(false, id, message.id);
        if(!f)
            throw new Error('unexpected sendfile');
        receiveFile(f, message.answer);
        break;
    }
    case 'filedownice': {
        let f = TransferredFile.get(true, id, message.id);
        if(!f.pc) {
            console.warn('Unexpected filedownice');
            return;
        }
        if(f.pc.signalingState === 'stable')
            f.pc.addIceCandidate(message.candidate).catch(console.warn);
        else
            f.candidates.push(message.candidate);
        break;
    }
    case 'fileupice': {
        let f = TransferredFile.get(false, id, message.id);
        if(!f.pc) {
            console.warn('Unexpected fileupice');
            return;
        }
        if(f.pc.signalingState === 'stable')
            f.pc.addIceCandidate(message.candidate).catch(console.warn);
        else
            f.candidates.push(message.candidate);
        break;

    }
    default:
        console.warn(`Got unknown user message ${kind}`);
        break;
    }
};


const urlRegexp = /https?:\/\/[-a-zA-Z0-9@:%/._\\+~#&()=?]+[-a-zA-Z0-9@:%/_\\+~#&()=]/g;

/**
 * @param {string} line
 * @returns {Array.<Text|HTMLElement>}
 */
function formatLine(line) {
    let r = new RegExp(urlRegexp);
    let result = [];
    let pos = 0;
    while(true) {
        let m = r.exec(line);
        if(!m)
            break;
        result.push(document.createTextNode(line.slice(pos, m.index)));
        let a = document.createElement('a');
        a.href = m[0];
        a.textContent = m[0];
        a.target = '_blank';
        a.rel = 'noreferrer noopener';
        result.push(a);
        pos = m.index + m[0].length;
    }
    result.push(document.createTextNode(line.slice(pos)));
    return result;
}

/**
 * @param {number} time
 * @returns {string}
 */
function formatTime(time) {
    let delta = Date.now() - time;
    let date = new Date(time);
    let m = date.getMinutes();
    if(delta > -30000)
        return date.getHours() + ':' + ((m < 10) ? '0' : '') + m;
    return date.toLocaleString();
}

/**
 * @typedef {Object} lastMessage
 * @property {string} [nick]
 * @property {string} [peerId]
 * @property {string} [dest]
 * @property {number} [time]
 */

/** @type {lastMessage} */
let lastMessage = {};

/**
 * @param {string} peerId
 * @param {string} dest
 * @param {string} nick
 * @param {number} time
 * @param {boolean} privileged
 * @param {boolean} history
 * @param {string} kind
 * @param {unknown} message
 */
function addToChatbox(peerId, dest, nick, time, privileged, history, kind, message) {
    let row = document.createElement('div');
    row.classList.add('message-row');
    let container = document.createElement('div');
    container.classList.add('message');
    row.appendChild(container);
    let footer = document.createElement('p');
    footer.classList.add('message-footer');
    if(!peerId)
        container.classList.add('message-system');
    if(serverConnection && peerId === serverConnection.id)
        container.classList.add('message-sender');
    if(dest)
        container.classList.add('message-private');

    if(kind !== 'me') {
        let p = document.createElement('p');
        p.textContent = message.toString();
        let doHeader = true;
        if(!peerId && !dest && !nick) {
            doHeader = false;
        } else if(lastMessage.nick !== (nick || null) ||
                  lastMessage.peerId !== peerId ||
                  lastMessage.dest !== (dest || null) ||
                  !time || !lastMessage.time) {
            doHeader = true;
        } else {
            let delta = time - lastMessage.time;
            doHeader = delta < 0 || delta > 60000;
        }

        if(doHeader) {
            let header = document.createElement('p');
            if(peerId || nick || dest) {
                let user = document.createElement('span');
                let u = serverConnection.users[dest];
                let name = (u && u.username);
                user.textContent = dest ?
                    `${nick||'(anon)'} \u2192 ${name || '(anon)'}` :
                    (nick || '(anon)');
                user.classList.add('message-user');
                header.appendChild(user);
            }
            header.classList.add('message-header');
            container.appendChild(header);
            if(time) {
                let tm = document.createElement('span');
                tm.textContent = formatTime(time);
                tm.classList.add('message-time');
                header.appendChild(tm);
            }
        }

        p.classList.add('message-content');
        container.appendChild(p);
        lastMessage.nick = (nick || null);
        lastMessage.peerId = peerId;
        lastMessage.dest = (dest || null);
        lastMessage.time = (time || null);
    } else {
        let asterisk = document.createElement('span');
        asterisk.textContent = '*';
        asterisk.classList.add('message-me-asterisk');
        let user = document.createElement('span');
        user.textContent = nick || '(anon)';
        user.classList.add('message-me-user');
        let content = document.createElement('span');
        formatLine(message.toString()).forEach(elt => {
            content.appendChild(elt);
        });
        content.classList.add('message-me-content');
        container.appendChild(asterisk);
        container.appendChild(user);
        container.appendChild(content);
        container.classList.add('message-me');
        lastMessage = {};
    }
    container.appendChild(footer);

    let box = document.getElementById('box');
    box.appendChild(row);
    if(box.scrollHeight > box.clientHeight) {
        box.scrollTop = box.scrollHeight - box.clientHeight;
    }

    return message;
}

/**
 * @param {string} message
 */
function localMessage(message) {
    return addToChatbox(null, null, null, Date.now(), false, false, '', message);
}

function clearChat() {
    lastMessage = {};
    document.getElementById('box').textContent = '';
}

/**
 * A command known to the command-line parser.
 *
 * @typedef {Object} command
 * @property {string} [parameters]
 *     - A user-readable list of parameters.
 * @property {string} [description]
 *     - A user-readable description, null if undocumented.
 * @property {() => string} [predicate]
 *     - Returns null if the command is available.
 * @property {(c: string, r: string) => void} f
 */

/**
 * The set of commands known to the command-line parser.
 *
 * @type {Object.<string,command>}
 */
let commands = {};

function operatorPredicate() {
    if(serverConnection && serverConnection.permissions &&
       serverConnection.permissions.indexOf('op') >= 0)
        return null;
    return 'You are not an operator';
}

function recordingPredicate() {
    if(serverConnection && serverConnection.permissions &&
       serverConnection.permissions.indexOf('record') >= 0)
        return null;
    return 'You are not allowed to record';
}

commands.help = {
    description: 'display this help',
    f: (c, r) => {
        /** @type {string[]} */
        let cs = [];
        for(let cmd in commands) {
            let c = commands[cmd];
            if(!c.description)
                continue;
            if(c.predicate && c.predicate())
                continue;
            cs.push(`/${cmd}${c.parameters?' ' + c.parameters:''}: ${c.description}`);
        }
        localMessage(cs.sort().join('\n'));
    }
};

commands.me = {
    f: (c, r) => {
        // handled as a special case
        throw new Error("this shouldn't happen");
    }
};

commands.set = {
    f: (c, r) => {
        if(!r) {
            let settings = getSettings();
            let s = "";
            for(let key in settings)
                s = s + `${key}: ${JSON.stringify(settings[key])}\n`;
            localMessage(s);
            return;
        }
        let p = parseCommand(r);
        let value;
        if(p[1]) {
            value = JSON.parse(p[1]);
        } else {
            value = true;
        }
        updateSetting(p[0], value);
        reflectSettings();
    }
};

commands.unset = {
    f: (c, r) => {
        delSetting(r.trim());
        return;
    }
};

commands.leave = {
    description: "leave group",
    f: (c, r) => {
        if(!serverConnection)
            throw new Error('Not connected');
        serverConnection.close();
    }
};

commands.clear = {
    predicate: operatorPredicate,
    description: 'clear the chat history',
    f: (c, r) => {
        serverConnection.groupAction('clearchat');
    }
};

commands.lock = {
    predicate: operatorPredicate,
    description: 'lock this group',
    parameters: '[message]',
    f: (c, r) => {
        serverConnection.groupAction('lock', r);
    }
};

commands.unlock = {
    predicate: operatorPredicate,
    description: 'unlock this group, revert the effect of /lock',
    f: (c, r) => {
        serverConnection.groupAction('unlock');
    }
};

commands.record = {
    predicate: recordingPredicate,
    description: 'start recording',
    f: (c, r) => {
        serverConnection.groupAction('record');
    }
};

commands.unrecord = {
    predicate: recordingPredicate,
    description: 'stop recording',
    f: (c, r) => {
        serverConnection.groupAction('unrecord');
    }
};

commands.subgroups = {
    predicate: operatorPredicate,
    description: 'list subgroups',
    f: (c, r) => {
        serverConnection.groupAction('subgroups');
    }
};

function renegotiateStreams() {
    for(let id in serverConnection.up)
        serverConnection.up[id].restartIce();
    for(let id in serverConnection.down)
        serverConnection.down[id].restartIce();
}

commands.renegotiate = {
    description: 'renegotiate media streams',
    f: (c, r) => {
        renegotiateStreams();
    }
};

commands.replace = {
    f: (c, r) => {
        replaceUpStreams(null);
    }
};


/**
 * parseCommand splits a string into two space-separated parts.  The first
 * part may be quoted and may include backslash escapes.
 *
 * @param {string} line
 * @returns {string[]}
 */
function parseCommand(line) {
    let i = 0;
    while(i < line.length && line[i] === ' ')
        i++;
    let start = ' ';
    if(i < line.length && line[i] === '"' || line[i] === "'") {
        start = line[i];
        i++;
    }
    let first = "";
    while(i < line.length) {
        if(line[i] === start) {
            if(start !== ' ')
                i++;
            break;
        }
        if(line[i] === '\\' && i < line.length - 1)
            i++;
        first = first + line[i];
        i++;
    }

    while(i < line.length && line[i] === ' ')
        i++;
    return [first, line.slice(i)];
}

/**
 * @param {string} user
 */
function findUserId(user) {
    if(user in serverConnection.users)
        return user;

    for(let id in serverConnection.users) {
        let u = serverConnection.users[id];
        if(u && u.username === user)
            return id;
    }
    return null;
}

commands.msg = {
    parameters: 'user message',
    description: 'send a private message',
    f: (c, r) => {
        let p = parseCommand(r);
        if(!p[0])
            throw new Error('/msg requires parameters');
        let id = findUserId(p[0]);
        if(!id)
            throw new Error(`Unknown user ${p[0]}`);
        serverConnection.chat('', id, p[1]);
        addToChatbox(serverConnection.id, id, serverConnection.username,
                     Date.now(), false, false, '', p[1]);
    }
};

/**
   @param {string} c
   @param {string} r
*/
function userCommand(c, r) {
    let p = parseCommand(r);
    if(!p[0])
        throw new Error(`/${c} requires parameters`);
    let id = findUserId(p[0]);
    if(!id)
        throw new Error(`Unknown user ${p[0]}`);
    serverConnection.userAction(c, id, p[1]);
}

function userMessage(c, r) {
    let p = parseCommand(r);
    if(!p[0])
        throw new Error(`/${c} requires parameters`);
    let id = findUserId(p[0]);
    if(!id)
        throw new Error(`Unknown user ${p[0]}`);
    serverConnection.userMessage(c, id, p[1]);
}

commands.kick = {
    parameters: 'user [message]',
    description: 'kick out a user',
    predicate: operatorPredicate,
    f: userCommand,
};

commands.op = {
    parameters: 'user',
    description: 'give operator status',
    predicate: operatorPredicate,
    f: userCommand,
};

commands.unop = {
    parameters: 'user',
    description: 'revoke operator status',
    predicate: operatorPredicate,
    f: userCommand,
};

commands.present = {
    parameters: 'user',
    description: 'give user the right to present',
    predicate: operatorPredicate,
    f: userCommand,
};

commands.unpresent = {
    parameters: 'user',
    description: 'revoke the right to present',
    predicate: operatorPredicate,
    f: userCommand,
};

commands.mute = {
    parameters: 'user',
    description: 'mute a remote user',
    predicate: operatorPredicate,
    f: userMessage,
};

commands.muteall = {
    description: 'mute all remote users',
    predicate: operatorPredicate,
    f: (c, r) => {
        serverConnection.userMessage('mute', null, null, true);
    }
}

commands.warn = {
    parameters: 'user message',
    description: 'send a warning to a user',
    predicate: operatorPredicate,
    f: (c, r) => {
        userMessage('warning', r);
    },
};

commands.wall = {
    parameters: 'message',
    description: 'send a warning to all users',
    predicate: operatorPredicate,
    f: (c, r) => {
        if(!r)
            throw new Error('empty message');
        serverConnection.userMessage('warning', '', r);
    },
};

commands.raise = {
    description: 'raise hand',
    f: (c, r) => {
        serverConnection.userAction(
            "setdata", serverConnection.id, {"raisehand": true},
        );
    }
}

commands.unraise = {
    description: 'unraise hand',
    f: (c, r) => {
        serverConnection.userAction(
            "setdata", serverConnection.id, {"raisehand": null},
        );
    }
}

/** @returns {boolean} */
function canFile() {
    let v =
        /** @ts-ignore */
        !!HTMLVideoElement.prototype.captureStream ||
        /** @ts-ignore */
        !!HTMLVideoElement.prototype.mozCaptureStream;
    return v;
}

function presentFile() {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept="audio/*,video/*";
    input.onchange = function(e) {
        if(!(this instanceof HTMLInputElement))
            throw new Error('Unexpected type for this');
        let files = this.files;
        for(let i = 0; i < files.length; i++) {
            addFileMedia(files[i]).catch(e => {
                console.error(e);
                displayError(e);
            });
        }
    };
    input.click();
}

commands.presentfile = {
    description: 'broadcast a video or audio file',
    f: (c, r) => {
        presentFile();
    },
    predicate: () => {
        if(!canFile())
            return 'Your browser does not support presenting arbitrary files';
        if(!serverConnection || !serverConnection.permissions ||
           serverConnection.permissions.indexOf('present') < 0)
            return 'You are not authorised to present.';
        return null;
    }
};


/**
 * @param {string} id
 */
function sendFile(id) {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = function(e) {
        if(!(this instanceof HTMLInputElement))
            throw new Error('Unexpected type for this');
        let files = this.files;
        for(let i = 0; i < files.length; i++) {
            try {
                offerFile(id, files[i]);
            } catch(e) {
                console.error(e);
                displayError(e);
            }
        }
    };
    input.click();
}

commands.sendfile = {
    parameters: 'user',
    description: 'send a file (this will disclose your IP address)',
    f: (c, r) => {
        let p = parseCommand(r);
        if(!p[0])
            throw new Error(`/${c} requires parameters`);
        let id = findUserId(p[0]);
        if(!id)
            throw new Error(`Unknown user ${p[0]}`);
        sendFile(id);
    },
};

/**
 * Test loopback through a TURN relay.
 *
 * @returns {Promise<number>}
 */
async function relayTest() {
    if(!serverConnection)
        throw new Error('not connected');
    let conf = Object.assign({}, serverConnection.getRTCConfiguration());
    conf.iceTransportPolicy = 'relay';
    let pc1 = new RTCPeerConnection(conf);
    let pc2 = new RTCPeerConnection(conf);
    pc1.onicecandidate = e => {e.candidate && pc2.addIceCandidate(e.candidate);};
    pc2.onicecandidate = e => {e.candidate && pc1.addIceCandidate(e.candidate);};
    try {
        return await new Promise(async (resolve, reject) => {
            let d1 = pc1.createDataChannel('loopbackTest');
            d1.onopen = e => {
                d1.send(Date.now().toString());
            };

            let offer = await pc1.createOffer();
            await pc1.setLocalDescription(offer);
            await pc2.setRemoteDescription(pc1.localDescription);
            let answer = await pc2.createAnswer();
            await pc2.setLocalDescription(answer);
            await pc1.setRemoteDescription(pc2.localDescription);

            pc2.ondatachannel = e => {
                let d2 = e.channel;
                d2.onmessage = e => {
                    let t = parseInt(e.data);
                    if(isNaN(t))
                        reject(new Error('corrupt data'));
                    else
                        resolve(Date.now() - t);
                }
            }

            setTimeout(() => reject(new Error('timeout')), 5000);
        })
    } finally {
        pc1.close();
        pc2.close();
    }
}

commands['relay-test'] = {
    f: async (c, r) => {
        localMessage('Relay test in progress...');
        try {
            let s = Date.now();
            let rtt = await relayTest();
            let e = Date.now();
            localMessage(`Relay test successful in ${e-s}ms, RTT ${rtt}ms`);
        } catch(e) {
            localMessage(`Relay test failed: ${e}`);
        }
    }
}

function handleInput() {
    let input = /** @type {HTMLTextAreaElement} */
        (document.getElementById('input'));
    let data = input.value;
    input.value = '';

    let message, me;

    if(data === '')
        return;

    if(data[0] === '/') {
        if(data.length > 1 && data[1] === '/') {
            message = data.slice(1);
            me = false;
        } else {
            let cmd, rest;
            let space = data.indexOf(' ');
            if(space < 0) {
                cmd = data.slice(1);
                rest = '';
            } else {
                cmd = data.slice(1, space);
                rest = data.slice(space + 1);
            }

            if(cmd === 'me') {
                message = rest;
                me = true;
            } else {
                let c = commands[cmd];
                if(!c) {
                    displayError(`Uknown command /${cmd}, type /help for help`);
                    return;
                }
                if(c.predicate) {
                    let s = c.predicate();
                    if(s) {
                        displayError(s);
                        return;
                    }
                }
                try {
                    c.f(cmd, rest);
                } catch(e) {
                    console.error(e);
                    displayError(e);
                }
                return;
            }
        }
    } else {
        message = data;
        me = false;
    }

    if(!serverConnection || !serverConnection.socket) {
        displayError("Not connected.");
        return;
    }

    try {
        serverConnection.chat(me ? 'me' : '', '', message);
    } catch(e) {
        console.error(e);
        displayError(e);
    }
}

document.getElementById('inputform').onsubmit = function(e) {
    e.preventDefault();
    handleInput();
};

document.getElementById('input').onkeypress = function(e) {
    if(e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        e.preventDefault();
        handleInput();
    }
};

function chatResizer(e) {
    e.preventDefault();
    let full_width = document.getElementById("mainrow").offsetWidth;
    let left = document.getElementById("left");
    let right = document.getElementById("right");

    let start_x = e.clientX;
    let start_width = left.offsetWidth;

    function start_drag(e) {
        let left_width = (start_width + e.clientX - start_x) * 100 / full_width;
        // set min chat width to 300px
        let min_left_width = 300 * 100 / full_width;
        if (left_width < min_left_width) {
          return;
        }
        left.style.flex = left_width.toString();
        right.style.flex = (100 - left_width).toString();
    }
    function stop_drag(e) {
        document.documentElement.removeEventListener(
            'mousemove', start_drag, false,
        );
        document.documentElement.removeEventListener(
            'mouseup', stop_drag, false,
        );
    }

    document.documentElement.addEventListener(
        'mousemove', start_drag, false,
    );
    document.documentElement.addEventListener(
        'mouseup', stop_drag, false,
    );
}

document.getElementById('resizer').addEventListener('mousedown', chatResizer, false);

/**
 * @param {unknown} message
 * @param {string} [level]
 */
function displayError(message, level) {
    if(!level)
        level = "error";
    var background = 'linear-gradient(to right, #e20a0a, #df2d2d)';
    var position = 'center';
    var gravity = 'top';

    switch(level) {
    case "info":
        background = 'linear-gradient(to right, #529518, #96c93d)';
        position = 'right';
        gravity = 'bottom';
        break;
    case "warning":
        background = "linear-gradient(to right, #bdc511, #c2cf01)";
        break;
    case "kicked":
        level = "error";
        break;
    }

    /** @ts-ignore */
    Toastify({
        text: message,
        duration: 4000,
        close: true,
        position: position,
        gravity: gravity,
        style: {
            background: background,
        },
        className: level,
    }).showToast();
}

/**
 * @param {unknown} message
 */
function displayWarning(message) {
    return displayError(message, "warning");
}

/**
 * @param {unknown} message
 */
function displayMessage(message) {
    return displayError(message, "info");
}

let connecting = false;

document.getElementById('userform').onsubmit = async function(e) {
    e.preventDefault();
    if(connecting)
        return;
    connecting = true;
    try {
        await serverConnect();
    } finally {
        connecting = false;
    }

    if(getInputElement('presentboth').checked)
        presentRequested = 'both';
    else if(getInputElement('presentmike').checked)
        presentRequested = 'mike';
    else
        presentRequested = null;

    getInputElement('presentoff').checked = true;
};

document.getElementById('disconnectbutton').onclick = function(e) {
    serverConnection.close();
    closeNav();
};

function openNav() {
    document.getElementById("sidebarnav").style.width = "250px";
}

function closeNav() {
    document.getElementById("sidebarnav").style.width = "0";
}

document.getElementById('sidebarCollapse').onclick = function(e) {
    document.getElementById("left-sidebar").classList.toggle("active");
    document.getElementById("mainrow").classList.toggle("full-width-active");
};

document.getElementById('openside').onclick = function(e) {
      e.preventDefault();
      let sidewidth = document.getElementById("sidebarnav").style.width;
      if (sidewidth !== "0px" && sidewidth !== "") {
          closeNav();
          return;
      } else {
          openNav();
      }
};


document.getElementById('clodeside').onclick = function(e) {
    e.preventDefault();
    closeNav();
};

document.getElementById('collapse-video').onclick = function(e) {
    e.preventDefault();
    setVisibility('collapse-video', false);
    setVisibility('show-video', true);
    hideVideo(true);
};

document.getElementById('show-video').onclick = function(e) {
    e.preventDefault();
    setVisibility('video-container', true);
    setVisibility('collapse-video', true);
    setVisibility('show-video', false);
};

document.getElementById('close-chat').onclick = function(e) {
    e.preventDefault();
    setVisibility('left', false);
    setVisibility('show-chat', true);
    resizePeers();
};

document.getElementById('show-chat').onclick = function(e) {
    e.preventDefault();
    setVisibility('left', true);
    setVisibility('show-chat', false);
    resizePeers();
};

async function serverConnect() {
    if(serverConnection && serverConnection.socket)
        serverConnection.close();
    serverConnection = new ServerConnection();
    serverConnection.onconnected = gotConnected;
    serverConnection.onpeerconnection = onPeerConnection;
    serverConnection.onclose = gotClose;
    serverConnection.ondownstream = gotDownStream;
    serverConnection.onuser = gotUser;
    serverConnection.onjoined = gotJoined;
    serverConnection.onchat = addToChatbox;
    serverConnection.onusermessage = gotUserMessage;

    let url = `ws${location.protocol === 'https:' ? 's' : ''}://${location.host}/ws`;
    try {
        await serverConnection.connect(url);
    } catch(e) {
        console.error(e);
        displayError(e.message ? e.message : "Couldn't connect to " + url);
    }
}

async function start() {
    group = decodeURIComponent(
        location.pathname.replace(/^\/[a-z]*\//, '').replace(/\/$/, '')
    );

    /** @type {Object} */
    try {
        let r = await fetch(".status.json")
        if(!r.ok)
            throw new Error(`${r.status} ${r.statusText}`);
        groupStatus = await r.json()
    } catch(e) {
        console.error(e);
        return;
    }

    let parms = new URLSearchParams(window.location.search);
    if(window.location.search)
        window.history.replaceState(null, '', window.location.pathname);
    setTitle(groupStatus.displayName || capitalise(group));

    addFilters();
    setMediaChoices(false).then(e => reflectSettings());

    if(parms.has('token')) {
        token = parms.get('token');
        await serverConnect();
    } else if(groupStatus.authPortal) {
        window.location.href = groupStatus.authPortal;
    } else {
        let container = document.getElementById("login-container");
        container.classList.remove('invisible');
    }
    setViewportHeight();
}

start();
