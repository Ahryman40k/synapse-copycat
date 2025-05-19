const std = @import("std");
const tuile = @import("tuile");

var gpa = std.heap.GeneralPurposeAllocator(.{}){};

// const TermboxApp = @import("termboxapp/termboxapp.zig").TermboxApp;
// const Color = @import("termboxapp/termboxapp.zig").Color;
// const Layout = @import("termboxapp/termboxapp.zig").Layout;
// const Orientation = @import("termboxapp/layout.zig").Orientation;
// const View = @import("termboxapp/view.zig").View;

pub fn main() !void {

    // var app = try TermboxApp.init(.{ .backcolor = Color.Default, .forecolor = Color.Red });
    // defer app.deinit();
    //
    // const layout = Layout.init(gpa.allocator(), .{ .orientation = Orientation.Vertical });
    //
    // var leftPanel = try View.init(.{ .border = true, .title = "Devices" });
    // var mainPanel = try View.init(.{ .border = true, .title = "Settings" });
    // layout.add(&[_]*View{ &leftPanel, &mainPanel });
    // app.layout = layout;
    // app.do_loop();

    defer _ = gpa.deinit();

    var tui = try tuile.Tuile.init();
    defer tui.deinit();
}
