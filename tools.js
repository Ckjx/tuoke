const fs = require('fs');
const request = require('request');
exports.echobase64  = function (uuid) {
    return new Promise((resolve,reject)=>{
        fs.readFile(`/Users/${globalsetting.macname}/Library/Containers/com.tencent.xinWeChat/Data/Pictures/${uuid}.png`,(err,data)=>{
            if(err){
                reject(err);
            }
            resolve(`data:image/png;base64,${data.toString('base64')}`);
        });
    })
};
exports.time = function(date){
    let dates = new Date(date);
    let time = Math.floor((dates.getTime()/1000));
    return time;
};

exports.timeToStr=function(ts){
    if(isNaN(ts)){
        return "--:--:--";
    }
    let h=parseInt(ts/3600);
    let m=parseInt((ts%3600)/60);
    let s=parseInt(ts%60);
    return (this.ultZeroize(h)+":"+this.ultZeroize(m)+":"+this.ultZeroize(s));
};

exports.dateToStr=function(d){
    return (d.getFullYear()+"-"+this.ultZeroize(d.getMonth()+1)+"-"+this.ultZeroize(d.getDate())+" "+this.ultZeroize(d.getHours())+":"+this.ultZeroize(d.getMinutes())+":"+this.ultZeroize(d.getSeconds()));
};

exports.ultZeroize=function(v,l){
    let z="";
    l=l||2;
    v=String(v);
    for(let i=0;i<l-v.length;i++){
        z+="0";
    }
    return z+v;
};

exports.echolog = function (pid,data) {
    let date = new Date();
    console.log(`[${date.toDateString()}  ${date.toLocaleTimeString()}]:【${pid}】${data}`);
};
exports.resultWeb = function (url,data) {
    return new Promise((resolve,reject)=>{
        let options = {};
        options.header = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36'};
        options.url = url;
        options.method = 'post';
        options.form = data;
        request(options, function (err, res, body) {
            if(err){
                reject(err);
            }else{
                resolve(body);
            }
        });
    });
};