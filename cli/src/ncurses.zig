const c = @import("./bindings/ncurses.zig");
const std = @import("std");

pub const Curse = struct {
    instance: ?*c.WINDOW,

    pub fn init() !@This() {
        std.debug.print("initialize ncurses\n", .{});
        return Curse{ .instance = c.initscr() };
    }

    pub fn deinit(self: *const Curse) void {
        _ = c.endwin();
        std.debug.print("uninitialize {}", .{self.instance.?});
    }
};
