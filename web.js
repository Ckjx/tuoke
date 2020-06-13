const server = require('http').createServer();
const io = require('socket.io')(server);
const puppeteer = require('puppeteer');
const PsXml = require('xml2js').parseString;
const generate = require('nanoid/generate');
const request = require('request');
const async = require('async');
const userList = {},retKetR = {}, scanData = {},wxcookies = {},sendcount = {},browserList = {},sendconetnt={},useData={},domain={};
const SessionList = {}; //创建一个会话对象
var tough = require('tough-cookie');
var deHtml = require('parse-entities')
var StartSocket = ()=>{
    io.set('transports', ['websocket']);
    io.on('connection', client => {initLogin(client)});
};
var initLogin = (client) =>{
    //开始注册socket
    client.on('login',data=>{

        //说明clientid 每个会话的id  每个会话下面可以创建无数useid 用户扫码id
        //登陆用户  每个浏览器组的id
        if(data.hasOwnProperty('ConnectToken')){
            var msgData = JSON.parse(data.data);//发送内容数据
            useData[client.id] = msgData.userdata; //商户数据
            domain[client.id] = data.domain;
            if(useData[client.id].point <= '0' && useData[client.id].point !==''){
                io.to(client.id).emit('warning', '点数不足，无法发送');
            }else{
                if(data.re){//如果socket发送了relogin 跳过账户
                    relogin(client.id,function () {
                        SessionList[data.useid] = client.id;
                        if(msgData.msgdata.swtype == '2'){
                            msgData.msgdata.content = deHtml(msgData.msgdata.content)
                        }
                        start(data.useid,client.id);
                    });
                }else{//正常运行
                    SessionList[data.useid] = client.id;
                    if(msgData.msgdata.swtype == '2'){
                        msgData.msgdata.content = deHtml(msgData.msgdata.content)
                    }
                    start(data.useid,client.id);
                }
                sendconetnt[client.id] = msgData.msgdata;
            }
            console.log(client.conn.remoteAddress);
        }else{
            io.to(client.id).emit('warning','token丢失或错误,请联系开发者获取');
            client.disconnect();
        }
    });
    client.on('snedstart',(data)=>{
        // console.log(data);
        userListData(data.data.id.uid,sendconetnt[client.id],data);
    }),
        client.on('disconnect', () => {
            //每个用户id只限制一个活跃浏览器
            //关闭当前id下没有激活的浏览器
            for (var brlist in browserList[client.id]){
                if(browserList[client.id][brlist].active == false){
                    browserList[client.id][brlist].browser.close();
                }
            }
        });
    client.on('logint',(id)=>{
        browserList[client.id][id].browser.close();
    })
};
StartSocket();
server.listen(3300);

function relogin(clientid,backcall) {
    async.forEachSeries(browserList[clientid],(brlist,backcalls)=>{
        if(brlist.active == false){
            brlist.browser.close();
        }
        backcalls();
    },function () {
        backcall();
    })
}

function start(useid,clientid) {
    puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox','--proxy-server='],
        executablePath:'/usr/bin/chromium-browser',
    }).then(async (browser) => {
        //创建用户浏览器 browser
        if(!browserList.hasOwnProperty(SessionList[useid])){
            browserList[SessionList[useid]] = {}
        }
        //向浏览器进行分组
        browserList[SessionList[useid]][useid] = {browser:browser,active:false};
        const page = await browserList[SessionList[useid]][useid].browser.newPage();
        await page.setRequestInterception(true);
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36');
        let datas = '';
        let matchObj = ['cgi-bin/mmwebwx-bin/webwxgetcontact', 'webwxlogout','cgi-bin/mmwebwx-bin/webwxnewloginpage','cgi-bin/mmwebwx-bin/webwxinit','cgi-bin/mmwebwx-bin/login'];
        page.on('request', interceptedRequest => {
            if(interceptedRequest.resourceType() =='image' || interceptedRequest.resourceType()=='font'){
                let qcimageurl = interceptedRequest.url().split("/");
                if(qcimageurl[3] == 'qrcode'){
                    //拦截二维码
                    io.to(clientid).emit('qcurl', interceptedRequest.url());
                    interceptedRequest.continue();
                    // interceptedRequest.abort();
                }else{
                    interceptedRequest.continue();
                }
            } else {
                let resulturl = interceptedRequest.url();
                let responseStatus = false;
                matchObj.forEach(function (b) {
                    let matchD = new RegExp(b, "g");
                    let maStr = resulturl.match(matchD);
                    if(maStr){
                        switch (maStr[0]) {
                            case 'webwxlogout': //手动退出
                                browserList[SessionList[useid]][useid].browser.close();
                                break;
                            case 'cgi-bin/mmwebwx-bin/webwxgetcontact': //获取列表
                                eqUserList(useid).then((data)=>{
                                    try {
                                        let userlist = JSON.parse(data);
                                        if (userlist.Seq === 0) {
                                            userList[useid] = userlist.MemberList;
                                        }
                                    }catch (e) {
                                        io.to(clientid).emit('warning', e);
                                    }
                                    // userListData(clientid,useid,data,sendconetnt);
                                }).catch((e)=>{
                                    io.to(clientid).emit('warning', e);
                                });
                                responseStatus = true;
                                break;
                            case 'cgi-bin/mmwebwx-bin/webwxnewloginpage': //获取发送消息的xml
                                responseStatus = true;
                                break;
                            case 'cgi-bin/mmwebwx-bin/webwxinit': //获取扫码用户数据
                                responseStatus = true;
                                break;
                            case 'cgi-bin/mmwebwx-bin/login':
                                responseStatus = true;
                                break;
                        }
                        if (responseStatus) {
                            //返回拦截body
                            page.on('response', response => {
                                if(response.url().match(matchD)){
                                    let resultbody = response.text();
                                    resultbody.then((r) => {
                                        if(b == 'cgi-bin/mmwebwx-bin/login'){
                                            let loginPsStatus = r.match(/window\.code=(.*?)\;/);
                                            if(loginPsStatus.length > 1){
                                                switch (loginPsStatus[1]){
                                                    case '201':
                                                        var avatar = r.match(/'(.*?)\'\;/);
                                                        io.to(clientid).emit('message', {login:'wait',code:201,avatar:avatar[1]});
                                                        break;
                                                    case '200':
                                                        io.to(clientid).emit('message', {login:'wait',code:200});
                                                        break;
                                                }
                                            }
                                        }else if(b == 'cgi-bin/mmwebwx-bin/webwxgetcontact'){
                                            page.evaluate(async () => {
                                                var BASE_DATA = $('.nickname').eq(0).find('.ng-binding').text();
                                                return Promise.resolve(BASE_DATA);
                                            }).then(function (result) {
                                                scanData[useid].NickName = result;
                                                io.to(clientid).emit('clickaccess', {
                                                    nickname: result,
                                                    msgid: sendconetnt[clientid].id,
                                                    equserid: useData[clientid].id,
                                                    id: {'cid': clientid, 'uid': useid}
                                                });
                                            })
                                        }else if(b == 'cgi-bin/mmwebwx-bin/webwxnewloginpage'){
                                            //存储请求cookies
                                            page.cookies().then((resultCookie)=>{
                                                wxcookies[useid] = resultCookie;
                                            });
                                            console.log(r);
                                            PsXml(r,function (err,xmlresult) {
                                                //这里判断登陆状态
                                                //用户扫码成功后 将浏览器设为活跃
                                                if(xmlresult.error.ret[0] == '0'){
                                                    // var sendid = useid;
                                                    retKetR[useid] = xmlresult.error;
                                                    browserList[SessionList[useid]][useid].active = true;
                                                    //登陆成功
                                                }else{
                                                    io.to(clientid).emit('warning', xmlresult.error.ret[0]);
                                                }
                                            });
                                        }else if(b == 'cgi-bin/mmwebwx-bin/webwxinit'){
                                            let userdata = JSON.parse(r);
                                            scanData[useid] = userdata.User;
                                        }
                                    })
                                }
                            })
                        }
                    }
                });
                interceptedRequest.continue();
            }
        });
        await page.goto('https://wx.qq.com');
    });
}


function userListData(useid,sendconetnt,data) {
    if(data.wb && sendconetnt.swtype == 1){
        sendconetnt.content = `${sendconetnt.content}${data.wb}`;
    }
    if(sendconetnt.swtype ==1){
        sendconetnt.content = sendconetnt.content.replace(/\{nackname\}/g,scanData[useid].NickName);
    }
    if(sendconetnt.max.pv){
        var city = {pv:sendconetnt.max.pv,ci:sendconetnt.max.ci};
    }else{
        var city = '';
    }
    // console.log(sendconetnt.max.sex);
    if(data.point <= '0' && data.point !==''){
        io.to(data.data.id.cid).emit('warning', '点数不足，无法发送');
        eqLogint(useid);
        return false;
    }else{
        let point = data.point > '0' ? Number(data.point):null;
        let userObj = [];
        async.each(userList[useid],function (userid,callback) {
            if (userid.AttrStatus > 200) { //获取大于200的
                if(typeof city == 'object'){ //获取有地址的
                    if(userid.province == city.pv && userid.city == city.ci){ //筛选地址
                        if(sendconetnt.max.sex !=='0'){ //开启性别的
                            if(userid.Sex == sendconetnt.max.sex){ //筛选性别
                                userObj.push(userid); //等于列表的
                                callback();
                            }else{
                                //错的
                                callback();
                            }
                        }else{ //没有开启性别的
                            userObj.push(userid);
                            callback();
                        }
                    }else{ //不等于当前地址的 跳过
                        callback();
                    }
                }else{
                    //上面判断完了地址 下面 判断开启性别没有开启地址的
                    if(sendconetnt.max.sex !=='0'){ //开始性别的
                        // console.log(userid.sex);
                        if(userid.Sex == sendconetnt.max.sex){ //比对性别
                            userObj.push(userid); //对的
                            callback();
                        }else{
                            //错的
                            callback();
                        }
                    }else{
                        userObj.push(userid);
                        callback();
                    }
                }
            } else {
                callback();
            }
        },function () {
            sendcount[useid] = 0;
            async.forEachSeries(userObj, (userid, callback) => {
                //遍历发送
                if (sendconetnt.sl == sendcount[useid] || sendcount[useid] > sendconetnt.sl) {
                    callback(null);
                } else {
                    if(sendconetnt.swtype ==1){
                        var content = sendconetnt.content.replace(/\{username\}/g,userid.NickName);
                    }else{
                        var content = sendconetnt.content;
                    }
                    setTimeout(function () {
                        if(typeof point =="number"){
                            if(point <= 0){
                                callback(null);
                            }else{
                                point--;
                                sendStart(userid, {
                                    type: sendconetnt.swtype == 1 ? 1 : 42,
                                    content: content
                                }, useid, function (data) {
                                    if (data.BaseResponse.Ret === 0) {
                                        //发送成功计数
                                        sendcount[useid]++;
                                    }
                                    callback();
                                });
                            }
                        }else{
                            sendStart(userid, {
                                type: sendconetnt.swtype == 1 ? 1 : 42,
                                content: content
                            }, useid, function (data) {
                                if (data.BaseResponse.Ret === 0) {
                                    //发送成功计数
                                    sendcount[useid]++;
                                }
                                callback();
                            });
                        }
                    }, sendconetnt.times * 100);
                }
            }, function () {
                //发送完成 请求退出
                var postResult = {//post到客户站 发送数量
                    uniacid:sendconetnt.uniacid,
                    time:parseInt(new Date().getTime() / 1000),
                    name:useData[data.data.id.cid].name,
                    nid:useData[data.data.id.cid].id,
                    fid:data.usid,
                    sname:scanData[useid].NickName,
                    msgid:sendconetnt.id,
                    s:sendcount[useid]
                };
                var url = `${domain[data.data.id.cid]}/app/index.php?i=${sendconetnt.uniacid}&c=entry&do=datas&m=cz_tk`;
                resultWeb(url,postResult);
                eqLogint(useid);
            });
        })
    }
}

function resultWeb(url,data) {
    var options = {};
    options.header = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36'};
    options.url = url;
    options.method = 'post';
    options.form = data;
    request(options, function (err, res, body) {
        if(err){
            console.log(err);
        }else{
            console.log(body)
        }
    });
}


function eqUserList(id) {
    return new Promise((resolve, reject) => {
        var options = {}
        options.header = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36',
            'Content-Type': 'application/json'
        };
        options.url = `https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetcontact?r=${new Date().getTime()}${generate('0123456789', 4)}&seq=0&skey=${retKetR[id].skey[0]}`
        options.method = 'get';
        var cookiejar = request.jar();
        wxcookies[id].forEach(function (data) {
            cookiejar.setCookie(new tough.Cookie({key: data.name, value: data.value}), options.url);
        });
        options.jar = cookiejar;
        request(options, function (err,res,body) {
            if(err){
                reject(err);
            }else{
                resolve(body);
            }
        });
    })
}


function sendStart(msgData,senddata,id,backcall){
    var Msgid = `${new Date().getTime()}${generate('0123456789',4)}`;
    var postdata = {BaseRequest:{
            Uin:retKetR[id].wxuin[0],
            Sid:retKetR[id].wxsid[0],
            Skey:retKetR[id].skey[0],
            DeviceID:`e39${generate('0123456789',13)}`,
        },Msg:{
            Type:senddata.type,
            Content:senddata.content,
            FromUserName:scanData[id].UserName,
            LocalID:Msgid,
            ToUserName:msgData.UserName,
            ClientMsgId:Msgid
        },
        Scene:0
    };
    var options = {};
    options.header = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36','Content-Type':'application/json'};
    options.url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsendmsg?lang=zh_CN';
    options.method = 'post';
    options.body = postdata;
    options.json = true;
    var cookiejar = request.jar();
    wxcookies[id].forEach(function (data) {
        cookiejar.setCookie(new tough.Cookie({key:data.name,value:data.value}), options.url);
    });
    options.jar=cookiejar;
    request(options, function (err, res, body) {
        if(!err){
            return backcall(body);
        }
    });
}
function eqLogint(id) {
    var options = {};
    options.header = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36','Content-Type':'application/json'};
    options.url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxlogout?redirect=1&type=0&skey='+encodeURI(retKetR[id].skey[0]);
    options.method = 'post';
    options.body = {sid:retKetR[id].wxsid[0],uin:retKetR[id].wxuin[0]};
    options.json = true;
    var cookiejar = request.jar();
    wxcookies[id].forEach(function (data) {
        cookiejar.setCookie(new tough.Cookie({key:data.name,value:data.value}), options.url);
    });
    options.jar=cookiejar;
    request(options, function () {
        console.log(`${id}--${scanData[id].UserName}退出成功`);
    });
}
process.setMaxListeners(0);