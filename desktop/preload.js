/* Brücke für web/js/update.js: window.NDDesktop (nur die zwei Update-Aufrufe, sonst nichts). */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('NDDesktop', {
  info: () => ipcRenderer.invoke('nd:info'),
  installUpdate: () => ipcRenderer.invoke('nd:update')
});
