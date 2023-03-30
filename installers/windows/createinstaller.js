const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  console.log('creating windows installer')
  const rootPath = path.join('./')
  const outPath = path.join(rootPath, 'release-builds')

  return Promise.resolve({
    appDirectory: path.join(outPath, 'Sens X-win32-ia32/'),
    authors: 'Sens X Team',
    noMsi: true,
    loadingGif: path.join(rootPath, 'amc_loading.gif'),
    description: 'App SensX',
    LICENSE: 'MIT',
    //remoteReleases: 'https://api.elbmodzz.com/app/update.json',
    outputDirectory: path.join(outPath, 'windows-installer'),
    exe: 'Sens X.exe',
    setupExe: 'SensXAppInstaller.exe',
    setupIcon: path.join(rootPath, 'build\\sens-x.ico')
  })
}