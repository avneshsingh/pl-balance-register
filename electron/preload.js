const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  backup: () => ipcRenderer.invoke('data:backup'),
  restore: () => ipcRenderer.invoke('data:restore'),
  saveExcel: (payload) => ipcRenderer.invoke('export:excel', payload),
  exportPdf: (payload) => ipcRenderer.invoke('export:pdf', payload),
});
