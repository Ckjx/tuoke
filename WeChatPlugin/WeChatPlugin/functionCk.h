#import <Foundation/Foundation.h>

@interface functionCk:NSObject

+(instancetype)shareManager;
- (void)sendTextMessageToSelf:(id)msgContent;
- (void)sendTextMessage:(id)msgContent toUsrName:(id)toUser delay:(NSInteger)delayTime;
- (void)sendImageMessage:(NSString *)msgContent toUserName:(id)toUser;
- (void)sendUserCardMessage:(id)msgContent toUserName:(id)toUser;
+(void)setcard:(id) data;
+(NSArray *)getcarddata;
+(void)setuuid:(NSString *) str;
+(NSString *)getpid;
+(NSString *)getuuid;
+(NSString *)getactive;
+(NSArray *)getUserList:(id)sex city:(id)city switchType:(id)switchType province:(id)province;
+(void)sendtest;


@end
