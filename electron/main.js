const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const DEV_URL = 'http://localhost:5173';
const dataFile = () => path.join(app.getPath('userData'), 'pl-register-data.json');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1000,
    minHeight: 640,
    title: 'PL Balance Register',
    backgroundColor: '#f5f2ea',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    loadDevUrl(win);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
  win.setMenuBarVisibility(false);
}

function loadDevUrl(browserWindow) {
  browserWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL !== DEV_URL && !validatedURL.startsWith(DEV_URL)) return;
    console.error(`[PL Register] Failed to load dev URL (${errorCode}): ${errorDescription}`);
    console.log('[PL Register] Retrying in 1 second…');
    setTimeout(() => {
      if (!browserWindow.isDestroyed()) {
        browserWindow.loadURL(DEV_URL).catch((err) => {
          console.error('[PL Register] Retry failed:', err.message);
        });
      }
    }, 1000);
  });
  browserWindow.loadURL(DEV_URL).catch((err) => {
    console.error('[PL Register] Initial dev load failed:', err.message);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- Storage ----------
ipcMain.handle('data:load', () => {
  try {
    return JSON.parse(fs.readFileSync(dataFile(), 'utf8'));
  } catch {
    return { employees: [] };
  }
});

ipcMain.handle('data:save', (_e, data) => {
  const file = dataFile();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
  return true;
});

ipcMain.handle('data:backup', async () => {
  const { filePath } = await dialog.showSaveDialog(win, {
    title: 'Backup register data',
    defaultPath: `PL-Register-Backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!filePath) return false;
  fs.copyFileSync(dataFile(), filePath);
  return true;
});

ipcMain.handle('data:restore', async () => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    title: 'Restore register data',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (!filePaths || !filePaths[0]) return null;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  } catch {
    dialog.showErrorBox('Restore failed', 'This file is not a valid PL Register backup');
    return null;
  }
  if (!isValidBackup(data)) {
    dialog.showErrorBox('Restore failed', 'This file is not a valid PL Register backup');
    return null;
  }
  fs.writeFileSync(dataFile(), JSON.stringify(data, null, 2));
  return data;
});

// ---------- Excel export (buffer from renderer → save dialog) ----------
ipcMain.handle('export:excel', async (_e, { name, data }) => {
  const { filePath } = await dialog.showSaveDialog(win, {
    title: 'Export PL statement to Excel',
    defaultPath: `PL-Balance-${sanitize(name)}.xlsx`,
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
  });
  if (!filePath) return false;
  fs.writeFileSync(filePath, Buffer.from(data));
  shell.showItemInFolder(filePath);
  return true;
});

// ---------- PDF export ----------
ipcMain.handle('export:pdf', async (_e, { html, name }) => {
  const { filePath } = await dialog.showSaveDialog(win, {
    title: 'Export PL statement to PDF',
    defaultPath: `PL-Balance-${sanitize(name)}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (!filePath) return false;

  const printWin = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const pdf = await printWin.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    margins: { top: 0.4, bottom: 0.4, left: 0.35, right: 0.35 },
  });
  printWin.destroy();
  fs.writeFileSync(filePath, pdf);
  shell.showItemInFolder(filePath);
  return true;
});

function sanitize(s) {
  return String(s || 'employee').replace(/[^\w\u0900-\u097F -]+/g, '').trim().replace(/\s+/g, '-');
}

function isValidBackup(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.employees)) return false;
  return data.employees.every(
    (emp) =>
      emp &&
      typeof emp === 'object' &&
      typeof emp.id === 'string' &&
      typeof emp.name === 'string' &&
      Array.isArray(emp.entries)
  );
}
