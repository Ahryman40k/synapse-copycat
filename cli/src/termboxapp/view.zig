const std = @import("std");

pub const View = struct {
    border: bool,
    title: []const u8,

    pub fn init(args: struct { title: []const u8, border: bool }) !View {
        return View{ .border = args.border, .title = args.title };
    }

    pub fn draw(self: View) void {
        _ = self;
    }
};
