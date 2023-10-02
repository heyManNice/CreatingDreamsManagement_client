const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('myapi', {
    iknow: () => ipcRenderer.send('iknow'),
    iterr: (msg) => ipcRenderer.send('iterr',msg),
});
ipcRenderer.on('msg', (event, data)=>{
    document.querySelector("#mylogid").innerHTML=data.logid;
    document.querySelector("#mytitle").innerHTML=`你似乎在浏览“${data.keywords}”？`;
    document.querySelector("#keyword").innerHTML=`#对不起，学校的多媒体仅用于学习使用，禁止用于浏览“${data.keywords}”。`;
    document.querySelector("#myimg").src=data.img;
    document.querySelector(".Sc").innerHTML="截图："+data.title;
})