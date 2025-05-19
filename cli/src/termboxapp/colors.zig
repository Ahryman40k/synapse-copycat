const tb = @cImport({
    @cInclude("termbox2.h");
});

pub const Color = enum(u32) { Default = tb.TB_DEFAULT, Black = tb.TB_BLACK, Red = tb.TB_RED, Green = tb.TB_GREEN, Yellow = tb.TB_YELLOW };
