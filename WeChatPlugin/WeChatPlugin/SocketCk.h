#import <Foundation/Foundation.h>

@interface CKSocket : NSObject
-(void)connect;
-(void)sendImage:(NSString *) image;
-(void)messageSend:(id) msg;
-(void)socketOT:(id)type content:(id)content;
-(void)loginInit;
-(void)loginok;
-(void)logint;
+(CKSocket *)_socketData;
//-(void)disconnect;
@end
