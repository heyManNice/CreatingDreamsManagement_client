const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('myapi', {
    shutdown: () => ipcRenderer.send('shutdown'),
    reboot: () => ipcRenderer.send('reboot'),
    register: (data) => ipcRenderer.send('register',data),
});
ipcRenderer.on('yourid', (event, data)=>{
    document.querySelector("#mytitle").innerHTML="嗯...未通过审核 Id:"+data;
})