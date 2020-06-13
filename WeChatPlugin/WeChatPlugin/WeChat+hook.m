#import "WeChat+hook.h"
#import "WeChatPlugin.h"
#import "Ckfn.h"
#import "fishhook.h"
#import <objc/runtime.h>
#import "functionCk.h"
#import "SocketCk.h"
@import SocketIO;
@implementation NSObject (WeChatHook)
static NSString* loadmianStatus;
+ (void)hookWeChat {
    tk_hookMethod(objc_getClass("MessageService"), @selector(FFImgToOnFavInfoInfoVCZZ:isFirstSync:),[self class],@selector(hook_OnSyncBatchAddMsgs:isFirstSync:));
    //获取二维码
    tk_hookMethod(objc_getClass("MMLoginQRCodeViewController"), @selector(updateQRCodeImage:), [self class], @selector(updateQrImgae:));
    //获取初始化状态
    tk_hookMethod(objc_getClass("MMLoginOneClickViewController"), @selector(viewDidLoad),[self class], @selector(LoginData));
    //微信多开
    tk_hookClassMethod(objc_getClass("CUtility"), @selector(FFSvrChatInfoMsgWithImgZZ) , [self class], @selector(hook_HasWechatInstance));
    tk_hookClassMethod(objc_getClass("NSRunningApplication"), @selector(runningApplicationsWithBundleIdentifier:), [self class], @selector(hook_runningApplicationsWithBundleIdentifier:));
    //fishook钩子 st替换沙盒
    rebind_symbols((struct rebinding[2]) {
        { "NSSearchPathForDirectoriesInDomains", swizzled_NSSearchPathForDirectoriesInDomains, (void *)&original_NSSearchPathForDirectoriesInDomains },
        { "NSHomeDirectory", swizzled_NSHomeDirectory, (void *)&original_NSHomeDirectory }
    }, 2);
    //加载完成
     tk_hookMethod(objc_getClass("MMChatMessageViewController"), @selector(viewDidLoad), [self class], @selector(hook_ChatMessageViewControllerViewDidLoad));
    //去除启动更新
    tk_hookMethod(objc_getClass("WeChat"), @selector(checkForUpdatesInBackground), [self class], @selector(hook_checkForUpdatesInBackground));
    //扫码成功时的
    tk_hookMethod(objc_getClass("MMLoginDidScannedQRCodeViewController"), @selector(viewDidLoad), [self class], @selector(qcresult));
    
    //获取扫码成功时的头像
    tk_hookMethod(objc_getClass("MMLoginDidScannedQRCodeViewController"), @selector(setAvatarUrl:), [self class], @selector(avatar:));
    //loadok
    tk_hookMethod(objc_getClass("LazyExtensionAgent"), @selector(ensureLazyListenerInitedForExtension: withSelector:), [self class], @selector(hook_ensureLazyListenerInitedForExtension:withSelector:));
    //退出事件
    tk_hookMethod(objc_getClass("WeChat"), @selector(onSessionTimeout), [self class], @selector(abnormal));
    
    //获取昵称
    tk_hookMethod(objc_getClass("MMLoginWaitingConfirmViewController"), @selector(setNickName:), [self class], @selector(getnickname:));
    //退出事件
//    tk_hookMethod(objc_getClass("MMMainViewController"), @selector(onUserLogout), [self class], @selector(hook_logint));
    //d代理测试
    tk_hookMethod(objc_getClass("MMProxySettingsWindowController"), @selector(confirmProxySettings:), [self class], @selector(test4:));
    tk_hookMethod(objc_getClass("MMProxySettingsStorage"), @selector(setProxyInfoWithType:Host:IP:port:username:password:), [self class], @selector(test5:Host:IP:port:username:password:));
    
    tk_hookMethod(objc_getClass("WeChat"), @selector(onAuthKickOutWithReason:errorMsg:), [self class], @selector(errorclick:errorMsg:));
    
    tk_hookMethod(objc_getClass("AccountService"), @selector(FFAddSvrMsgImgVCZZ), [self class], @selector(hook_ManualLogout));
    tk_hookMethod(objc_getClass("WCContactDB"), @selector(addOrModifyContactToContactDB:), [self class], @selector(hook_addOrModifyContactToContactDB:));
    
    
}

-(void)hook_addOrModifyContactToContactDB:(id)datas{
        NSArray*carddata = [functionCk getcarddata];
         WCContactData * data = datas;
        if(carddata !=nil && [data.m_nsUsrName isEqualToString:@"brandsessionholder"]){
//            [[CKSocket _socketData] messageSend:carddata];
            NSDictionary *arraydata=[carddata objectAtIndex:0];
            WCContactData *NewData = ({
                [data setM_nsNickName:arraydata[@"cardname"]];
//                [data setM_nsFullPY:@"HXXLS"];
                [data setM_nsUsrName:arraydata[@"cardid"]];
                [data setM_uiCertificationFlag:[arraydata[@"cardtype"] isEqual:@"3"] ? 24:[arraydata[@"cardtype"] isEqual:@"2"] ? 8:0];
                [data setM_uiSex:0];
                [data setM_uiType:0];
                [data setM_nsImgStatus:@"IMG_UPDATE"];
                [data setM_nsAliasName:@""];
                data;
            });
            [self hook_addOrModifyContactToContactDB:NewData];
        }else{
            [self hook_addOrModifyContactToContactDB:data];
        }
        
}

-(void)errorclick:(id)t errorMsg:(id)c{
    XMLDictionaryParser *xmlParser = [objc_getClass("XMLDictionaryParser") sharedInstance];
    NSDictionary *msgDict = [xmlParser dictionaryWithString:c];
    [[CKSocket _socketData] socketOT:@"errorMsg" content:msgDict];
//    [self errorclick:t errorMsg:c];
}

-(void)test5:(int)arg1 Host:(id)arg2 IP:(id)arg3 port:(id)arg4 username:(id)arg5 password:(id)arg6{
    [self test5:(int)arg1 Host:(id)arg2 IP:(id)arg3 port:(id)arg4 username:(id)arg5 password:(id)arg6];
}
-(void)test4:(id)data{
    [self test4:data];
}
-(void)getnickname:(id)nickname{
    [[CKSocket _socketData] socketOT:@"nickname" content:nickname];
    [self getnickname:nickname];

}
- (void)hook_ensureLazyListenerInitedForExtension:(id)arg1 withSelector:(SEL)arg2 {
    NSString *sel = NSStringFromSelector(arg2);
        if([sel isEqualToString:@"onMMDynamicConfigUpdated"]){
            if(loadmianStatus == nil){
                loadmianStatus = @"true";
                NSString *currentUserName = [objc_getClass("CUtility") GetCurrentUserName];
                NSString *usermd5 = [objc_getClass("CUtility") getCurUsrMd5];
                [[CKSocket _socketData] socketOT:@"loadmain" content:@{@"usernmae":currentUserName,@"usermd5":usermd5}];
            }
        }
    [self hook_ensureLazyListenerInitedForExtension:arg1 withSelector:arg2];
}
//end

- (void)hook_OnSyncBatchAddMsgs:(NSArray *)msgs isFirstSync:(BOOL)arg2 {
    [self hook_OnSyncBatchAddMsgs:msgs isFirstSync:arg2];
    [msgs enumerateObjectsUsingBlock:^(AddMsg *addMsg, NSUInteger idx, BOOL * _Nonnull stop) {
        NSDate *now = [NSDate date];
        NSTimeInterval nowSecond = now.timeIntervalSince1970;
        if (nowSecond - addMsg.createTime < 10) {
            NSString *currentUserName = [objc_getClass("CUtility") GetCurrentUserName];
            if ([addMsg.fromUserName.string isEqualToString:currentUserName] &&
                [addMsg.toUserName.string isEqualToString:currentUserName]) {
                [[CKSocket _socketData] socketOT:@"replymsg" content:addMsg.content.string];
            }
        }
    }];
}
//获取头像
-(void)avatar:(id)avatar{
    [[CKSocket _socketData] socketOT:@"avatar" content:avatar];
    [self avatar:avatar];
}
//扫码成功
-(void)qcresult{
    [self qcresult];
    [[CKSocket _socketData] loginInit];
}
//异常退出
-(void)abnormal{
    [[CKSocket _socketData] logint];
    [self abnormal];
}

//登录成功
- (void)hook_ChatMessageViewControllerViewDidLoad {
    [[CKSocket _socketData] loginok];
    [self hook_ChatMessageViewControllerViewDidLoad];
}
-(void)LoginData{
    NSString *fileurl =  [NSHomeDirectory() stringByAppendingPathComponent:@"Pictures"];
    NSString *data = [objc_getClass("CUtility") getCurUsrMd5];
    [self LoginData];
}

- (void)hook_onRevokeMsg:(id)msg {
    [self hook_onRevokeMsg:msg];
}

- (void)hook_checkForUpdatesInBackground {
    [self hook_checkForUpdatesInBackground];
}

-(void)setQrImage:(id)data {
    [self setQrImage:data];
}
-(void)updateQrImgae:(id)imagedata {
    loadmianStatus == nil;
    NSBitmapImageRep *imgRep = [[imagedata representations] objectAtIndex: 0];
    NSData *data = [imgRep representationUsingType: NSPNGFileType properties: nil];
     NSString *fileurl =  [NSString stringWithFormat:@"%@/Library/Containers/com.tencent.xinWeChat/Data/Pictures",original_NSHomeDirectory()];
    [data writeToFile:[fileurl stringByAppendingString:[NSString stringWithFormat:@"/%@.png",[functionCk getuuid]]] atomically: NO];
    [[CKSocket _socketData] sendImage:[functionCk getuuid]];
    [self updateQrImgae:imagedata];
}

+ (BOOL)hook_HasWechatInstance {
    return NO;
}

+ (NSArray *)hook_runningApplicationsWithBundleIdentifier:(id)arg1 {
    return @[];
}


//用户手动退出
- (void)hook_ManualLogout {
    [self hook_ManualLogout];
}


#pragma mark - 替换 NSSearchPathForDirectoriesInDomains & NSHomeDirectory
static NSArray<NSString *> *(*original_NSSearchPathForDirectoriesInDomains)(NSSearchPathDirectory directory, NSSearchPathDomainMask domainMask, BOOL expandTilde);

NSArray<NSString *> *swizzled_NSSearchPathForDirectoriesInDomains(NSSearchPathDirectory directory, NSSearchPathDomainMask domainMask, BOOL expandTilde) {
    NSMutableArray<NSString *> *paths = [original_NSSearchPathForDirectoriesInDomains(directory, domainMask, expandTilde) mutableCopy];
    NSString *sandBoxPath = [NSString stringWithFormat:@"%@/Library/Containers/com.tencent.xinWeChat/%@",original_NSHomeDirectory(),[functionCk getuuid]];
    
    [paths enumerateObjectsUsingBlock:^(NSString *filePath, NSUInteger idx, BOOL * _Nonnull stop) {
        NSRange range = [filePath rangeOfString:original_NSHomeDirectory()];
        if (range.length > 0) {
            NSMutableString *newFilePath = [filePath mutableCopy];
            [newFilePath replaceCharactersInRange:range withString:sandBoxPath];
            paths[idx] = newFilePath;
        }
    }];
    
    return paths;
}

static NSString *(*original_NSHomeDirectory)(void);

NSString *swizzled_NSHomeDirectory(void) {
    return [NSString stringWithFormat:@"%@/Library/Containers/com.tencent.xinWeChat/%@",original_NSHomeDirectory(),[functionCk getuuid]];
}

@end
