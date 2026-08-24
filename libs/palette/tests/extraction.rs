//! What the extractor is for, on images whose answer is known in advance.
//!
//! Built in memory rather than carried as fixture files: a checked-in JPEG is a
//! test nobody can read, and one nobody can change without a paint program.

use image::{DynamicImage, Rgb as ImageRgb, RgbImage};
use palette::{extract_from, Rgb};

/// An image made of vertical bands of the given colours, in equal measure.
fn bands(colours: &[(u8, u8, u8)]) -> DynamicImage {
    let width = 240u32;
    let height = 60u32;
    let mut image = RgbImage::new(width, height);

    for (x, _y, pixel) in image.enumerate_pixels_mut() {
        let band = (x as usize * colours.len() / width as usize).min(colours.len() - 1);
        let (r, g, b) = colours[band];
        *pixel = ImageRgb([r, g, b]);
    }

    DynamicImage::ImageRgb8(image)
}

fn near(found: Rgb, wanted: (u8, u8, u8), tolerance: i32) -> bool {
    (i32::from(found.r) - i32::from(wanted.0)).abs() <= tolerance
        && (i32::from(found.g) - i32::from(wanted.1)).abs() <= tolerance
        && (i32::from(found.b) - i32::from(wanted.2)).abs() <= tolerance
}

/// Hue in the plain HSV sense, only to check the ordering.
fn hue_of(colour: Rgb) -> f32 {
    let (r, g, b) = (
        f32::from(colour.r),
        f32::from(colour.g),
        f32::from(colour.b),
    );
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let delta = max - min;

    if delta == 0.0 {
        0.0
    } else if max == r {
        (((g - b) / delta) % 6.0 + 6.0) % 6.0
    } else if max == g {
        (b - r) / delta + 2.0
    } else {
        (r - g) / delta + 4.0
    }
}

#[test]
fn finds_the_colours_that_are_there() {
    let image = bands(&[(220, 30, 30), (30, 60, 200), (240, 200, 40)]);

    let found = extract_from(&image, 3).expect("a palette");

    assert_eq!(found.len(), 3);
    for wanted in [(220, 30, 30), (30, 60, 200), (240, 200, 40)] {
        assert!(
            found.iter().any(|colour| near(*colour, wanted, 28)),
            "{wanted:?} is in the image and not in {found:?}"
        );
    }
}

#[test]
fn does_not_return_the_average() {
    // ⚠️ The whole reason this crate exists. The mean of red, blue and yellow
    // is a muddy grey-brown, and a palette of that says nothing about the
    // picture. Nothing returned may be near it.
    let image = bands(&[(220, 30, 30), (30, 60, 200), (240, 200, 40)]);

    let found = extract_from(&image, 3).expect("a palette");

    for colour in &found {
        let spread = i32::from(colour.r.max(colour.g).max(colour.b))
            - i32::from(colour.r.min(colour.g).min(colour.b));
        assert!(
            spread > 60,
            "{colour:?} is washed out — the cut is averaging where it should be splitting"
        );
    }
}

#[test]
fn answers_the_same_thing_twice() {
    // Median cut and not k-means, precisely so this holds: a palette that comes
    // out different on the second run is one nobody can write a test against.
    let image = bands(&[(200, 40, 40), (40, 200, 80), (40, 60, 200), (200, 200, 40)]);

    assert_eq!(
        extract_from(&image, 4).expect("a palette"),
        extract_from(&image, 4).expect("a palette")
    );
}

#[test]
fn lays_the_colours_out_by_hue() {
    // They are laid *along* a device, so neighbours in the list are neighbours
    // on the strip. Sorted by how common they are, unrelated hues would sit
    // side by side and the blend between them would pass through mud.
    let image = bands(&[(240, 200, 40), (30, 60, 200), (220, 30, 30)]);

    let hues: Vec<f32> = extract_from(&image, 3)
        .expect("a palette")
        .into_iter()
        .map(hue_of)
        .collect();

    // ⚠️ Hue is circular, so "in order" means increasing with **at most one**
    // wrap past zero — red sits at the top of the wheel and next to yellow at
    // the bottom of it. Asserting plain monotonicity failed on a palette that
    // was in perfect order, which says more about the assertion than the code.
    let wraps = hues.windows(2).filter(|pair| pair[1] < pair[0]).count();

    assert!(wraps <= 1, "not in hue order: {hues:?}");
}

#[test]
fn gives_back_what_is_there_when_asked_for_more() {
    // A flat image has one colour. Asking for five must not invent four.
    let image = bands(&[(90, 140, 60)]);

    let found = extract_from(&image, 5).expect("a palette");

    assert_eq!(found.len(), 1, "{found:?}");
    assert!(near(found[0], (90, 140, 60), 24), "{found:?}");
}

#[test]
fn refuses_a_palette_that_means_nothing() {
    let image = bands(&[(10, 20, 30)]);

    assert!(extract_from(&image, 0).is_err());
    assert!(extract_from(&image, 99).is_err());
}
