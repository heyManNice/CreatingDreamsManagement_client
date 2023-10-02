const { app, BrowserWindow,ipcMain } = require('electron')
const WebSocketClient = require('websocket').client;
const path = require('path')
const ini = require('ini');
const fs = require('fs');
const settingFilePath = __dirname + "\\setting.ini";
const screenshot = require('desktop-screenshot');
const myip = 'xx.xxxx.77.166';
const HTTP = require('http')
const child_process = require('child_process');

const httpsend = function(path,data){
    return new Promise(( resolve, reject ) => {
    const POST_DATA = data
    const POST_OPTIONS = {
        port: 3000,
        host: myip,
        path: path,
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        }
    };

    function requestOnResponse(incomingMessage){
        let data = []
        incomingMessage.on('data', chunk => {
            data.push(...chunk)
        })

        incomingMessage.on('end', () => {
            //console.log(new TextDecoder().decode(new Uint8Array(data)));
            let _data = JSON.parse( new TextDecoder().decode(new Uint8Array(data)))
            resolve(_data);
        })
    }
    function requestOnTimeout(){
        REQUEST.destroy()
    }
    function requestOnError(err){
        console.log('err: ', err)
    }
    const REQUEST = HTTP.request(POST_OPTIONS, requestOnResponse)
    REQUEST.on('error', requestOnError)
    REQUEST.on('timeout', requestOnTimeout)
    REQUEST.setTimeout(6000)
    REQUEST.write(JSON.stringify(POST_DATA), 'utf8')
    REQUEST.end()
    })
}

const prtSc = function(){
    return new Promise(( resolve, reject ) => {
        let mydir = "./temp/screenshot.png"
        screenshot(mydir, {width: 1920, height: 1080, quality: 120}, function(error, complete) {
            if(error)
                resolve(false);
            else
                resolve(mydir);
        });
    });
}
const picToBase64 = async function(dir){
    let imageData = fs.readFileSync(dir);
    let imageBase64 = imageData.toString("base64");
    let imagePrefix = "data:image/png;base64,";
    return(imagePrefix + imageBase64);
}
const prtScBase64 = async function(){
    let dir = await prtSc();
    return await picToBase64(dir);
}
const findtitle = function(){
    let result = child_process.execFileSync('findexetitle.exe');
    let text = new TextDecoder('gbk').decode(result);
    if(text=='false'){
        console.log('正常');
        setTimeout(findtitle,5000);
        return
    }
    console.log(text);
    let json = JSON.parse(text);
    uploadSc(json);
}
function downloadImage(url, path) {
    return new Promise(( resolve, reject ) => {
        const file = fs.createWriteStream(path);
        const request = HTTP.get(url, function(response) {
            response.pipe(file);
        });
        request.on('close', function() {
            file.close();
            resolve({code:0})
          });
    });
}

const uploadSc=async function(data){
    console.log("触发关键词上传截图");
    let img = await prtScBase64();
    let result = await httpsend('/api/uplaodScreenshot',{data:{id:setting['system']['id'],key:setting['system']['key'],base64_img:img,keywords:data.keywords,title:data.title}});
    createKeyWord_win({keywords:data.keywords,title:data.title,img:img,logid:result.insertId});
    console.log(result);
}
allWindows={};
rebootTime=3000

scoketCallback={
    registerOK:function(data){
        setting['system']['key']=data.yourKey
        setting['system']['id']=data.yourId
        let text = ini.stringify(setting);
        fs.writeFileSync(settingFilePath,text);
        closeWindow('register');
        scoket.reply({key: setting['system']['key'], from: "PC"});
    },
    shutdown:function(data){
        child_process.execFileSync('shutdown',["-s","-t","0"]);
    },
    reboot:function(data){
        child_process.execFileSync('shutdown',["-r","-t","0"]);
    },
    reinstall:function(data){
        let result = child_process.execFileSync('installsystem.bat');
        console.log(result.toString())
    },
    nopass:function(data){
        createNoPass_win()
    },
    pass:function(data){
        console.log('通过验证');
        closeWindow('nopass');
        scoket.close();
        scoket_run();
    },
    getSc:async function(){
        console.log("远程获取截图");
        let img = await prtScBase64();
        let result = await httpsend('/api/ScToAdmin',{data:{type:"toAdmin",callback:"getScOk",id:setting['system']['id'],key:setting['system']['key'],base64_img:img}});
        console.log(result);
        //scoket.reply({type:"toAdmin",callback:"getScOk",id:setting['system']['id'],base64_img:img})
        //return await prtScBase64();
    },
    wallpaper:async function(data){
        console.log(data.fileUrl.slice(1));
        let a = await downloadImage("http://61.171.77.166:3000"+data.fileUrl.slice(1),__dirname+"/src/wallpaper.png");
        console.log(a);
        setTimeout(async function(){
            await child_process.execFileSync('setwallpaper.exe',[__dirname+"/src/wallpaper.png"]);
            scoket.reply({type:"toAdmin",callback:"setwallpaperOk",id:setting['system']['id']})
        },500);
    }
}
//scoketCallback.wallpaper(1);
//窗口函数
async function createReregister_win(){
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        show: false,
        fullscreen:true,
        webPreferences:{
            preload: path.join(__dirname, 'preload.js')
        }
    })
    allWindows.register=win;
    win.once('ready-to-show', () => {
        win.show();
    })
    ipcMain.on('shutdown', () => {
        console.log("关机");
    })
    ipcMain.on('reboot', () => {
        console.log("重启");
    })
    ipcMain.on('register', (e,data) => {
        Sendregister(data);
    })
    win.loadFile('register.html')
}
async function createNoPass_win(){
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        show: false,
        fullscreen:true,
        webPreferences:{
            preload: path.join(__dirname, 'preload.js')
        }
    })
    allWindows.nopass=win;
    win.once('ready-to-show', () => {
        win.show();
    })
    ipcMain.on('shutdown', () => {
        scoketCallback.shutdown();
    })
    ipcMain.on('reboot', () => {
        scoketCallback.reboot();
    })
    ipcMain.on('register', (e,data) => {
        Sendregister(data);
    })
    win.webContents.send('yourid',setting['system']['id']);
    win.loadFile('pass.html')
}
async function createKeyWord_win(json_data){
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        show: false,
        alwaysOnTop:true,
        icon:"./src/ikun.ico",
        webPreferences:{
            preload: path.join(__dirname, 'keywordpage.js')
        }
    })
    allWindows.warning=win;
    win.once('ready-to-show', () => {
        win.show();
    })
    ipcMain.on('iknow', () => {
        setTimeout(findtitle,60000);
        console.log("我知道了");
        closeWindow('warning');
    })
    ipcMain.on('iterr', (e,logid) => {
        setTimeout(findtitle,60000);
        console.log("错误检测"+logid);
        scoket.reply({type:"keywordsError",id:logid})
        closeWindow('warning');
    })
    win.webContents.send('msg',json_data);
    win.loadFile('keyword.html')
}

//监听
async function scoket_run(json_data){
    var client = new WebSocketClient();

    client.on('connectFailed', function (error) {
        console.log('Connect Error: ' + error.toString());
        rebootScoket_run(rebootTime);
    });

    client.on('connect', function (connection) {
        //console.log("2秒后开始截图")
        //setTimeout(scoketCallback.getSc,2000);
        scoketCallback.getSc()
        findtitle();
        scoket = connection;
        scoket.reply=function(msg){
            connection.send(JSON.stringify(msg));
        }
        let mykey='undefined';
        if(setting['system']['key']&&setting['system']['key']!=''){
            mykey = setting['system']['key'];
        }
        connection.send(JSON.stringify({ key: mykey, from: "PC",data:json_data }));
        connection.on('error', function (error) {
            console.log("错误: " + error.toString());
            rebootScoket_run(rebootTime);
        });
        connection.on('close', function () {
            console.log('关闭连接');
            rebootScoket_run(rebootTime);
        });
        connection.on('message', function (message) {
            if (message.type === 'utf8') {
                //console.log("Received: '" + message.utf8Data + "'");
            }
            data = JSON.parse(message.utf8Data);
            console.log(data);
            if(data.callback){
                scoketCallback[data.callback](data);
            }

        });
    });

    client.connect('ws://'+myip+':3500/');
}
//功能
async function Sendregister(data){
    console.log(data);
    scoket_run(data);
    if(allWindows['register']){
        //allWindows['register'].close();
    }
}
async function rebootScoket_run(ms){
    setTimeout(function(){
        scoket_run();
    },ms)
}

function closeWindow(win){
    if(allWindows[win]){
        allWindows[win].close();
    }
}


//准备好app后执行
app.whenReady().then(async() => {
    setting = fs.readFileSync(settingFilePath).toString();
    setting = ini.parse(setting);
    if(setting['system']['key']){
        scoket_run();
    }else{
        createReregister_win()
    }
    //createKeyWord_win();
    //激活时
    /* app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    }) */
})
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        //关闭窗口不关闭主进程
        //app.quit()
    }
})