const setupEvents = require('./installers/setupEvents')
if (setupEvents.handleSquirrelEvent()) {
  return;
}


const { app, BrowserWindow, ipcMain, autoUpdater } = require('electron');
app.allowRendererProcessReuse = false
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 630,
    minWidth: 750,
    minHeight: 500,
    maxWidth: 1100,
    maxHeight: 700,
    resizable: true,
    maximizable: false,
    icon: './build/sens-x.ico',
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: false
    }
  })

  //win.webContents.openDevTools();
  win.setMenuBarVisibility(false);
  win.loadFile('src/main.html');



  //win.removeMenu(); //to disable devtools
}

app.on('ready', () => {
  createWindow();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

ipcMain.on('close_app', () => {
  app.quit();
});

ipcMain.on('minimize_app', () => {
  win.minimize();
});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

//données temporaires
ipcMain.on('app_lastupdated', (event) => {
  event.sender.send('app_lastupdated', { lastUpdated: '20/12/2020' });
});

ipcMain.on('app_serverstatus', (event) => {
  event.sender.send('app_serverstatus', { serverStatus: 'Online' });
});

ipcMain.on('app_gameversion', (event) => {
  event.sender.send('app_gameversion', { gameVersion: '1.56' });
});

ipcMain.on('app_changelogs', (event) => {
  event.sender.send('app_changelogs', { changelogs: '<h4>Version 1.0.0</h4><li>First Release</li>' });
});

ipcMain.on('is_newupdate_firstlaunch', (event) => {
  event.sender.send('is_newupdate_firstlaunch', { isFirstLaunchNewUpdate: false });
});