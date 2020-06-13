
#import <Foundation/Foundation.h>
#import "WeChatPlugin.h"
#import "SocketCk.h"
#import "functionCk.h"
#import "WeChat+hook.h"
static void __attribute__((constructor)) initialize(void){
    NSLog(@"开始启动---startWeChat");
    NSProcessInfo *processInfo = [NSProcessInfo processInfo];
    NSString * devuuid =[processInfo.arguments objectAtIndex:1];
    [functionCk setuuid:devuuid];
    [[CKSocket _socketData] connect];
    [NSObject hookWeChat];
}
