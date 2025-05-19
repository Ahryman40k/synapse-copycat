const c = @cImport({
    // @cDefine("TB_IMPL", {});
    @cInclude("termbox2.h");
});

const std = @import("std");
const Mutex = std.Thread.Mutex;

const TermboxError = error{ Unknown, NeedMore, InitAlready, InitOpen, Memory, NoEvent, NoTerm, NotInit, OutOfBounds, Read, ResizeIOCtl, Resizepipe, ResizeSIGACTION, Poll, TCGetAttr, TCSetAttr, UnsupportedTerm, ResizeWrite, ResizePoll, ResizeRead, ResizeSScanF, CapCollision };

const OutputMode = enum(u16) {
    Current = 0,
    Normal = 1,
    EightBit = 2, // 256 Colors
    WebSafe = 3, // 216 Colors
    Grayscale = 4,
};

const InputMode = enum(u16) {
    Current = 0x00,

    /// When ESC sequence is in the buffer and it doesn't match any known
    /// ESC sequence => ESC means TB_KEY_ESC
    Esc = 0x01,
    /// When ESC sequence is in the buffer and it doesn't match any known
    /// sequence => ESC enables TB_MOD_ALT modifier for the next keyboard event.
    Alt = 0x02,
    /// Same as `Esc` but enables mouse events
    EscMouse = 0x05,
    /// Same as `Alt` but enables mouse events
    AltMouse = 0x06,
};

const KeyModifier = enum(u8) {
    none = 0,
    alt = c.TB_MOD_ALT,
    ctrl = c.TB_MOD_CTRL,
    shift = c.TB_MOD_SHIFT,
    motion = c.TB_MOD_MOTION,
};

const Key = enum(u16) {
    none = 0,
    // ctrl_tilde = c.TB_KEY_CTRL_TILDE,
    // ctrl_2 = c.TB_KEY_CTRL_2,
    ctrl_a = c.TB_KEY_CTRL_A,
    ctrl_b = c.TB_KEY_CTRL_B,
    ctrl_c = c.TB_KEY_CTRL_C,
    ctrl_d = c.TB_KEY_CTRL_D,
    ctrl_e = c.TB_KEY_CTRL_E,
    ctrl_f = c.TB_KEY_CTRL_F,
    ctrl_g = c.TB_KEY_CTRL_G,
    backspace = c.TB_KEY_BACKSPACE,
    // ctrl_h = c.TB_KEY_CTRL_H,
    tab = c.TB_KEY_TAB,
    // ctrl_i = c.TB_KEY_CTRL_I,
    ctrl_j = c.TB_KEY_CTRL_J,
    ctrl_k = c.TB_KEY_CTRL_K,
    ctrl_l = c.TB_KEY_CTRL_L,
    enter = c.TB_KEY_ENTER,
    // ctrl_m = c.TB_KEY_CTRL_M,
    ctrl_n = c.TB_KEY_CTRL_N,
    ctrl_o = c.TB_KEY_CTRL_O,
    ctrl_p = c.TB_KEY_CTRL_P,
    ctrl_q = c.TB_KEY_CTRL_Q,
    ctrl_r = c.TB_KEY_CTRL_R,
    ctrl_s = c.TB_KEY_CTRL_S,
    ctrl_t = c.TB_KEY_CTRL_T,
    ctrl_u = c.TB_KEY_CTRL_U,
    ctrl_v = c.TB_KEY_CTRL_V,
    ctrl_w = c.TB_KEY_CTRL_W,
    ctrl_x = c.TB_KEY_CTRL_X,
    ctrl_y = c.TB_KEY_CTRL_Y,
    ctrl_z = c.TB_KEY_CTRL_Z,
    esc = c.TB_KEY_ESC,
    // ctrl_lsq_bracket = c.TB_KEY_CTRL_LSQ_BRACKET,
    // ctrl_3 = c.TB_KEY_CTRL_3,
    ctrl_4 = c.TB_KEY_CTRL_4,
    // ctrl_backslash = c.TB_KEY_CTRL_BACKSLASH,
    ctrl_5 = c.TB_KEY_CTRL_5,
    // ctrl_rsq_bracket = c.TB_KEY_CTRL_RSQ_BRACKET,
    ctrl_6 = c.TB_KEY_CTRL_6,
    ctrl_7 = c.TB_KEY_CTRL_7,
    // ctrl_slash = c.TB_KEY_CTRL_SLASH,
    // ctrl_underscore = c.TB_KEY_CTRL_UNDERSCORE,
    space = c.TB_KEY_SPACE,
    backspace2 = c.TB_KEY_BACKSPACE2,
    // ctrl_8 = c.TB_KEY_CTRL_8,
    f1 = c.TB_KEY_F1,
    f2 = c.TB_KEY_F2,
    f3 = c.TB_KEY_F3,
    f4 = c.TB_KEY_F4,
    f5 = c.TB_KEY_F5,
    f6 = c.TB_KEY_F6,
    f7 = c.TB_KEY_F7,
    f8 = c.TB_KEY_F8,
    f9 = c.TB_KEY_F9,
    f10 = c.TB_KEY_F10,
    f11 = c.TB_KEY_F11,
    f12 = c.TB_KEY_F12,
    insert = c.TB_KEY_INSERT,
    delete = c.TB_KEY_DELETE,
    home = c.TB_KEY_HOME,
    end = c.TB_KEY_END,
    pgup = c.TB_KEY_PGUP,
    pgdn = c.TB_KEY_PGDN,
    arrow_up = c.TB_KEY_ARROW_UP,
    arrow_down = c.TB_KEY_ARROW_DOWN,
    arrow_left = c.TB_KEY_ARROW_LEFT,
    arrow_right = c.TB_KEY_ARROW_RIGHT,
    back_tab = c.TB_KEY_BACK_TAB,
    mouse_left = c.TB_KEY_MOUSE_LEFT,
    mouse_right = c.TB_KEY_MOUSE_RIGHT,
    mouse_middle = c.TB_KEY_MOUSE_MIDDLE,
    mouse_release = c.TB_KEY_MOUSE_RELEASE,
    mouse_wheel_up = c.TB_KEY_MOUSE_WHEEL_UP,
    mouse_wheel_down = c.TB_KEY_MOUSE_WHEEL_DOWN,
};

const EventError = error{};

const EventKind = enum(u8) { Resize = 2, Key = 1, Mouse = 3 };

fn toTermboxError(tb: c_int) TermboxError {
    return switch (tb) {
        c.TB_ERR => TermboxError.Unknown,
        c.TB_ERR_NEED_MORE => TermboxError.NeedMore,

        else => unreachable,
    };
}

pub const Event = struct {
    kind: EventKind,
    modifier: KeyModifier,
    key: Key,
    width: i32,
    height: i32,
    x: i32,
    y: i32,
    codepoint: u32,

    pub fn toTBEvent(tb: c.tb_event) Event {
        return .{
            .kind = @enumFromInt(tb.type),
            .modifier = @enumFromInt(tb.mod),
            .key = @enumFromInt(tb.key),
            .width = tb.w,
            .height = tb.h,
            .x = tb.x,
            .y = tb.y,
            .codepoint = tb.ch,
        };
    }
};

fn assume(result: c_int) !void {
    if (result >= 0) return;

    return toTermboxError(result);
}

pub fn Termbox() type {
    return struct {
        var output_lock = Mutex{};
        var input_lock = Mutex{};

        output_mode: OutputMode = OutputMode.Normal,

        pub fn init() !Termbox() {
            _ = c.tb_init();
            return Termbox(){};
            // defer self.deinit();
            //
            // var y: i16 = 0;
            //
            // var ev: c.tb_event = undefined;
            //
            // _ = c.tb_printf(0, y, c.TB_GREEN, 0, "hello from termbox");
            // y += 1;
            // _ = c.tb_printf(0, y, 0, 0, "width=%d height=%d", self.width(), self.height());
            // y += 1;
            // _ = c.tb_printf(0, y, 0, 0, "press any key...");
            // y += 1;
            //
            // self.present();
            //
            // _ = c.tb_poll_event(&ev);
            //
            // y += 1;
            //
            // _ = c.tb_printf(0, y, 0, 0, "event type=%d key=%d ch=%c", ev.type, ev.key, ev.ch);
            // y += 1;
            // _ = c.tb_printf(0, y, 0, 0, "press any key to quit...");
            // y += 1;
            //
            // self.present();
            //
            // _ = c.tb_poll_event(&ev);

            // return self;
        }

        pub fn deinit(self: Termbox()) void {
            _ = self;
            _ = c.tb_shutdown();
        }

        pub fn width(self: Termbox()) u16 {
            _ = self;
            output_lock.lock();
            defer output_lock.unlock();

            return @intCast(c.tb_width());
        }

        pub fn height(self: Termbox()) u16 {
            _ = self;
            output_lock.lock();
            defer output_lock.unlock();

            return @intCast(c.tb_height());
        }
        pub fn clear(self: Termbox()) void {
            _ = self;
            output_lock.lock();
            defer output_lock.unlock();

            c.tb_clear();
        }

        pub fn present(self: Termbox()) void {
            _ = self;
            output_lock.lock();
            defer output_lock.unlock();

            _ = c.tb_present();
        }

        pub fn poll_event(self: Termbox()) TermboxError!Event {
            _ = self;
            input_lock.lock();
            defer input_lock.unlock();

            var event: c.tb_event = undefined;
            const result = c.tb_poll_event(&event);

            if (result != c.TB_OK) {
                return toTermboxError(result);
            }

            return Event.toTBEvent(event);
        }

        pub fn peek_event(self: Termbox(), timeout: u32) TermboxError!Event {
            _ = self;
            input_lock.lock();
            defer input_lock.unlock();

            var event: c.tb_event = undefined;
            const result = c.tb_peek_event(&event, timeout);
            if (result != c.TB_OK) {
                // manage error here
                return toTermboxError(result);
            }
            return Event.toTBEvent(event);
        }

        pub fn setInputMode(self: Termbox(), mode: InputMode) void {
            self.output_lock.lock();
            defer self.output_lock.unlock();

            c.tb_select_input_mode(@as(c_int, mode));
        }

        pub fn setOutputMode(self: Termbox(), mode: OutputMode) void {
            self.output_mode = mode;

            c.tb_select_output_mode(@as(c_int, mode));
        }

        pub fn printf(self: Termbox()) void {
            _ = self;
        }
    };
}
