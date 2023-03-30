const electron = require('electron');
const fs = require("fs");
const { shell } = require('electron'); //used in html to open links
const { ipcRenderer } = require('electron');

const dataFolderPath = (electron.app || electron.remote.app).getPath('userData');
const userPrefsPath = dataFolderPath + "/data/user_prefs.json";

var langJson = {};

var usedLanguage = 'en_US';
var isFirstLaunchNewUpdate = false;
var isAppLoading = true;
var isFirstMenuLoading = true;

ipcRenderer.send('is_newupdate_firstlaunch');
ipcRenderer.on('is_newupdate_firstlaunch', (event, arg) => {
    ipcRenderer.removeAllListeners('is_newupdate_firstlaunch');
    if (arg.isFirstLaunchNewUpdate == true) isFirstLaunchNewUpdate = true;
});

//settings values, default in file
var prefs = {
    autostart: null, //steam, rockstar or epic
    notifications: true,
    runatstartup: false,
    selectedmenu: null,

    language: 'en_US'
};

var menus = {}; //rien a mettre ici hein
var selectedmenu;

function loadLangJson(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'lang.json', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}

//instantly executing it to load lang.json
loadLangJson(function (resp) {
    langJson = JSON.parse(resp);
    document.dispatchEvent(loadedEvent);
})

function loadPrefs() {
    if (fs.existsSync(dataFolderPath + "/data/")) {
        if (fs.existsSync(userPrefsPath)) {
            var userPrefsContent = JSON.parse(fs.readFileSync(userPrefsPath, 'utf-8').toString());
            var userPrefs = userPrefsContent.preferences;
            Object.keys(prefs).forEach(function (key) {
                if (userPrefs[key] === undefined) {
                    userPrefs[key] = prefs[key];
                } else {
                    prefs[key] = userPrefs[key];
                }
            });
            fs.writeFileSync(userPrefsPath, JSON.stringify(userPrefsContent, null, 4));
            if (prefs['hardwareacceleration'] == true) settingsCheckbox('settings-hardware-acceleration', true, false);
            if (prefs['notifications'] == true) settingsCheckbox('settings-notifications', true, false);
            if (prefs['runatstartup'] == true) settingsCheckbox('settings-runatstartup', true, false);
            if (prefs['autostart'] == 'steam' || prefs['autostart'] == 'rockstargames' || prefs['autostart'] == 'epicgames') {
                document.getElementById('settings-autostart-' + prefs['autostart']).classList.add('selected');
            }
            document.getElementById('settings-language').value = prefs['language'];
            setTimeout(function () {
                changeLanguage(prefs['language']);
            }, 0);
        } else {
            console.log("File user_prefs.json not found, creating one..");

            var initialContent = { "preferences": {} };
            fs.writeFileSync(userPrefsPath, JSON.stringify(initialContent, null, 4), 'utf-8');
            loadPrefs();
            return;
        }
    } else {
        fs.mkdirSync(dataFolderPath + "/data/");
        loadPrefs();
        return;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    loadPrefs();

    //on renseigne les infos du build dans l'app ici
    ipcRenderer.send('app_version');
    ipcRenderer.on('app_version', (event, arg) => {
        ipcRenderer.removeAllListeners('app_version');
        console.log("SensX version is " + arg.version);
        document.getElementById('settings-app-version').innerText = arg.version;
    });

    ipcRenderer.send('app_lastupdated');
    ipcRenderer.on('app_lastupdated', (event, arg) => {
        ipcRenderer.removeAllListeners('app_lastupdated');
        document.getElementById('settings-last-updated').innerText = arg.lastUpdated;
    });

    ipcRenderer.send('app_serverstatus');
    ipcRenderer.on('app_serverstatus', (event, arg) => {
        ipcRenderer.removeAllListeners('app_serverstatus');
        document.getElementById('settings-server-status').innerText = arg.serverStatus;
    });

    ipcRenderer.send('app_gameversion');
    ipcRenderer.on('app_gameversion', (event, arg) => {
        ipcRenderer.removeAllListeners('app_gameversion');
        document.getElementById('settings-game-version').innerText = arg.gameVersion;
    });

    ipcRenderer.send('app_changelogs');
    ipcRenderer.on('app_changelogs', (event, arg) => {
        ipcRenderer.removeAllListeners('app_changelogs');
        document.getElementById('changelogs-pane').innerHTML = document.getElementById('changelogs-pane').innerHTML.substring(0, document.getElementById('changelogs-pane').innerHTML.indexOf('</h1>')) + '</h1>' + arg.changelogs;
    });

    setTimeout(function () { //we just add a backdrop filter (blur) property to add random element so it loads up the property for the animations with use this property, if not added, settingWindow and flWindow animations will skip the first time played
        document.getElementById('backdropDebugger').style.backdropFilter = 'blur(10px)';
    }, 100)
});

function settingsWindow() {
    if (isAppLoading) return;

    var settingsWindow = document.getElementById('settingswindow');
    var settingsPane = document.getElementById('settings-pane');
    if (settingsWindow.style.opacity == 0) { //will show
        navSettings('general');
        loadPrefs();
        settingsWindow.style.display = 'block';
        settingsPane.style.left = '30px';
        setTimeout(function () {
            settingsPane.style.left = '0px';
            settingsWindow.style.opacity = 1;
        }, 0)
    } else { //will hide
        settingsWindow.style.opacity = 0;
        settingsPane.style.left = '30px';
        setTimeout(function () {
            settingsWindow.style.display = 'none';
            settingsPane.style.left = '0px';
        }, 100)
    }
}

function navSettings(pane) {
    var samePage = false;
    document.getElementById('settings-pane').childNodes.forEach(function (settingsPane) {
        if (settingsPane.id == pane + '-pane' && settingsPane.className != 'hidden') samePage = true;
        else settingsPane.className = 'hidden';
    });
    if (samePage) return;
    supportReqType(0);
    document.getElementById(pane + '-pane').className = '';
    document.getElementById(pane + '-pane').style.opacity = 0;
    setTimeout(function () {
        document.getElementById(pane + '-pane').style.opacity = 1;
    }, 100);
}

function supportReqType(number) {
    var bugreport = document.getElementById('support-bugreport');
    var suggestion = document.getElementById('support-suggestion');
    if (number == 0) { //bug
        if (bugreport.className == 'selected') return;
        bugreport.className = 'selected';
        suggestion.className = '';
    } else if (number == 1) { //suggestion
        if (suggestion.className == 'selected') return;
        bugreport.className = '';
        suggestion.className = 'selected';
    }
}

function settingsCheckbox(id, value, changeSettings) {
    var cb = document.getElementById(id);
    if (value == 'switch') {
        if (cb.className.includes('disabled')) {
            cb.className = cb.className.replace('disabled', 'enabled');
            cb.innerHTML = '<span style="position: absolute;">✓</span>';
            value = true;
        }
        else {
            cb.className = cb.className.replace('enabled', 'disabled');
            cb.innerHTML = '<span style="position: absolute;">×</span>';
            value = false;
        }
    } else {
        if (value) {
            cb.className = cb.className.replace('disabled', 'enabled');
            cb.innerHTML = '<span style="position: absolute;">✓</span>';
        }
        else {
            cb.className = cb.className.replace('enabled', 'disabled');
            cb.innerHTML = '<span style="position: absolute;">×</span>';
        }
    }

    if (changeSettings) {
        var userPrefsContent = JSON.parse(fs.readFileSync(userPrefsPath, 'utf-8').toString());
        userPrefsContent['preferences'][id.replace('settings-', '').replace('-', '')] = value;
        fs.writeFileSync(userPrefsPath, JSON.stringify(userPrefsContent, null, 4));
    }
}

function settingsAutoStart(platform) {
    var steam = document.getElementById('settings-autostart-steam');
    var rockstargames = document.getElementById('settings-autostart-rockstargames');
    var epicgames = document.getElementById('settings-autostart-epicgames');
    steam.className = steam.className.replace('selected', '');
    rockstargames.className = rockstargames.className.replace('selected', '');
    epicgames.className = epicgames.className.replace('selected', '');
    document.getElementById('settings-autostart-' + platform).classList.add('selected');

    var userPrefsContent = JSON.parse(fs.readFileSync(userPrefsPath, 'utf-8').toString());
    userPrefsContent['preferences']['autostart'] = platform;
    fs.writeFileSync(userPrefsPath, JSON.stringify(userPrefsContent, null, 4));
}

function flWindow() {
    if (isAppLoading) return;

    var flWindow = document.getElementById('flwindow');
    if (document.getElementById('settingswindow').style.opacity == 1) return;
    if (flWindow.style.opacity == 0) { //will show
        document.querySelectorAll('.menu').forEach(function (menu) {
            menu.style.top = '20px';
        });
        flWindow.style.display = 'block';
        setTimeout(function () {
            flWindow.style.opacity = 1;
            document.querySelectorAll('.menu').forEach(function (menu) {
                menu.style.top = '0px';
            });
            setTimeout(function () {
                document.getElementById('cards-container').style.backdropFilter = 'blur(7px)';
            }, 200);
        }, 0)
    } else { //will hide
        document.querySelectorAll('.menu').forEach(function (menu) {
            menu.style.top = '20px';
        });
        flWindow.style.opacity = 0;
        setTimeout(function () {
            flWindow.style.display = 'none';
        }, 100);
    }
}

function languageChanged() {
    var userPrefsContent = JSON.parse(fs.readFileSync(userPrefsPath, 'utf-8').toString());
    userPrefsContent['preferences']['language'] = document.getElementById('settings-language').value;
    fs.writeFileSync(userPrefsPath, JSON.stringify(userPrefsContent, null, 4));
    changeLanguage(document.getElementById('settings-language').value);
}

function addMenu(name, image, status, version, lastUpdated, openingKey, feature1, feature2, feature3, changelogs, color, color2, author, discord, youtube, getKeyLink, isLocked) {
    var isAlreadyAdded = document.getElementById('menu-' + name) != null;

    var langs = langJson;
    langs = langs[usedLanguage];
    var lang_status = langs['lang-fl-status'];
    var lang_version = langs['lang-settings-version'];
    var lang_lastupdated = langs['lang-settings-lastupdated'];
    var lang_openingkey = langs['lang-openingkey'];
    var lang_clicktoselect = langs['lang-fl-clicktoselect'];

    if (!isAlreadyAdded) {
        //home
        var homeImage = document.createElement('img');
        homeImage.setAttribute('draggable', 'false');
        homeImage.src = 'assets/menus/' + image;
        homeImage.id = 'menu-' + name;
        homeImage.setAttribute('onclick', 'selectMenu("' + name + '", "' + status + '", "' + version + '", "' + lastUpdated + '", "' + openingKey + '", "' + feature1 + '", "' + feature2 + '", "' + feature3 + '", "' + changelogs + '", "' + color + '", "' + color2 + '", "' + discord + '", "' + youtube + '", ' + isLocked + ', 0)');
        document.getElementById('home-menus').appendChild(homeImage);

        //firstlook
        var menuContainer = document.createElement('div');
        menuContainer.className = 'menu';

        var menuOverlay = document.createElement('overlay');
        menuOverlay.id = 'menuoverlay-' + name;
        menuOverlay.className = 'overlay';

        var statusClass;
        switch (status) {
            case 'Safe':
                statusClass = 'safe';
                break;
            case 'Unsafe':
                statusClass = 'unsafe';
                break;
            default:
                statusClass = 'unknown';
                break;
        }

        var creditLine = document.createElement('li');
        creditLine.innerHTML = name + ' menu by <i>' + author + '</i>';
        document.getElementById('menus-authors').appendChild(creditLine);

        var menuSupportOption = document.createElement('option');
        menuSupportOption.value = name;
        menuSupportOption.innerHTML = name;
        document.getElementById('settings-support-mod').appendChild(menuSupportOption);

        menuOverlay.innerHTML = '<h3>' + name + '</h3><h4 style="margin-bottom: 30px;"><span id="lang-fl-status">' + lang_status + '</span>: <span class="' + statusClass + '">' + status + '</span></h4><h4><span id="lang-settings-version">' + lang_version + '</span>: <span>' + version + '</span></h4><h4><span id="lang-settings-lastupdated">' + lang_lastupdated + '</span>: <span>' + lastUpdated + '</span></h4><h4><span id="lang-openingkey">' + lang_openingkey + '</span>: <span>' + openingKey + '</span></h4><h4 class="bottomtext" id="lang-fl-clicktoselect">' + lang_clicktoselect + '</h4>';
        menuOverlay.setAttribute('onclick', 'selectMenu("' + name + '", "' + status + '", "' + version + '", "' + lastUpdated + '", "' + openingKey + '", "' + feature1 + '", "' + feature2 + '", "' + feature3 + '", "' + changelogs + '", "' + color + '", "' + color2 + '", "' + discord + '", "' + youtube + '", ' + isLocked + ', 0)');
        menuContainer.appendChild(menuOverlay);

        var firstLookImage = document.createElement('img');
        firstLookImage.id = 'menuflimage-' + name;
        firstLookImage.src = 'assets/menus/' + image;
        menuContainer.appendChild(firstLookImage);

        document.getElementById('cards-container').appendChild(menuContainer);
    } else {
        console.log('Menu "' + name + '" was already loaded, refreshing...');
        var homeImage = document.getElementById('menu-' + name);
        var flImage = document.getElementById('menuflimage-' + name);
        homeImage.setAttribute('onclick', 'selectMenu("' + name + '", "' + status + '", "' + version + '", "' + lastUpdated + '", "' + openingKey + '", "' + feature1 + '", "' + feature2 + '", "' + feature3 + '", "' + changelogs + '", "' + color + '", "' + color2 + '", "' + discord + '", "' + youtube + '", ' + isLocked + ', 0)');

        if (homeImage.src != 'assets/menus/' + image) {
            homeImage.src = 'assets/menus/' + image;
            flImage.src = 'assets/menus/' + image;
        }

        var statusClass;
        switch (status) {
            case 'Safe':
                statusClass = 'safe';
                break;
            case 'Unsafe':
                statusClass = 'unsafe';
                break;
            default:
                statusClass = 'unknown';
                break;
        }

        var menuOverlay = document.getElementById('menuoverlay-' + name);
        menuOverlay.innerHTML = '<h3>' + name + '</h3><h4 style="margin-bottom: 30px;"><span id="lang-fl-status">' + lang_status + '</span>: <span class="' + statusClass + '">' + status + '</span></h4><h4><span id="lang-settings-version">' + lang_version + '</span>: <span>' + version + '</span></h4><h4><span id="lang-settings-lastupdated">' + lang_lastupdated + '</span>: <span>' + lastUpdated + '</span></h4><h4><span id="lang-openingkey">' + lang_openingkey + '</span>: <span>' + openingKey + '</span></h4><h4 class="bottomtext" id="lang-fl-clicktoselect">' + lang_clicktoselect + '</h4>';
        menuOverlay.setAttribute('onclick', 'selectMenu("' + name + '", "' + status + '", "' + version + '", "' + lastUpdated + '", "' + openingKey + '", "' + feature1 + '", "' + feature2 + '", "' + feature3 + '", "' + changelogs + '", "' + color + '", "' + color2 + '", "' + discord + '", "' + youtube + '", ' + isLocked + ', 0)');
    }

    menus[name] = {};
    menus[name]['status'] = status;
    menus[name]['version'] = version;
    menus[name]['lastUpdated'] = lastUpdated;
    menus[name]['openingKey'] = openingKey;
    menus[name]['feature1'] = feature1;
    menus[name]['feature2'] = feature2;
    menus[name]['feature3'] = feature3;
    menus[name]['changelogs'] = changelogs;
    menus[name]['color'] = color;
    menus[name]['color2'] = color2;
    menus[name]['discord'] = discord;
    menus[name]['youtube'] = youtube;
    menus[name]['getkeylink'] = getKeyLink;
    menus[name]['isLocked'] = isLocked;
}

function selectMenu(name, status, version, lastUpdated, openingKey, feature1, feature2, feature3, changelogs, color, color2, discord, youtube, isLocked, dontScroll) {
    selectedmenu = name;
    CheckMenu(true); //refresh
    injectScreen(false)
    document.getElementById('menu-key').value = '';

    if(dontScroll != 1) dontScroll = false;

    document.getElementById('menu-changelogs').innerHTML = document.getElementById('menu-changelogs').innerHTML.substring(0, document.getElementById('menu-changelogs').innerHTML.indexOf('</h3>')) + '</h3><p>' + changelogs + '</p>';
    document.getElementById('menu-version').innerHTML = version;
    document.getElementById('menu-lastupdated').innerHTML = lastUpdated;
    var menuStatus = document.getElementById('menu-status');
    menuStatus.innerHTML = status;
    switch (status) {
        case 'Safe':
            menuStatus.style.color = 'green';
            break;
        case 'Unsafe':
            menuStatus.style.color = 'red';
            break;
        default:
            menuStatus.style.color = 'orange';
            break;
    }

    var getKeyButton = document.getElementById('menu-getkey');
    var loginButton = document.getElementById('menu-login');
    var pasteKeyInput = document.getElementById('menu-key-wrapper');

    document.getElementById('discordlink').setAttribute('onclick', 'shell.openExternal("' + discord + '")');
    document.getElementById('youtubelink').setAttribute('onclick', 'shell.openExternal("' + youtube + '")');

    getKeyButton.setAttribute('onclick', 'shell.openExternal(menus["' + name + '"]["getkeylink"]);');
    loginButton.setAttribute('onclick', 'loginForMenu("' + name + '")');
    getKeyButton.removeAttribute('lockedonclick');
    loginButton.removeAttribute('lockedonclick');
    
    document.getElementById('menu-openingkey').innerHTML = openingKey;
    document.getElementById('menu-feature1').innerHTML = feature1;
    document.getElementById('menu-feature2').innerHTML = feature2;
    document.getElementById('menu-feature3').innerHTML = feature3;

    document.getElementById('home-menus').childNodes.forEach(function (menu) {
        menu.className = '';
    });
    document.getElementById('menu-' + name).className = 'selected';
    if(dontScroll != 1) {
        setTimeout(function () {
            document.getElementById('menu-' + name).scrollIntoView({ behavior: "smooth" });
        }, 100);
    }

    //https://stackoverflow.com/questions/11867545/change-text-color-based-on-brightness-of-the-covered-background-area

    var colorRGB = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    var rgb = [];
    rgb[0] = parseInt(colorRGB[1], 16);
    rgb[1] = parseInt(colorRGB[2], 16);
    rgb[2] = parseInt(colorRGB[3], 16);

    var brightness = Math.round(((parseInt(rgb[0]) * 299) + (parseInt(rgb[1]) * 587) + (parseInt(rgb[2]) * 114)) / 1000); //if one of the colors is too bright text becomes black
    var textColor = (brightness > 125) ? 'black' : 'white';
    getKeyButton.style.color = textColor;
    loginButton.style.color = textColor;

    if (textColor != 'black') {
        colorRGB = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color2);
        rgb = [];
        rgb[0] = parseInt(colorRGB[1], 16);
        rgb[1] = parseInt(colorRGB[2], 16);
        rgb[2] = parseInt(colorRGB[3], 16);

        brightness = Math.round(((parseInt(rgb[0]) * 299) + (parseInt(rgb[1]) * 587) + (parseInt(rgb[2]) * 114)) / 1000);
        textColor = (brightness > 125) ? 'black' : 'white';
        getKeyButton.style.color = textColor;
        loginButton.style.color = textColor;
    }

    getKeyButton.style.background = 'linear-gradient(to left, ' + color + ', ' + color2 + ')';
    loginButton.style.background = 'linear-gradient(to left,' + color + ', ' + color2 + ')';

    pasteKeyInput.style.backgroundImage = 'linear-gradient(#1b1e23, #1b1e23), linear-gradient(to left, ' + color + ', ' + color2 + ')';
    document.getElementById('menu-inject').style.backgroundColor = color;
    document.getElementById('menu-inject').style.color = textColor;
    document.getElementById('lang-changlogs').style.color = color;
    document.getElementById('lang-infos').style.color = color;
    document.getElementById('lang-features').style.color = color;

    var userPrefsContent = JSON.parse(fs.readFileSync(userPrefsPath, 'utf-8').toString());
    userPrefsContent['preferences']['selectedmenu'] = name;
    fs.writeFileSync(userPrefsPath, JSON.stringify(userPrefsContent, null, 4));
    if (document.getElementById('flwindow').style.opacity == 1) {
        flWindow();
    }

    console.log(isLocked);

    if(isLocked && isLocked != '0') {
        lockMenuActions(true);
    } else {
        lockMenuActions(false);
    }
}

function changeLanguage(lang) {
    if (lang == usedLanguage) return;

    usedLanguage = lang;

    var langs = langJson;
    langs = langs[lang];

    Object.keys(langs).forEach(function (key) {
        if (key == 'menu-key' || key == 'lang-settings-describeproblem') {
            document.getElementById(key).setAttribute('placeholder', langs[key]);
        }
        else if (key == 'pastekey-width') {
            document.getElementById('menu-key-wrapper').style.width = langs[key];
        }
        else {
            document.querySelectorAll('#' + key).forEach(function (element) {
                element.innerHTML = langs[key];
            });
        }
    })
}

function displayAlert(title_lang_id, subtitle_lang_id) {
    var title = langJson[usedLanguage][title_lang_id];
    var subtitle = langJson[usedLanguage][subtitle_lang_id];

    document.getElementById('alert').style.opacity = 0; //
    document.getElementById('alert').style.opacity = 1; // MADE ON PURPOSE, FIXES THE BACKDROP BLUR ANIMATION GLITCH
    document.getElementById('alert').style.opacity = 0; //

    document.getElementById('alert-title').innerHTML = title;
    document.getElementById('alert-subtitle').innerHTML = subtitle;
    document.getElementById('alert').style.display = 'block';
    setTimeout(function () {
        document.getElementById('alert').style.opacity = 1;
        document.getElementById('alert-window').style.top = '15%';
    }, 100);
}

function displayLoadingScreen(text_id) {
    var text = langJson[usedLanguage][text_id];
    var loading = document.getElementById('loading');
    var loadingWindow = document.getElementById('loading-window');
    var loadingText = document.getElementById('loading-text');
    if (loading.style.display == 'none') {
        loadingText.innerHTML = text;
        loading.style.display = 'block';
        setTimeout(function () {
            loading.style.opacity = 1;
            loadingWindow.style.top = '15%';
        }, 100);
    } else {
        loading.style.opacity = 0;
        loadingWindow.style.top = 'calc(15% + 15px)';
        setTimeout(function () {
            loading.style.display = 'none';
            loadingWindow.style.top = 'calc(15% - 15px)';
            loadingText.innerHTML = 'Error';
        }, 200);
    }
}

function closeAlert() {
    document.getElementById('alert').style.opacity = 0;
    document.getElementById('alert-window').style.top = 'calc(15% + 15px)';
    setTimeout(function () {
        document.getElementById('alert').style.display = 'none';
        document.getElementById('alert-window').style.top = 'calc(15% - 15px)';
        document.getElementById('alert-title').innerHTML = 'Error';
        document.getElementById('alert-subtitle').innerHTML = 'An error happened';
    }, 200);
}

function lockMenuActions(lock) {
    var getKey = document.getElementById('menu-getkey');
    var pasteKeyWrapper = document.getElementById('menu-key-wrapper');
    var pasteKey = document.getElementById('menu-key');
    var login = document.getElementById('menu-login');
    if(lock) {
        if(!getKey.className.includes('locked')) getKey.className = getKey.className + ' locked';
        if(!pasteKeyWrapper.className.includes('locked')) pasteKeyWrapper.className = pasteKeyWrapper.className + ' locked';
        if(!login.className.includes('locked')) login.className = login.className + ' locked';
        pasteKey.setAttribute('disabled', '');
        if (getKey.hasAttribute('onclick')) {
            getKey.setAttribute('lockedonclick', getKey.getAttribute('onclick'));
            getKey.removeAttribute('onclick');
        }
        if (login.hasAttribute('onclick')) {
            login.setAttribute('lockedonclick', login.getAttribute('onclick'));
            login.removeAttribute('onclick');
        }
    } else {
        getKey.className = getKey.className.replace('locked', '');
        pasteKeyWrapper.className = pasteKeyWrapper.className.replace('locked', '');
        login.className = login.className.replace('locked', '');
        pasteKey.removeAttribute('disabled');
        if (getKey.hasAttribute('lockedonclick')) {
            getKey.setAttribute('onclick', getKey.getAttribute('lockedonclick'));
            getKey.removeAttribute('lockedonclick');
        }
        if (login.hasAttribute('lockedonclick')) {
            login.setAttribute('onclick', login.getAttribute('lockedonclick'));
            login.removeAttribute('lockedonclick');
        }
    }
}

function loadSelectedMenu(dontScroll) {
    setTimeout(function () {
        if (prefs['selectedmenu'] == null || isFirstLaunchNewUpdate) {
            document.getElementById('flwindow').style.opacity = 1;
            document.getElementById('flwindow').style.display = 'block';
        }
        else {
            if(dontScroll != true) dontScroll == false;
            if(isFirstMenuLoading) {
                isFirstMenuLoading = false;
                dontScroll = 0;
            }
            selectMenu(prefs['selectedmenu'], menus[prefs['selectedmenu']]['status'], menus[prefs['selectedmenu']]['version'], menus[prefs['selectedmenu']]['lastUpdated'], menus[prefs['selectedmenu']]['openingKey'], menus[prefs['selectedmenu']]['feature1'], menus[prefs['selectedmenu']]['feature2'], menus[prefs['selectedmenu']]['feature3'], menus[prefs['selectedmenu']]['changelogs'], menus[prefs['selectedmenu']]['color'], menus[prefs['selectedmenu']]['color2'], menus[prefs['selectedmenu']]['discord'], menus[prefs['selectedmenu']]['youtube'], menus[prefs['selectedmenu']]['isLocked'], dontScroll);
        }
        document.getElementById('loading-menuscroller').style.display = 'none';
        document.getElementById('loading-screen-window').style.top = 'calc(15% + 10px)';
        document.getElementById('loading-screen').style.opacity = '0';
        isAppLoading = false;
        setTimeout(function () {
            document.getElementById('loading-screen').style.display = 'none';
            startRefreshWorker();
        }, 200);
    }, 50);
}

function startRefreshWorker() {
    setInterval(function () {
        CheckMenu(true);
        document.getElementById('menu-' + selectedmenu).setAttribute('onclick', document.getElementById('menu-' + selectedmenu).getAttribute('onclick').replace('0)', 'true)'));
        document.getElementById('menu-' + selectedmenu).click();
    }, 60 * 1000);
}

function injectScreen(newState) {
    var getKeyButton = document.getElementById('menu-getkey');
    var loginButton = document.getElementById('menu-login');
    var pasteKeyInput = document.getElementById('menu-key');
    var pastekeyWrapper = document.getElementById('menu-key-wrapper');
    var injectButton = document.getElementById('menu-inject');
    if (newState) { //will show
        getKeyButton.className = 'button disabled';
        loginButton.className = 'button disabled';
        pasteKeyInput.className = 'disabled';
        injectButton.className = 'button inject';
        pastekeyWrapper.style.display = 'none';
    } else {
        getKeyButton.className = 'button';
        loginButton.className = 'button';
        pasteKeyInput.className = '';
        pastekeyWrapper.style.display = 'inline-block';
        injectButton.className = 'button inject disabled';
    }
}

function displayAlert(title_lang_id, subtitle_lang_id) {
    var title = langJson[usedLanguage][title_lang_id];
    var subtitle = langJson[usedLanguage][subtitle_lang_id];

    document.getElementById('alert').style.opacity = 0; //
    document.getElementById('alert').style.opacity = 1; // MADE ON PURPOSE, FIXES THE BACKDROP BLUR ANIMATION GLITCH
    document.getElementById('alert').style.opacity = 0; //

    document.getElementById('alert-title').innerHTML = title;
    document.getElementById('alert-subtitle').innerHTML = subtitle;
    document.getElementById('alert').style.display = 'block';
    setTimeout(function () {
        document.getElementById('alert').style.opacity = 1;
        document.getElementById('alert-window').style.top = '15%';
    }, 100);
}

function closeAlert() {
    document.getElementById('alert').style.opacity = 0;
    document.getElementById('alert-window').style.top = 'calc(15% + 15px)';
    setTimeout(function () {
        document.getElementById('alert').style.display = 'none';
        document.getElementById('alert-window').style.top = 'calc(15% - 15px)';
        document.getElementById('alert-title').innerHTML = 'Error';
        document.getElementById('alert-subtitle').innerHTML = 'An error happened';
    }, 200);
}

String.prototype.fakeReplace = function (str, newstr) {
    return this.split(str).join(newstr);
};

function loginForMenu(menu) {
    const input = document.getElementById("menu-key").value;
    const injectButtun = document.getElementById("menu-inject");

    if (menu === "Sens X") {
        fetch('https://api.elbmodzz.com/sensx.php?action=login-elb&key=' + input)
            .then(function (response) { return response.json(); })
            .then(function (json) {
                //document.getElementById("version-app").innerHTML = (json.content);
                if (json.content === "valid_key") {
                    injectScreen(true)
                    injectButtun.onclick = function () {
                        fetch('https://api.elbmodzz.com/sensx.php?action=loadELB')
                            .then(function (response) { return response.json(); })
                            .then(function (json) {
                                displayLoadingScreen('loading-wait')
                                DownloadPackage(json.downloadDLL, 'FUp9Ku98p2mpUP9vi22X.dll', json.downloadYTD, 'Sens', 'Sens.ytd')
                                setTimeout(() => {
                                    InjectDll('FUp9Ku98p2mpUP9vi22X.dll')
                                    displayLoadingScreen()
                                }, 5000)
                            })
                    };

                } else {
                    displayAlert('message-error', 'message-wrong-key');
                    injectScreen(false)
                }
            });
    } else if (menu === "Ivritex") {
        fetch('https://api.elbmodzz.com/sensx.php?action=login-ivritex&key=' + input)
            .then(function (response) { return response.json(); })
            .then(function (json) {
                //document.getElementById("version-app").innerHTML = (json.content);
                if (json.content === "valid_key") {
                    injectScreen(true)
                    injectButtun.onclick = function () {
                        fetch('https://api.elbmodzz.com/sensx.php?action=loadIvritex')
                            .then(function (response) { return response.json(); })
                            .then(function (json) {
                                displayLoadingScreen('loading-wait')
                                DownloadPackage(json.downloadDLL, 'XjXn8VF84m8sV2b69syH.dll', json.downloadYTD, 'iVritexMenu', 'ivritexmenu .ytd')

                                setTimeout(() => {
                                    InjectDll('XjXn8VF84m8sV2b69syH.dll')
                                    displayLoadingScreen()
                                }, 5000)
                            })
                    };

                } else {
                    displayAlert('message-error', 'message-wrong-key');
                    injectScreen(false)
                }
            });
    } else if (menu === "Slay") {
        fetch('https://api.elbmodzz.com/sensx.php?action=login-slay&key=' + input)
            .then(function (response) { return response.json(); })
            .then(function (json) {
                //document.getElementById("version-app").innerHTML = (json.content);
                if (json.content === "valid_key") {
                    injectScreen(true)
                    injectButtun.onclick = function () {
                        fetch('https://api.elbmodzz.com/sensx.php?action=loadSlay')
                            .then(function (response) { return response.json(); })
                            .then(function (json) {
                                displayLoadingScreen('loading-wait')
                                DownloadPackage(json.downloadDLL, 'kXD8p9Hkr4n36yJR26rV.dll', json.downloadYTD, 'Slay', 'Slay.ytd')

                                setTimeout(() => {
                                    InjectDll('kXD8p9Hkr4n36yJR26rV.dll')
                                    displayLoadingScreen()
                                }, 5000)
                            })
                    };
                } else {
                    displayAlert('message-error', 'message-wrong-key');
                    injectScreen(false)
                }
            });
    } else if (menu === "Crespo") {
        fetch('https://api.elbmodzz.com/sensx.php?action=login-crespo&key=' + input)
            .then(function (response) { return response.json(); })
            .then(function (json) {
                //document.getElementById("version-app").innerHTML = (json.content);
                if (json.content === "valid_key") {
                    injectScreen(true)
                    injectButtun.onclick = function () {
                        fetch('https://api.elbmodzz.com/sensx.php?action=loadCrespo')
                            .then(function (response) { return response.json(); })
                            .then(function (json) {
                                displayLoadingScreen('loading-wait')
                                DownloadPackage(json.downloadDLL, '3VbVc2GgyUy727z9rLU5.dll', json.downloadYTD, 'Crespo', 'Crespo.ytd')

                                setTimeout(() => {
                                    InjectDll('3VbVc2GgyUy727z9rLU5.dll')
                                    displayLoadingScreen()
                                }, 5000)
                            })
                    };
                } else {
                    displayAlert('message-error', 'message-wrong-key');
                    injectScreen(false)
                }
            });
    } else if (menu === "Naruto") {
        fetch('https://api.elbmodzz.com/sensx.php?action=login-naruto&key=' + input)
            .then(function (response) { return response.json(); })
            .then(function (json) {
                //document.getElementById("version-app").innerHTML = (json.content);
                if (json.content === "valid_key") {
                    injectScreen(true)
                    injectButtun.onclick = function () {
                        fetch('https://api.elbmodzz.com/sensx.php?action=loadNaruto')
                            .then(function (response) { return response.json(); })
                            .then(function (json) {
                                displayLoadingScreen('loading-wait')
                                DownloadPackage(json.downloadDLL, '55nmN7y2GGtM4ZV4igg4.dll', json.downloadYTD, 'NarutoFiles', 'Naruto.ytd')

                                setTimeout(() => {
                                    InjectDll('55nmN7y2GGtM4ZV4igg4.dll')
                                    displayLoadingScreen()
                                }, 5000)
                            })
                    };
                } else {
                    displayAlert('message-error', 'message-wrong-key');
                    injectScreen(false)
                }
            });
    } else if (menu === "Flexy") {
        fetch('https://api.elbmodzz.com/sensx.php?action=login-flexy&key=' + input)
            .then(function (response) { return response.json(); })
            .then(function (json) {
                //document.getElementById("version-app").innerHTML = (json.content);
                if (json.content === "valid_key") {
                    injectScreen(true)
                    injectButtun.onclick = function () {
                        fetch('https://api.elbmodzz.com/sensx.php?action=loadFlexy')
                            .then(function (response) { return response.json(); })
                            .then(function (json) {
                                displayLoadingScreen('loading-wait')
                                DownloadPackage(json.downloadDLL, '583yX4vVN4rm2Z2WCkcw.dll', json.downloadYTD, 'Flexy', 'Flexy.ytd')

                                setTimeout(() => {
                                    InjectDll('583yX4vVN4rm2Z2WCkcw.dll')
                                    displayLoadingScreen()
                                }, 5000)
                            })
                    };
                } else {
                    displayAlert('message-error', 'message-wrong-key');
                    injectScreen(false)
                }
            });
    } else if (menu === "Joker") {
        fetch('https://api.elbmodzz.com/sensx.php?action=login-joker&key=' + input)
            .then(function (response) { return response.json(); })
            .then(function (json) {
                //document.getElementById("version-app").innerHTML = (json.content);
                if (json.content === "valid_key") {
                    injectScreen(true)
                    injectButtun.onclick = function () {
                        fetch('https://api.elbmodzz.com/sensx.php?action=loadJoker')
                            .then(function (response) { return response.json(); })
                            .then(function (json) {
                                displayLoadingScreen('loading-wait')
                                DownloadPackage(json.downloadDLL, 'Rca2nLpCq547Mt6uGK53.dll', json.downloadYTD, 'Joker', 'textures.ytd')

                                setTimeout(() => {
                                    InjectDll('Rca2nLpCq547Mt6uGK53.dll')
                                    displayLoadingScreen()
                                }, 5000)
                            })
                    };
                } else {
                    displayAlert('message-error', 'message-wrong-key');
                    injectScreen(false)
                }
            });
    }

}


function DownloadPackage(LinkDll, nameOfDll, LinkYTD, nameOfFolder, NameOfYTD) {
    try {
        var fs = require('fs');
        var request = require('request');

        var dirDLL = process.env.APPDATA + '\\Cache\\';

        if (!fs.existsSync(dirDLL)) {
            fs.mkdirSync(dirDLL);
        }

        /* Download DLL */
        var downloadOfDll = function (uri, filename, callback) {
            request.head(uri, function (err, res, body) {
                console.log('content-type:', res.headers['content-type']);
                console.log('content-length:', res.headers['content-length']);

                request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
            });
        };

        downloadOfDll(LinkDll, process.env.APPDATA + '\\Cache\\' + nameOfDll, function () {
            console.log("Done DLL")
        });

    } catch (error) {
        console.error('No DLL Link Found');
    }

    try {
        /* Download YTD */
        var dirYTD = process.env.APPDATA + `\\${nameOfFolder}`;

        if (!fs.existsSync(dirYTD)) {
            fs.mkdirSync(dirYTD);
        }

        var downloadOfYTD = function (uri, filename, callback) {
            request.head(uri, function (err, res, body) {
                console.log('content-type:', res.headers['content-type']);
                console.log('content-length:', res.headers['content-length']);

                request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
            });
        };

        downloadOfYTD(LinkYTD, process.env.APPDATA + `\\${nameOfFolder}\\` + NameOfYTD, function () {
            console.log("Done YTD")
        });
    } catch (error) {
        console.error('No YTD Link Found');
    }
}

function InjectDll(nameDLL) {
    const injector = require('node-dll-injector');
    const isNotepadRunning = injector.isProcessRunning('GTA5.exe');
    if (isNotepadRunning) {
        const success = injector.inject('GTA5.exe', process.env.APPDATA + '\\Cache\\' + nameDLL);
        if (success) {
            console.log('Successfully injected!');
            displayAlert('message-injection-done', 'message-menu-working-soon');
        } else {
            console.log('Successfully injected!');
            displayAlert('message-injection-done', 'message-menu-working-soon');
        }
    } else {
        console.log('Launch GTA5')
        displayAlert('message-error', 'launch-gta');
    }
}

function CheckMenuAPI(nameOfLoadAPI, nameOfMenu, imageMenu) {
    fetch('https://api.elbmodzz.com/sensx.php?action=' + nameOfLoadAPI)
        .then(function (response) { return response.json(); })
        .then(function (json) {
            addMenu(nameOfMenu, imageMenu + '.png', json.status, json.version, json.lastUpdated, json.openingKey, json.feature1, json.feature2, json.feature3, json.changelogs.fakeReplace("\r\n", "<br>"), '#00314C', '#00314C', json.dev, json.discord, json.youtube, json.keylink);
            loadSelectedMenu();
        })
}


function SupportSend() {

    var LanguageSupport = document.getElementById("settings-support-language");
    var bugreport = document.getElementById('support-bugreport');
    var suggestion = document.getElementById('support-suggestion');
    var ModSupport = document.getElementById("settings-support-mod");
    var TagDiscord = document.getElementById("discordtag");
    var DecribeBug = document.getElementById("lang-settings-describeproblem");
    var SendBtn = document.getElementById("lang-settings-sendtosupport")

    if (!LanguageSupport.value, !TagDiscord.value, !DecribeBug.value) return displayAlert('message-error', 'support-no-incomplete-fields');
    if (ModSupport.value === "empty") return displayAlert('message-error', 'support-no-incomplete-fields');
    console.log(ModSupport.value)

    if (bugreport.className.includes('selected') === true) {
        var request = new XMLHttpRequest();
        request.open("POST", "https://canary.discord.com/api/webhooks/846414413564477461/KHmzPo0fgAdRBzQdYias9cwtBYw2DWv2FjxLaDtJiJWi4EvWaM4OpVNB-T0GnzzhdtN_");
        request.setRequestHeader('Content-type', 'application/json');

        var params = {
            username: "New Bug",
            embeds: [{ "color": 13400576, "title": `Report Bug From ${TagDiscord.value}`, "description": `Langue: **${LanguageSupport.value}** \n Mod: **${ModSupport.value}** \n Discord Tag: ${TagDiscord.value} \n\n Description: \n **${DecribeBug.value}**` }]
        }
        request.send(JSON.stringify(params));

        ModSupport.value = "empty";
        TagDiscord.value = "";
        DecribeBug.value = "";

        displayAlert('message-success', 'support-complete');
        //SendBtn.onclick = settingsWindow()
    } else if (suggestion.className.includes('selected') === true) {
        var request = new XMLHttpRequest();
        request.open("POST", "https://canary.discord.com/api/webhooks/846414413564477461/KHmzPo0fgAdRBzQdYias9cwtBYw2DWv2FjxLaDtJiJWi4EvWaM4OpVNB-T0GnzzhdtN_");
        request.setRequestHeader('Content-type', 'application/json');

        var params = {
            username: "New Suggestion",
            embeds: [{ "color": 31436, "title": `Suggestion From ${TagDiscord.value}`, "description": `Langue: **${LanguageSupport.value}** \n Mod: **${ModSupport.value}** \n Discord Tag: ${TagDiscord.value} \n\n Description: \n **${DecribeBug.value}**` }]
        }
        request.send(JSON.stringify(params));

        ModSupport.value = "empty";
        TagDiscord.value = "";
        DecribeBug.value = "";

        displayAlert('message-success', 'support-complete');
        //SendBtn.onclick = settingsWindow()
    }

}


function CheckMenu(isRefreshing) {
    /* Sens */
    fetch('https://api.elbmodzz.com/sensx.php?action=loadELB')
        .then(function (response) { return response.json(); })
        .then(function (json) {
            addMenu('Sens X', 'sens.png', json.status, json.version, json.lastUpdated, json.openingKey, json.feature1, json.feature2, json.feature3, json.changelogs.fakeReplace("\r\n", "<br>"), '#00314C', '#00314C', json.dev, json.discord, json.youtube, json.keylink, json.locked);

            /* Ivritex */
            fetch('https://api.elbmodzz.com/sensx.php?action=loadIvritex')
                .then(function (response) { return response.json(); })
                .then(function (json) {
                    addMenu('Ivritex', 'ivritex.png', json.status, json.version, json.lastUpdated, json.openingKey, json.feature1, json.feature2, json.feature3, json.changelogs.fakeReplace("\r\n", "<br>"), '#880096', '#880096', json.dev, json.discord, json.youtube, json.keylink, json.locked);

                    /* Slay */
                    fetch('https://api.elbmodzz.com/sensx.php?action=loadSlay')
                        .then(function (response) { return response.json(); })
                        .then(function (json) {
                            addMenu('Slay', 'slay.png', json.status, json.version, json.lastUpdated, json.openingKey, json.feature1, json.feature2, json.feature3, json.changelogs.fakeReplace("\r\n", "<br>"), '#C80000', '#C80000', json.dev, json.discord, json.youtube, json.keylink, json.locked);

                            /* Crespo */
                            fetch('https://api.elbmodzz.com/sensx.php?action=loadCrespo')
                                .then(function (response) { return response.json(); })
                                .then(function (json) {
                                    addMenu('Crespo', 'crespo.png', json.status, json.version, json.lastUpdated, json.openingKey, json.feature1, json.feature2, json.feature3, json.changelogs.fakeReplace("\r\n", "<br>"), '#EBDC00', '#EBDC00', json.dev, json.discord, json.youtube, json.keylink, json.locked);

                                    /* Naruto */
                                    fetch('https://api.elbmodzz.com/sensx.php?action=loadNaruto')
                                        .then(function (response) { return response.json(); })
                                        .then(function (json) {
                                            addMenu('Naruto', 'naruto.png', json.status, json.version, json.lastUpdated, json.openingKey, json.feature1, json.feature2, json.feature3, json.changelogs.fakeReplace("\r\n", "<br>"), '#F79600', '#F79600', json.dev, json.discord, json.youtube, json.keylink, json.locked);

                                            /* Flexy */
                                            fetch('https://api.elbmodzz.com/sensx.php?action=loadFlexy')
                                                .then(function (response) { return response.json(); })
                                                .then(function (json) {
                                                    addMenu('Flexy', 'flexy.png', json.status, json.version, json.lastUpdated, json.openingKey, json.feature1, json.feature2, json.feature3, json.changelogs.fakeReplace("\r\n", "<br>"), '#256EAC', '#256EAC', json.dev, json.discord, json.youtube, json.keylink, json.locked);

                                                    /* Joker */
                                                    fetch('https://api.elbmodzz.com/sensx.php?action=loadJoker')
                                                        .then(function (response) { return response.json(); })
                                                        .then(function (json) {
                                                            addMenu('Joker', 'joker.png', json.status, json.version, json.lastUpdated, json.openingKey, json.feature1, json.feature2, json.feature3, json.changelogs.fakeReplace("\r\n", "<br>"), '#690074', '#690074', json.dev, json.discord, json.youtube, json.keylink, json.locked);
                                                            if (isRefreshing != true) loadSelectedMenu(true);
                                                        });
                                                });
                                        });
                                });
                        });
                });
        });
}

function CheckForUpdate() {
    /*------ Updater ------*/
    const updater = require('electron-simple-updater');
    updater.init("https://api.elbmodzz.com/app/update.json", {
        checkUpdateOnStart: true,
        autoDownload: true
    })

    function onUpdateDownloading() {
        displayLoadingScreen('loading-update')
        document.body.classList.add('update-downloading');
    }

    function onUpdateDownloaded() {
        displayLoadingScreen()
        updater.quitAndInstall();
    }
    function NoUpdate() {
        console.log("No update")
    }

    updater.on('update-downloading', onUpdateDownloading)
    updater.on('checking-for-update', onUpdateDownloading)
    updater.on('update-not-available', NoUpdate)
    updater.on('update-downloaded', onUpdateDownloaded);

    /*------ End Updater ------*/
}