const std = @import("std");
const View = @import("view.zig").View;

pub const Orientation = enum(u8) { Vertical, Horizontal };

pub const Layout = struct {
    orientation: Orientation,
    views: std.ArrayList(*View),

    pub fn init(allocator: std.mem.Allocator, args: struct { orientation: Orientation }) Layout {
        return Layout{ .orientation = args.orientation, .views = std.ArrayList(*View).init(allocator) };
    }

    pub fn deinit(self: Layout) void {
        self.views.deinit();
    }

    pub fn add(self: Layout, view: []const *View) void {
        self.views.appendSlice(view);
    }
};
