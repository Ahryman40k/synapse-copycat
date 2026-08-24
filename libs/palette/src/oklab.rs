//! sRGB to OKLab and back.
//!
//! Only what the cut needs: a space where the distance between two colours is
//! roughly the difference an eye sees. The constants are Björn Ottosson's, from
//! the original description of the space.

/// Perceptual lightness, and two opponent axes.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Oklab {
    pub l: f32,
    pub a: f32,
    pub b: f32,
}

/// Undo the sRGB transfer function. Skipping this is the classic mistake: the
/// stored bytes are not proportional to light, so averaging them directly
/// darkens every blend.
fn linearise(channel: u8) -> f32 {
    let value = f32::from(channel) / 255.0;
    if value <= 0.04045 {
        value / 12.92
    } else {
        ((value + 0.055) / 1.055).powf(2.4)
    }
}

fn compand(value: f32) -> u8 {
    let clamped = value.clamp(0.0, 1.0);
    let encoded = if clamped <= 0.003_130_8 {
        clamped * 12.92
    } else {
        1.055 * clamped.powf(1.0 / 2.4) - 0.055
    };
    (encoded * 255.0).round().clamp(0.0, 255.0) as u8
}

pub fn from_srgb(r: u8, g: u8, b: u8) -> Oklab {
    let (r, g, b) = (linearise(r), linearise(g), linearise(b));

    let l = (0.412_221_47 * r + 0.536_332_54 * g + 0.051_445_995 * b).cbrt();
    let m = (0.211_903_5 * r + 0.680_699_5 * g + 0.107_396_96 * b).cbrt();
    let s = (0.088_302_46 * r + 0.281_718_85 * g + 0.629_978_5 * b).cbrt();

    Oklab {
        l: 0.210_454_26 * l + 0.793_617_8 * m - 0.004_072_047 * s,
        a: 1.977_998_5 * l - 2.428_592_2 * m + 0.450_593_7 * s,
        b: 0.025_904_037 * l + 0.782_771_77 * m - 0.808_675_77 * s,
    }
}

pub fn to_srgb(colour: Oklab) -> (u8, u8, u8) {
    let l = colour.l + 0.396_337_78 * colour.a + 0.215_803_76 * colour.b;
    let m = colour.l - 0.105_561_346 * colour.a - 0.063_854_17 * colour.b;
    let s = colour.l - 0.089_484_18 * colour.a - 1.291_485_5 * colour.b;

    let (l, m, s) = (l * l * l, m * m * m, s * s * s);

    (
        compand(4.076_741_7 * l - 3.307_711_6 * m + 0.230_969_94 * s),
        compand(-1.268_438 * l + 2.609_757_4 * m - 0.341_319_38 * s),
        compand(-0.004_196_086 * l - 0.703_418_6 * m + 1.707_614_7 * s),
    )
}

/// Where a colour sits on the wheel, 0..1. Used only for ordering.
pub fn hue(colour: Oklab) -> f32 {
    colour.b.atan2(colour.a).rem_euclid(std::f32::consts::TAU) / std::f32::consts::TAU
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn survives_a_round_trip() {
        for colour in [(255, 0, 0), (0, 128, 64), (18, 52, 86), (255, 255, 255)] {
            let there = from_srgb(colour.0, colour.1, colour.2);
            let back = to_srgb(there);
            assert_eq!(back, colour, "{colour:?} did not survive");
        }
    }

    #[test]
    fn puts_black_and_white_at_the_ends() {
        assert!(from_srgb(0, 0, 0).l < 0.01);
        assert!((from_srgb(255, 255, 255).l - 1.0).abs() < 0.01);
    }

    #[test]
    fn leaves_a_grey_without_a_hue_to_speak_of() {
        let grey = from_srgb(128, 128, 128);
        assert!(grey.a.abs() < 0.01 && grey.b.abs() < 0.01, "{grey:?}");
    }
}
