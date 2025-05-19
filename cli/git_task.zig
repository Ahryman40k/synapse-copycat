const std = @import("std");
const expect = std.testing.expect;
const expectError = std.testing.expectError;

// fn extractDefaultFolderNameFromGitRepository(allocator: std.mem.Allocator, url: []const u8) ![] const u8 {
fn extractDefaultFolderNameFromGitRepository(url: []const u8) ![]const u8 {
    var splitIterator = std.mem.splitBackwardsAny(u8, url, "/.");
    _ = splitIterator.first();
    const name = splitIterator.next() orelse unreachable;
    std.log.info("found name {s}", .{name});

    // const str = try allocator.alloc(u8, name.len);
    // @memcpy(str[0..name.len], name);

    return name;
}

test "Extract folder name from Git Url" {
    try expect(@TypeOf(extractDefaultFolderNameFromGitRepository("")) != []const u8);

    try expect(std.mem.eql(u8, try extractDefaultFolderNameFromGitRepository("https://github.com/ghostty-org/ghostty.git"), "ghostty"));
    try expect(std.mem.eql(u8, try extractDefaultFolderNameFromGitRepository("https://github.com/termbox/termbox2.git"), "termbox2"));
}

fn folderInCurrentPathExists(folderName: []const u8) bool {
    if (std.fs.Dir.access(std.fs.cwd(), folderName, .{})) |_| {
        std.log.info(
            "{s} directory already exist",
            .{folderName},
        );
        return true;
    } else |_| {
        return false;
    }
}

test "folderInCurrentPath - how to mock fs ?" {
    try expect(true);
}

fn runCommand(b: *std.Build, argv: []const []const u8) !void {
    {
        var msg = std.ArrayList(u8).init(b.allocator);
        defer msg.deinit();
        const writer = msg.writer();
        var prefix: []const u8 = "";
        for (argv) |arg| {
            try writer.print("{s}\"{s}\"", .{ prefix, arg });
            prefix = " ";
        }
        std.log.info("[RUN] {s}", .{msg.items});
    }

    var cmd = std.process.Child.init(argv, b.allocator);
    try cmd.spawn();
    _ = try cmd.wait();
}

// Act as an interface according
// https://www.nmichaels.org/zig/interfaces.html
// pub fn GitRepo() type {
//     return struct {
//         const Self = @This();
//
//         buildFn: *const fn (self: *Self, opt: anytype) void,
//
//         pub fn runBuild(self: *Self, opt: anytype) void {
//             return self.buildFn(opt);
//         }
//     };
// }

pub fn GitRepoContext() type {
    return struct {
        folder: []const u8,
    };
}

pub fn BuildContext() type {
    return struct {};
}

// Let's implement this interface
// pub fn GitRepoC(comptime TContext_: ?type) type {
pub fn GitRepoC() type {
    // const _TContext = comptime if (TContext_ == null) GitRepoContext() else TContext_.?;

    return struct {
        const Self = @This();
        // const TContext = _TContext;

        // innerRepo: GitRepo(),
        folder: []const u8 = undefined,

        pub fn init(context: GitRepoContext()) Self {
            // return .{ .folder = context.folder, .innerRepo = GitRepo(_TContext){ .buildFn = build } };
            return .{ .folder = context.folder };
        }

        pub fn build(self: Self, opt: BuildContext()) void {
            std.log.info("Run build for C repository {} {}", .{ self, opt });
        }
    };
}

pub fn GitTask(comptime TRepo: type) type {
    return struct {
        const Self = @This();
        build: *std.Build = undefined,

        pub fn init(b: *std.Build) Self {
            return .{ .build = b };
        }

        pub fn clone(self: Self, url: []const u8) !TRepo {
            // extract folder name from repository url
            const folder = try extractDefaultFolderNameFromGitRepository(url);
            // const str = self.build.allocator.alloc(u8, name.len) catch |err| {
            //     std.log.err("Cannot clone repository: {}", .{err});
            //     return undefined;
            // };
            // @memcpy(str[0..name.len], self.folder);

            // Check repository already cloned
            if (folderInCurrentPathExists(folder) == false) {
                var args = std.ArrayList([]const u8).init(self.build.allocator);
                defer args.deinit();

                try args.append("git");
                try args.append("clone");
                try args.append(url);

                try runCommand(self.build, args.items);
            }

            return TRepo.init(.{ .folder = folder });
        }
    };
}

test "Default clone" {
    // _ = try GitTask().init(null);
}


