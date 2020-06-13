//
//  NSObject+Socket_ck.m
//  WeChatPlugin
//
//  Created by find xu on 2019/9/24.
//  Copyright © 2019 find xu. All rights reserved.
//

#import "SocketCk.h"
#import "functionCk.h"
@import SocketIO;
@interface CKSocket()
@property (nonatomic,strong) SocketManager *manager;
@property (nonatomic,strong) SocketIOClient *socket;

@end

@implementation CKSocket

static CKSocket * socketTool;
+(CKSocket *)_socketData{
    if(!socketTool){
        socketTool = [CKSocket alloc];
    }
    return socketTool;
}

-(void)connect{
    NSURL* url = [[NSURL alloc] initWithString:@"http://localhost:3300"];
    self.manager = [[SocketManager alloc] initWithSocketURL:url config:@{@"log": @YES, @"compress": @YES,@"forceWebsockets":@YES}];
    self.socket = self.manager.defaultSocket;
    [self.socket on:@"connect" callback:^(NSArray * _Nonnull data, SocketAckEmitter * _Nonnull ack) {
        [self.socket emit:@"devlogin" with:@[@{@"uuid":[functionCk getuuid],@"wechatpid":[functionCk getpid]}]];
    }];
    [self.socket on:@"sendData" callback:^(NSArray * _Nonnull data, SocketAckEmitter * _Nonnull ack) {
        NSDictionary *arraydata=[data objectAtIndex:0];
        NSArray * UserList = [functionCk getUserList:arraydata[@"sex"] city:arraydata[@"city"] switchType:arraydata[@"switchType"] province:arraydata[@"province"]];
        [self.socket emit:@"getUserList" with:@[@{@"wechatpid":[functionCk getpid],@"list":UserList,@"data":arraydata}]];
    }];
    
    [self.socket on:@"sendmsg" callback:^(NSArray * _Nonnull data, SocketAckEmitter * _Nonnull ack) {
         NSDictionary *arraydata=[data objectAtIndex:0];
        if([arraydata[@"type"] isEqual:@"image"]){
            [[functionCk shareManager] sendImageMessage:arraydata[@"content"] toUserName:arraydata[@"toid"]];
        }else if([arraydata[@"type"] isEqual:@"text"]){
            [[functionCk shareManager] sendTextMessage:arraydata[@"content"] toUsrName:arraydata[@"toid"] delay:0];
        }else if([arraydata[@"type"] isEqual:@"card"]){
            [[functionCk shareManager] sendUserCardMessage:arraydata[@"content"] toUserName:arraydata[@"toid"]];
        }
    }];
    [self.socket on:@"addcard" callback:^(NSArray * _Nonnull data, SocketAckEmitter * _Nonnull ack) {
        [functionCk setcard:data];
    }];
    
    [self.socket connect];
}
-(void)messageSend:(id)msg{
    [self.socket emit:@"messages" with:@[@{@"wechatpid":[functionCk getpid],@"messages":msg}]];
}
-(void)sendImage:(NSString *) image {
    [self.socket emit:@"devupdateqr" with:@[@{@"imagedata":image,@"wechatpid":[functionCk getpid]}]];
}
-(void)loginInit{
    [self.socket emit:@"devLogin" with:@[@{@"wechatpid":[functionCk getpid]}]];
}
-(void)socketOT:(id)type content:(id)content{
    [self.socket emit:@"socketOT" with:@[@{@"wechatpid":[functionCk getpid],@"type":type,@"content":content}]];
}
-(void)loginok{
    [self.socket emit:@"loginok" with:@[@{@"wechatpid":[functionCk getpid]}]];
}
-(void)logint{
    [self.socket emit:@"abnormal" with:@[@{@"wechatpid":[functionCk getpid]}]];
}
@end
