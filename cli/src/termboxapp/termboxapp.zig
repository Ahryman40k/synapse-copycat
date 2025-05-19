const std = @import("std");
const c = @cImport({
    @cInclude("termbox2.h");
});

pub const Color = @import("colors.zig").Color;
pub const Layout = @import("layout.zig").Layout;

pub const TermboxAppError = error{
    unknown,
};

pub const TermboxApp = struct {
    backcolor: Color,
    forecolor: Color,
    layout: Layout,

    pub fn init(args: struct { backcolor: Color, forecolor: Color }) TermboxAppError!TermboxApp {
        //TODO C error management
        _ = c.tb_init();
        return TermboxApp{ .backcolor = args.backcolor, .forecolor = args.forecolor, .layout = undefined };
    }

    pub fn deinit(self: TermboxApp) void {
        _ = self;

        //TODO C error management
        _ = c.tb_shutdown();
    }
};
