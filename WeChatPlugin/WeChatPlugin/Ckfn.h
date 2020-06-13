#import <Foundation/Foundation.h>



@interface Ckfn : NSObject
void tk_hookMethod(Class originalClass, SEL originalSelector, Class swizzledClass, SEL swizzledSelector);
void tk_hookClassMethod(Class originalClass, SEL originalSelector, Class swizzledClass, SEL swizzledSelector);
@end

