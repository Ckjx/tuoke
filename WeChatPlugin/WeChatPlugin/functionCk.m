#import "functionCk.h"
#import "WeChatPlugin.h"
#import "SocketCk.h"

@interface functionCk()
@property (nonatomic,strong) MessageService *service;
@end

@implementation functionCk
static NSString* strs;
static id carddata = nil;
+ (instancetype)shareManager {
    static id manager = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        manager = [[self alloc] init];
    });
    return manager;
}

- (void)sendTextMessageToSelf:(id)msgContent {
    NSString *currentUserName = [objc_getClass("CUtility") GetCurrentUserName];
    [self sendTextMessage:msgContent toUsrName:currentUserName delay:0];
}

- (void)sendTextMessage:(id)msgContent toUsrName:(id)toUser delay:(NSInteger)delayTime {
    NSString *currentUserName = [objc_getClass("CUtility") GetCurrentUserName];
    if (delayTime == 0) {
        [self.service SendTextMessage:currentUserName toUsrName:toUser msgText:msgContent atUserList:nil];
        return;
    }
    __weak __typeof (self) wself = self;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(delayTime * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        dispatch_async(dispatch_get_main_queue(), ^{
            [wself.service SendTextMessage:currentUserName toUsrName:toUser msgText:msgContent atUserList:nil];
        });
    });
}

- (void)sendImageMessage:(NSString *)msgContent toUserName:(id)toUser {
    NSString *currentUserName = [objc_getClass("CUtility") GetCurrentUserName];
    NSImage *image = [[NSImage alloc] initWithContentsOfFile:msgContent];
    NSData *originalData = [image TIFFRepresentation];
    NSData *thumData = [self getCompressImageDataWithImg:image rate:0.07];
    SendImageInfo *info = [[objc_getClass("SendImageInfo") alloc] init];
    info.m_uiThumbWidth = 120;
    info.m_uiThumbHeight = 67;
    info.m_uiOriginalWidth  = 1920;
    info.m_uiOriginalHeight = 1080;
    [self.service SendImgMessage:currentUserName toUsrName:toUser thumbImgData:thumData midImgData:thumData imgData:originalData imgInfo:info];
}

- (void)sendUserCardMessage:(id)contact toUserName: (id)toUser{
    NSString *currentUserName = [objc_getClass("CUtility") GetCurrentUserName];
    ContactStorage *contactStorage = [[objc_getClass("MMServiceCenter") defaultCenter] getService:objc_getClass("ContactStorage")];
    WCContactData * userdata = [contactStorage GetContactWithNickName:contact];
    [self.service SendNamecardMsgFromUser:currentUserName toUser:toUser containingContact:userdata];
}

+(void)setuuid:(NSString *) str {
    if (str != nil) {
        strs = str;
    }
}
+(NSString *)getpid{
    NSProcessInfo *processInfo = [NSProcessInfo processInfo];
//    NSLog(@"输出%@",[processInfo.arguments objectAtIndex:1]);
    return [NSNumber numberWithInt:processInfo.processIdentifier];
}

+(void)setcard:(id)data{
    if (data !=nil) {
        carddata = data;
    }
}

+(NSArray *)getcarddata{
    if(carddata !=nil){
        return carddata;
    }else{
        return nil;
    }
}

+(NSString *)getuuid {
    return strs;
}
+(NSString *)getactive{
    NSProcessInfo *processInfo = [NSProcessInfo processInfo];
    NSString * statusType = [processInfo.arguments objectAtIndex:2];
    return statusType;
}


+(NSArray *)getUserList:(id)sex city:(id)city switchType:(id)switchType province:(id)province{
    NSArray *arr = [self getAllFriendContacts];
    NSMutableArray *userFind = [[NSMutableArray alloc] init];
    [arr enumerateObjectsUsingBlock:^(id  _Nonnull obj, NSUInteger idx, BOOL * _Nonnull stop) {
        WCContactData *contactData = (WCContactData *)obj;
        if (![contactData isBrandContact] && ![contactData isSelf]) {
            if(![contactData.m_nsNickName isEqual:@"微信团队"] && ![contactData.m_nsNickName isEqual:@"朋友推荐消息"] && ![contactData.m_nsNickName isEqual:@"QQ离线消息"] && ![contactData.m_nsNickName isEqual:@"漂流瓶"]&& ![contactData.m_nsNickName isEqual:@"语音记事本"]  && ![contactData.m_nsNickName isEqual:@"文件传输助手"]){
                NSString * UserSex = sex ? sex:nil;
                NSString * UserCity = city ?city:nil;
                NSString * UserProvince = province ? province:nil;
                if(![UserSex isEqualToString:@""]){
                    //如果不是指定性别 就跳出
                    if(![[NSString stringWithFormat:@"%u",contactData.m_uiSex] isEqual:sex]){
                        return;
                    }
                }
                //地区or省份
                if(![UserCity isEqualToString:@""]){
                    if(![[NSString stringWithFormat:@"%@",contactData.m_nsCity] isEqual:UserCity]){
                        return;
                    }
                }else if(![UserProvince isEqualToString:@""]){
                    if(![[NSString stringWithFormat:@"%@",contactData.m_nsProvince] isEqual:UserProvince]){
                        return;
                    }
                }
                NSDictionary *dict = @{@"nickanem":contactData.m_nsNickName,@"toid":contactData.m_nsUsrName,@"sex":[NSString stringWithFormat:@"%u",contactData.m_uiSex],@"Province":contactData.m_nsProvince,@"City":contactData.m_nsCity,@"userType":@"1"};
                [userFind addObject:dict];
            }
        }
    }];
    if([switchType isEqual:@"2"]){
        NSArray *GroupArr = [self getAllGroup];
            [GroupArr enumerateObjectsUsingBlock:^(id  _Nonnull obj, NSUInteger idx, BOOL * _Nonnull stop) {
                WCContactData *GroupData = (WCContactData *)obj;
                NSDictionary *Groupdict = @{@"nickanem":GroupData.m_nsNickName,@"toid":GroupData.m_nsUsrName,@"userType":@"2"};
                [userFind addObject:Groupdict];
            }];
    }
    return userFind;
//    NSLog(@"输出组合键:%@",userFind);
}
+ (NSArray <WCContactData *> *)getAllFriendContacts {
    ContactStorage *contactStorage = [[objc_getClass("MMServiceCenter") defaultCenter] getService:objc_getClass("ContactStorage")];
    return [contactStorage GetAllFriendContacts];
}

+ (NSArray <WCContactData *> *)getAllGroup {
    GroupStorage *contactStorage = [[objc_getClass("MMServiceCenter") defaultCenter] getService:objc_getClass("GroupStorage")];
    return [contactStorage GetAllGroups];
}

- (MessageService *)service {
    if (!_service) {
        _service = [[objc_getClass("MMServiceCenter") defaultCenter] getService:objc_getClass("MessageService")];
    }
    return _service;
}
- (NSData *)getCompressImageDataWithImg:(NSImage *)img
                                   rate:(CGFloat)rate{
    NSData *imgDt = [img TIFFRepresentation];
    if (!imgDt) {
        return nil;
    }

    NSBitmapImageRep *imageRep = [NSBitmapImageRep imageRepWithData:imgDt];
    NSDictionary *imageProps = [NSDictionary dictionaryWithObject:[NSNumber numberWithFloat:rate] forKey:NSImageCompressionFactor];
    imgDt = [imageRep representationUsingType:NSJPEGFileType properties:imageProps];
    return imgDt;
    
}
@end
