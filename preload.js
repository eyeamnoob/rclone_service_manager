const { contextBridge, ipcRenderer } = require("electron");
const Toastify = require("toastify-js");

contextBridge.exposeInMainWorld("IPCRenderer", {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
});

contextBridge.exposeInMainWorld("Toastify", {
  toast: (options) => Toastify(options).showToast(),
});
