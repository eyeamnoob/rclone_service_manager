const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("IPCRenderer", {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
});
