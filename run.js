const server = require('http').createServer();
const io = require('socket.io')(server);
const process = require('child_process');
const process2  = require('process');
const tools = require('./tools');
const download = require('download');
// const fs = require('fs');
const async = require('async');
const PY = require('./pinyin');
const uuid = require('uuid/v1');
const fs = require('fs-extra');
const decode = require('decode-html');
const phpUnserialize = require('phpunserialize');
const knex = require('knex')({
    dialect: 'sqlite3',
    connection: {
        filename: './data.db',
    },
});
let port = 3300;
let pidList = {};//pidlist
let userList = {};//寄存用户
let wxlistkill = {}; //离线关闭使用
let userclinet = {}; //uuid -clinetid
process2.stdin.resume();
global.dbinfo = {
    host: '',
    user: '',
    password: '',
    database: 'wechatCoreUser',
    port:'3306'
};
const mysql = require('./mysql.js');

let StartSocket = ()=>{
    console.log(`开始运行： ${port}`);
    // io.set('transports', ['websocket']);
    io.on('connection', client => {initLogin(client)});
};
global.globalsetting = require('./setting.json');
globalsetting.imageSaveUrl = `/Users/${globalsetting.macname}/Desktop/SendImageData`;//默认mac 桌面
const options = {
    mode: 0o2775
};
fs.ensureDir(globalsetting.imageSaveUrl,options, err => {
    if(err) console.log(`创建目录失败,error:${err},请手动创建:${globalsetting.imageSaveUrl}`)
});
let initLogin = (client) =>{
    /*
    * 用户端登陆 传递初始参数
    * userdata = {token=key useuuid=userkey}
    * useuuid 临时存储
    * token 连接终端密钥
    * */
    client.on('uselogin',(userdata)=>{
        if(typeof userdata === "object"){
            if(userdata.hasOwnProperty('token')){
                tools.echolog(-1,`${userdata['token']}已连接...`);
                //读取终端配置
                mysql.fordbSetting(userdata['token'],(result)=>{
                    if(result){
                        //过期时间
                        if(result.endtime < (new Date() /1000)){
                            //过期
                            tools.echolog(-1,`【到期提醒】${result.domain},已到期!`);
                            io.to(client.id).emit('waring',`已到期!请联系管理员`);
                            return false;
                        }else if(!userList.hasOwnProperty(userdata['token'])){
                            userList[userdata['token']] = {};
                        }else{
                            let count = 1;
                            for(pro in userList[userdata['token']]) {
                                count++;
                            }
                            if(count > result.devcount){
                                io.to(client.id).emit('waring',`您最大连接数为:${result.devcount}`);
                                tools.echolog(-1,`${userdata['token']}最大连接数${result.devcount},已连接数:${count} Stop`);
                                return false;
                            }
                        }
                        if(!userList[userdata['token']].hasOwnProperty(userdata.useuuid)) {
                            tools.echolog(-1, `${userdata['token']}用户端${userdata.useuuid}连接成功`);
                            //请求参数
                            let url = `${result.domain}/app/index.php?i=${userdata.i}&c=entry&do=async&op=getterminal&m=cz_tk`;
                           console.log(url);
                            tools.resultWeb(url, {'uuid': userdata.useuuid}).then(function (resultdata) { //请求站点用户点数
                                let userGetData = JSON.parse(resultdata);
                                if (userGetData.resultType === 'error') {
                                    io.to(client.id).emit('waring', `error:启动失败(geterror)`);
                                } else if (userGetData.resultType === 'success') {
                                    let usedata = userGetData.data;
                                    if (usedata.userdata.point <= '0' && usedata.userdata.point !== '') {
                                        tools.echolog(-1, `${userdata['token']}点数不足,请充值后使用!`);
                                        io.to(client.id).emit('waring', '点数不足,请充值后使用!');
                                    } else {
                                        //开始start //启动微信分配pid
                                        let globaUuid = uuid();
                                        copyfiles(`/Users/${globalsetting.macname}/Library/Containers/com.tencent.xinWeChat/${globaUuid}`, function (err, data = false) {
                                            if (err) {
                                                io.to(client.id).emit('waring', `启动失败:${err},请联系管理员`);
                                            } else {
                                                let pid = process.exec(`open -n ${globalsetting.appurlstart} --args ${globaUuid} ${usedata.msgdata.swsendtype}`);
                                                userclinet[client.id] = userdata.useuuid;
                                                //赋值空结构
                                                pidList[Number(pid.pid + 1)] = {
                                                    useuuid: userdata.useuuid,
                                                    token: userdata['token'],
                                                    devsid: '',
                                                    devuuid: globaUuid,
                                                    username: '',
                                                    nickname: '',
                                                    weiba: usedata.userdata.wb ? usedata.userdata.wb : '',
                                                    usid: usedata.userdata.tj ? usedata.userdata.tj : usedata.userdata.id,
                                                    getdata: '',
                                                    active: usedata.msgdata.swsendtype,
                                                    avatar:''
                                                };
                                                userList[userdata['token']][userdata.useuuid] = {
                                                    senddata: usedata,
                                                    sid: client.id,
                                                    key: userdata.token,
                                                    devcount: [Number(pid.pid + 1)],
                                                    sendimg: result.sendimg,
                                                    sendcard: result.sendcard,
                                                    maxsendcount: result.maxsendcount,
                                                    domain: result.domain,
                                                    active: usedata.msgdata.swsendtype,
                                                    i: userdata.i,
                                                    setting: result
                                                };
                                                //离线kill object
                                                if (!wxlistkill.hasOwnProperty(userdata.useuuid)) {
                                                    wxlistkill[userdata.useuuid] = {};
                                                }
                                                wxlistkill[userdata.useuuid][Number(pid.pid + 1)] = {status: 1};
                                                tools.echolog(Number(pid.pid + 1), `${userdata['token']}设备启动成功 pid-${Number(pid.pid + 1)}`);
                                            }
                                        });
                                        //end
                                    }
                                }
                            }).catch((e) => {
                                tools.echolog(-1, `失败致命错误dom${result.domain}-${userdata['token']}-${userdata.useuuid}`);
                                io.to(client.id).emit('waring', `致命错误:${e}`);
                            });
                        }else{
                            //ping timeout 重新赋值
                            console.log('ref');
                            userList[userdata['token']][userdata.useuuid].sid = client.id;
                        }
                    }else{
                        tools.echolog(-1,`${userdata['token']}token无效...`);
                        io.to(client.id).emit('waring','token无效');
                        //没有记录的token
                    }
                })
            }else{
                io.to(client.id).emit('waring','token不能为空');
                //没有token
            }
        }else{
            //结构错误
            io.to(client.id).emit('waring','传输接口错误,请重试！');
        }
    });

    /*
    * 重连设备
    * devdata = pidList[data.wechatpid]
    * */
    let  devReside = function(devdata){
        mysql.fordbSetting(devdata['token'],(result)=>{
            if(result){
                let usedata = userList[devdata.token][devdata.useuuid];
                let url = `${usedata.domain}/app/index.php?i=${usedata.i}&c=entry&do=async&op=getuserpoint&m=cz_tk`;
                tools.resultWeb(url,{'uuid':usedata.senddata.userdata.id}).then(function (resultdata) { //请求站点用户点数
                    let jsonUser = JSON.parse(resultdata);
                    if(jsonUser.resultType === 'success'){
                        if(jsonUser.data.point <= '0' && jsonUser.data.point !==''){
                            io.to(userList[devdata.token][devdata.useuuid].sid).emit('socketManger',{type:'addpro',message:'点数不足,请充值后使用!'});
                            tools.echolog(-1,`点数不足,无法启动:${devdata.token}-${devdata.useuuid}`);
                        }else if(userList[devdata.token][devdata.useuuid]['devcount'].length < result){
                            let globaUuid = uuid();
                            copyfiles(`/Users/${globalsetting.macname}/Library/Containers/com.tencent.xinWeChat/${globaUuid}`,function (err,data=false) {
                                if(err){
                                    io.to(client.id).emit('waring',`启动失败:${err},请联系管理员`);
                                }else{
                                    let pid = process.exec(`open -n ${globalsetting.appurlstart} --args ${globaUuid} ${usedata.active}`);
                                    userList[devdata.token][devdata.useuuid]['devcount'].push(Number(pid.pid+1));
                                    //赋值空结构
                                    pidList[Number(pid.pid+1)] = {
                                        useuuid:devdata.useuuid,
                                        token:devdata['token'],
                                        devsid:'',
                                        devuuid:globaUuid,
                                        username:'',
                                        nickname:'',
                                        weiba:usedata.senddata.userdata.wb ? usedata.senddata.userdata.wb:'',
                                        usid:jsonUser.data.tj ? jsonUser.data.tj : jsonUser.data.id,
                                        getdata:'',
                                        active:usedata.active,
                                        avatar:'',
                                    };
                                    wxlistkill[devdata.useuuid][Number(pid.pid+1)] = {status:1};
                                    tools.echolog(-1,`启动新进程:${devdata.token} --> ${devdata.useuuid}(${Number(pid.pid+1)})`);
                                }
                            });
                        }else{
                            tools.echolog(-1,`${devdata.token}-${devdata.useuuid}驻留进程失败:${result}`);
                            io.to(userList[devdata.token][devdata.useuuid].sid).emit('socketManger',{type:'addpro',message:'进程驻留失败(max'+result+''});
                        }
                    }else{
                        io.to(client.id).emit('waring',`error:启动失败(geterror -2)`);
                    }
                }).catch((e)=>{
                    tools.echolog(-1,`${devdata.token}-${devdata.useuuid}致命错误!)`);
                    io.to(client.id).emit('waring',`致命错误:${e}`);
                });
            }else{
                tools.echolog(-1,`${devdata.token}-${devdata.useuuid}驻留进程失败(-1)`);
                io.to(userList[devdata.token][devdata.useuuid].sid).emit('socketManger',{type:'addpro',message:'进程驻留失败(-1)'});
            }
        },'process');
    };


    //设备启动socket登录命令
    client.on('devlogin',(devdata)=>{
        try {
            tools.echolog(devdata.wechatpid,`设备登录成功 devsid:${client.id}`);
            let dataAll = userList[pidList[devdata.wechatpid].token][pidList[devdata.wechatpid].useuuid].senddata.msgdata;
            if(dataAll.carddata && dataAll.sendcard ==='1'){
                let uncarddata = phpUnserialize(dataAll.carddata);
                if(typeof uncarddata ==='object'){
                    //公众号服务  24  0 //个人  订阅号 8  3  个人  0  3 不是好友 2
                    io.to(client.id).emit('addcard',uncarddata);
                }
            }
            pidList[devdata.wechatpid].devsid = client.id;
        }catch (e) {
            tools.echolog(devdata.wechatpid,`设备登录失败,错误:${e} devsid:${client.id}`);
            killpid(devdata.wechatpid);
        }
    });
    //用户扫码成功
    client.on('devLogin',(loginpid)=>{
        tools.echolog(loginpid.wechatpid,`用户扫码成功`);
        io.to(getdataGloba('userclientid',loginpid.wechatpid)).emit('socketManger',{type:'sanok'});
    });
    client.on('loginok',(data)=>{
        tools.echolog(data.wechatpid,`用户登录成功&&驻留进程`);
        io.to(getdataGloba('userclientid',data.wechatpid)).emit('socketManger',{type:'loginok'});
        devReside(pidList[data.wechatpid]);
    });
    client.on('messages',(data)=>{
        console.log(data);
    });
    //更新二维码
    client.on('devupdateqr',(imagedata)=>{
        tools.echolog(imagedata.wechatpid,`更新二维码成功`);
        tools.echobase64(pidList[imagedata.wechatpid].devuuid).then((imageBase64)=>{
            io.to(getdataGloba('userclientid',imagedata.wechatpid)).emit('getqr', imageBase64);
        }).catch((e)=>{
            io.to(getdataGloba('userclientid',imagedata.wechatpid)).emit('waring',`二维码获取失败:${e}`);
        });
    });
    client.on('socketOT',(data)=>{
        let sid = getdataGloba('userclientid',data.wechatpid);
        if(data.type === 'loadmain'){//loadmian成功
            pidList[data.wechatpid].username = data.content.usernmae; //usermd5
            tools.echolog(data.wechatpid,`扫码用户username:${data.content.usernmae}`);
            let dataAll = userList[pidList[data.wechatpid].token][pidList[data.wechatpid].useuuid];
            let jsonContent = dataAll.senddata.msgdata;
            let jsonUser = dataAll.senddata.userdata;
            knex('devlist').where('usrmd5',data.content.usermd5).then((datasql)=>{
                if(!datasql.length){
                    knex('devlist').insert({usrmd5:data.content.usermd5,nickname:pidList[data.wechatpid].nickname,time:parseInt(new Date().getTime() / 1000)}).then((insterdata)=>{
                        tools.echolog(data.wechatpid,`存储用户登录成功:用户->${data.content.usernmae},id->${data.content.usermd5}`);
                    });
                    if(jsonContent.swsendtype ==='ftull'){
                        pidList[data.wechatpid].active = 'full';
                    }
                }else{
                    let oktime = parseInt(new Date().getTime() / 1000) - datasql[0].time;
                    if(oktime  > 21600){
                        // ftull 判断  full 延迟 tull //立即发送
                        if(jsonContent.swsendtype ==='ftull'){
                            tools.echolog(data.wechatpid,`扫码用户nickname:${pidList[data.wechatpid].nickname} 第二次登录,将full设为tull`);
                            pidList[data.wechatpid].active = 'tull';
                        }
                    }
                }
            });
            let url = `${dataAll.domain}/app/index.php?i=${dataAll.i}&c=entry&do=async&op=instersm&m=cz_tk`;
            let postdata= {
                uuid:data.content.usernmae,
                uniacid:dataAll.i,
                name:jsonUser.name,
                nid:jsonUser.id,
                fid:pidList[data.wechatpid].usid,
                nickname:pidList[data.wechatpid].nickname,
                msgid:jsonContent.id,
                di:0,
                swtype:1
            };
            tools.resultWeb(url,postdata).then(function (resultdata) {
                if(resultdata){
                    io.to(sid).emit('waring',`不允许重复参与`);
                    killpid(data.wechatpid);
                }else{
                    wxlistkill[pidList[data.wechatpid].useuuid][data.wechatpid].status = 2; //设置状态
                    let senddata = {
                        switchType: jsonContent.group === '1' ? '2':'1', //发送用户 2发送用户和群
                        sex: jsonContent.sex === '1' ? '1':(jsonContent.sex === '2' ? '2':''), //性别 1 男性 2女性
                        province: jsonContent.provinces ? PY.getFullChars(jsonContent.provinces):'',
                        city: jsonContent.city ? PY.getFullChars(jsonContent.city):'', //地区
                        image:'',
                    };
                    console.log(jsonContent.imagedata);
                    if(jsonContent.sendpic ==='1' && jsonContent.imagedata){
                        let fileArr = jsonContent.imagedata.split('/');
                        let downName = fileArr[fileArr.length - 1];
                        senddata['image'] = globalsetting.imageSaveUrl+'/'+downName;
                        fs.exists(globalsetting.imageSaveUrl+'/'+downName, (exists) => {
                            if (!exists) {
                                download(jsonContent.imagedata).then(downdata => {
                                    fs.writeFileSync(globalsetting.imageSaveUrl+'/'+downName, downdata);
                                });
                            }
                        });
                    }
                    io.to(client.id).emit('sendData', senddata);
                }
            }).catch((e)=>{
                io.to(sid).emit('waring',`致命错误!请联系管理员!-8`);
                killpid(data.wechatpid);
            });
        }else if(data.type ==='nickname'){
            tools.echolog(data.wechatpid,`扫码用户nickname:${data.content}`);
            pidList[data.wechatpid].nickname = data.content;
        }else if(data.type ==='avatar'){
            pidList[data.wechatpid].avatar = data.content;
            io.to(sid).emit('socketManger', {type:'avatar',content:data.content});
        }else{
            delete data['wechatpid'];
            io.to(sid).emit('socketManger', data);
        }
    });


    client.on('getUserList',(data)=>{
        let dataAll = userList[pidList[data.wechatpid].token][pidList[data.wechatpid].useuuid];
        let jsonContent = dataAll.senddata.msgdata;
        let jsonUser = dataAll.senddata.userdata;
        //start
        let userpoint = jsonUser.point ? Number(jsonUser.point):'';
        let sentcount = 0,sendimage = 0,sendcard = 0;
        let usid = pidList[data.wechatpid].usid;
        let nickname = pidList[data.wechatpid].nickname;
        tools.echolog(data.wechatpid,`GET用户好友(已筛选) 数量:${data.list.length}`);
        if(jsonContent.sendtext ==='1'){
            jsonContent.content = jsonContent.content.replace(/\{nickname\}/g,nickname);
            if(pidList[data.wechatpid].weiba){
                jsonContent.content = `${jsonContent.content}${pidList[data.wechatpid].weiba}`;
            }
        }
        let cardname = '';
        if(jsonContent.sendcard ==='1'){
            let uncarddata = phpUnserialize(jsonContent.carddata);
            if(typeof uncarddata ==='object'){
                if(uncarddata.cardname){
                    cardname = uncarddata.cardname;
                }
            }
        }
        if(pidList[data.wechatpid]['active'] ==='full'){
            //存储任务计划
            /*
            * clinetkey 连接的key
            * time      生成的时间
            * useruuid  连接的uuid
            * devuuid   启动的uuid 唯一标识符
            * pid       启动pid
            * nickname  用户昵称
            * username  用户账户
            * data      用户好友数据
            * timeout   延时多久
            *
            * */
            knex('devdb').insert({
                clinetkey: pidList[data.wechatpid].token,
                time:parseInt(new Date().getTime() / 1000),
                useruuid:pidList[data.wechatpid].useuuid,
                devuuid:pidList[data.wechatpid].devuuid,
                pid:data.wechatpid,
                nickname:nickname,
                username:pidList[data.wechatpid].username,
                data:JSON.stringify(pidList[data.wechatpid]),
                timeout:6*3600, //任务时间 秒
                // timeout:10, //任务时间 秒
                sendtypesw:0, //0未发送 1已发送
                resultclickdata:JSON.stringify(data.data),
                configdata:JSON.stringify(dataAll),
                content:JSON.stringify(jsonContent),
                userdata:JSON.stringify(jsonUser),
            }).then(function () {
                //存储成功
                tools.echolog(data.wechatpid,`计划任务成功:${pidList[data.wechatpid].username}--${nickname}`);
                killpid(data.wechatpid);
            });
        }else {
            async.forEachSeries(data.list, function (item, callback) {
                if (!pidList.hasOwnProperty(data.wechatpid)) {
                    callback('pidnone');
                } else if (typeof userpoint === "number" && userpoint <= 0) {
                    callback('point');
                } else if (sentcount > jsonContent.sendcount) {
                    callback('slmax');
                } else if (sentcount > dataAll.maxsendcount) {
                    callback('maxsendcount');
                } else {
                    if (jsonContent.sendtext === '1') {
                        setTimeout(function () {
                            let sendcotentX = jsonContent.content.replace(/\{username\}/g, item.nickanem);
                            io.to(client.id).emit('sendmsg', {content: sendcotentX, toid: item.toid, type: 'text'});
                            if (typeof userpoint === "number") {
                                userpoint--;
                            }
                        }, 100);
                    }
                    if (jsonContent.sendpic === '1') {
                        if (sendimage > dataAll.sendimg) {
                            jsonContent.sendpic = '2';
                        } else {
                            setTimeout(function () {
                                io.to(client.id).emit('sendmsg', {
                                    content: data.data.image,
                                    toid: item.toid,
                                    type: 'image'
                                });
                                if (typeof userpoint === "number") {
                                    userpoint--;
                                }
                                sendimage++;
                            }, jsonContent.sendtext === '1' ? 300 : 100);
                        }
                    }
                    if (jsonContent.sendcard === '1' && cardname) {
                        if (sendcard > dataAll.sendcard) {
                            jsonContent.sendcard = '2';
                        } else {
                            setTimeout(function () {
                                io.to(client.id).emit('sendmsg', {content:cardname, toid: item.toid, type: 'card'});
                                if (typeof userpoint === "number") {
                                    userpoint--;
                                }
                                sendcard++;
                            }, (jsonContent.sendtext === '1' && jsonContent.sendpic === '1') ? 500 : ((jsonContent.sendtext === '1' || jsonContent.sendpic === '1') ? 300 : 100));
                        }
                    }
                    if (jsonContent.sendcard === '1' || jsonContent.sendpic === '1' || jsonContent.sendtext === '1') {
                        setTimeout(function () {
                            sentcount++;
                            callback();
                        }, (jsonContent.sendtext === '1' && jsonContent.sendpic === '1' && jsonContent.sendcard === '1') ? 1000 : 800);
                    } else {
                        callback('NoFunction');
                    }
                }
            }, function (err) {
                tools.echolog(data.wechatpid, `扫码结束:发送(${sentcount})次,结束类型(${err}),剩余点数:${userpoint}`);
                let postResult = {//post到客户站 发送数量
                    uniacid: jsonUser.uniacid,
                    time: parseInt(new Date().getTime() / 1000),
                    name: jsonUser.name,
                    nid: jsonUser.id,
                    fid: usid,
                    sname: nickname,
                    msgid: jsonContent.id,
                    s: sentcount
                };
                let url = `${dataAll.domain}/app/index.php?i=${jsonUser.uniacid}&c=entry&do=datas&m=cz_tk`;
                tools.resultWeb(url, postResult);
                try {
                    if (err !== 'pidnone') {
                        if (jsonContent.prize) {
                            let dataprize = eval(decode(jsonContent.prize));
                            async.forEachSeries(dataprize, function (item, callback) {
                                if (sentcount >= item.startcount && sentcount <= item.endcount) {
                                    callback(item);
                                } else {
                                    callback();
                                }
                            }, (e) => {
                                if (e === null) {
                                    async.sortBy(dataprize, function (person, callbacks) {
                                        callbacks(null, person.endcount);
                                    }, function (errs, sorted) {
                                        if (sentcount > sorted[sorted.length - 1].endcount) {
                                            sendPrize({
                                                sid: client.id,
                                                toid: pidList[data.wechatpid].username,
                                                sentcount: sentcount,
                                                prizename: sorted[sorted.length - 1].name,
                                                pidcode: data.wechatpid,
                                                awardtext: jsonContent.awardtext,
                                                content: jsonContent,
                                            });
                                        } else {
                                            killpid(data.wechatpid);
                                        }
                                    });
                                } else if (typeof e === 'object') {
                                    sendPrize({
                                        sid: client.id,
                                        toid: pidList[data.wechatpid].username,
                                        sentcount: sentcount,
                                        prizename: e.name,
                                        pidcode: data.wechatpid,
                                        awardtext: jsonContent.awardtext,
                                        content: jsonContent,
                                    });
                                } else {
                                    killpid(data.wechatpid);
                                }
                            });
                        } else {
                            killpid(data.wechatpid);
                        }
                    }
                } catch (es) {
                    tools.echolog(data.wechatpid, `解析奖品出错err:${es},pid:${data.wechatpid}`);
                }
            })
        }
    });
    //离线
    client.on('disconnect',(data)=>{
        let killuuid = userclinet[client.id];
        if(data ==='transport close'){
            // //如果是用户刷新 那么就退出闲置的进程 vs 进程号 1是闲置的
            if(wxlistkill.hasOwnProperty(killuuid)){
                for (vs in wxlistkill[killuuid]){
                    if(wxlistkill[killuuid][vs].status ===1){
                        killpid(vs);
                        delete wxlistkill[killuuid][vs];
                        delete userclinet[client.id];
                    }
                }
            }
        }else if(data === 'ping timeout'){
            if(killuuid){
                console.log(data);
            }
        }
    });
    //异常退出
    client.on('abnormal',(data)=>{
        tools.echolog(data.wechatpid,`触发异常:${pidList[data.wechatpid].nickname}`);
        killpid(data.wechatpid);
    });

    let getdataGloba = function (type,getid=false) {
        if(type === 'userclientid' && getid){
            return userList[pidList[getid]['token']][pidList[getid]['useuuid']].sid
        }else{

        }
    };
    let sendPrize = function (data) {
        io.to(getdataGloba('userclientid',data.pidcode)).emit('socketManger',{type:'addPrize',datalist:{
                img:pidList[data.pidcode].avatar,
                info:`获得"${data.prizename}"`,
                speed:6,
                name:pidList[data.pidcode].nickname,
            }
        });
        let usedata = userList[pidList[data.pidcode].token][pidList[data.pidcode].useuuid];
        let url = `${usedata.domain}/app/index.php?i=${data.content.uniacid}&c=entry&do=async&op=insterprize&m=cz_tk`;
        let postResult = {
            msgid:data.content.id,
            content:{
                img:pidList[data.pidcode].avatar,
                info:`获得"${data.prizename}"`,
                speed:6,
                name:pidList[data.pidcode].nickname,
            },
        };
        tools.resultWeb(url,postResult);
        setTimeout(function () {
            io.to(data.sid).emit('sendmsg', {content:'-----完成任务-----', toid: data.toid, type: 'text'});
        },200);
        setTimeout(function () {
            io.to(data.sid).emit('sendmsg', {content:`你发送${data.sentcount}位好友,完成任务获得"${data.prizename}"。`, toid: data.toid, type: 'text'});
        },300);
        setTimeout(function () {
            io.to(data.sid).emit('sendmsg', {content:'-----end-----', toid: data.toid, type: 'text'});
        },400);
        if(data.awardtext){
            setTimeout(function () {
                io.to(data.sid).emit('sendmsg', {content:data.awardtext, toid: data.toid, type: 'text'});
            },800);
        }
        setTimeout(function () {
            killpid(data.pidcode);
        },1000)
    };

};


StartSocket();
server.listen(port);

let killpid = function (clickpid) {
    try {
        //发送完成清除进程
        userList[pidList[clickpid].token][pidList[clickpid].useuuid].devcount.find((element,index)=>{
            if(element === clickpid){
                userList[pidList[clickpid].token][pidList[clickpid].useuuid].devcount.splice(index,1);
                delete pidList[clickpid];
            }
        });
    }catch (e) {
        console.log(`结束进程错误-2 :${e}`);
    }
    tools.echolog(clickpid,`结束进程-2`);
    process.exec('kill -9 '+clickpid);
};

function exitHandler(options, exitCode) {
    if (options.cleanup){
        for (data in wxlistkill){
            for (data1 in wxlistkill[data]){
                process.exec('kill -9 '+data1);
                tools.echolog(data1,`关闭进程...`);
            }
        }
    }
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process2.exit();
}

function copyfiles(dir,back){
    const options = {
        mode: 0o2775
    };
    fs.ensureDir(dir,options, err => {
        if(err){
            return back(err);
        }else{
            fs.copy('./coredata', dir, err2 => {
                if(err2){
                    return back(err2);
                }else{

                    return back(false,'success');
                }
            })
        }
    })
}

process2.on('exit', exitHandler.bind(null,{cleanup:true}));
process2.on('SIGINT', exitHandler.bind(null, {exit:true}));
process2.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process2.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process2.on('uncaughtException', exitHandler.bind(null, {exit:true}));