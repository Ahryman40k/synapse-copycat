use std::path::Path;

use image::imageops::FilterType;
use image::GenericImageView;

use crate::oklab::{self, Oklab};
use crate::{Error, Result};

/// A colour, as everything outside this crate wants it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

/// How wide the image is scaled to before anything is counted.
///
/// A palette does not improve past this — the extra pixels are the same
/// colours again — and decoding a 4K wallpaper into ten thousand samples costs
/// nothing after it, while the cut over a million costs seconds.
const SAMPLE_WIDTH: u32 = 96;

/// How wide the thumbnail sent to the interface is.
const THUMB_WIDTH: u32 = 192;

/// Below this, a box holds one colour as far as an eye is concerned.
///
/// In OKLab, where 1.0 is the whole range of lightness — so this is well under
/// a step anyone could see, and comfortably above the noise a resize leaves.
const FLAT: f32 = 0.01;

/// The colours in an image, most-different-first order aside.
pub fn extract(path: &Path, count: usize) -> Result<Vec<Rgb>> {
    let image = image::open(path).map_err(|error| Error::Unreadable {
        path: path.display().to_string(),
        detail: error.to_string(),
    })?;

    extract_from(&image, count)
}

/// The same, on an image already in hand. Exported so a test can build one
/// rather than carry a fixture file.
pub fn extract_from(image: &image::DynamicImage, count: usize) -> Result<Vec<Rgb>> {
    if count == 0 || count > 16 {
        return Err(Error::Count(count));
    }

    let small = image.resize(SAMPLE_WIDTH, SAMPLE_WIDTH, FilterType::Triangle);
    let samples: Vec<Oklab> = small
        .pixels()
        .map(|(_, _, pixel)| oklab::from_srgb(pixel.0[0], pixel.0[1], pixel.0[2]))
        .collect();

    if samples.is_empty() {
        return Ok(Vec::new());
    }

    let mut boxes = vec![samples];
    // Median cut: split the widest box along its widest axis, over and over.
    // Deterministic all the way down, which is what lets a test pin the answer.
    while boxes.len() < count {
        let widest = boxes
            .iter()
            .enumerate()
            .filter(|(_, box_)| box_.len() > 1 && spread(box_) > FLAT)
            .max_by(|(_, a), (_, b)| {
                spread(a).partial_cmp(&spread(b)).unwrap_or(std::cmp::Ordering::Equal)
            })
            .map(|(index, _)| index);

        // ⚠️ Nothing left with any variation in it. A flat image has one
        // colour, and splitting it further returns the same colour several
        // times — which is what happened while the only stopping condition was
        // a box of one sample: thousands of identical pixels are not one
        // sample, so the cut went on halving them into identical pairs.
        let Some(widest) = widest else { break };

        let split = cut(boxes.swap_remove(widest));
        boxes.push(split.0);
        boxes.push(split.1);
    }

    let mut colours: Vec<Oklab> = boxes.iter().map(|box_| centre(box_)).collect();

    // Ordered by hue, because these are laid *along* a device: adjacent entries
    // are adjacent on the strip, and sorting by how common they are would put
    // unrelated hues next to each other and blend through whatever lies
    // between. By population would be the faithful order for a swatch list;
    // this is not one.
    colours.sort_by(|a, b| {
        oklab::hue(*a)
            .partial_cmp(&oklab::hue(*b))
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(colours
        .into_iter()
        .map(|colour| {
            let (r, g, b) = oklab::to_srgb(colour);
            Rgb { r, g, b }
        })
        .collect())
}

/// A small PNG of the image, base64 in a `data:` URI.
///
/// Sent with the palette rather than left for the interface to fetch: the
/// webview cannot read an arbitrary path without opening the asset protocol to
/// the whole filesystem, and the browser path has no filesystem at all. One
/// shape works in both.
pub fn thumbnail(path: &Path) -> Result<String> {
    let image = image::open(path).map_err(|error| Error::Unreadable {
        path: path.display().to_string(),
        detail: error.to_string(),
    })?;

    let small = image.resize(THUMB_WIDTH, THUMB_WIDTH, FilterType::Triangle);
    let mut bytes = std::io::Cursor::new(Vec::new());
    small
        .write_to(&mut bytes, image::ImageFormat::Png)
        .map_err(|error| Error::Unreadable {
            path: path.display().to_string(),
            detail: error.to_string(),
        })?;

    Ok(format!("data:image/png;base64,{}", base64(&bytes.into_inner())))
}

/// How far apart the extremes of a box are, on its widest axis.
fn spread(box_: &[Oklab]) -> f32 {
    let (l, a, b) = extents(box_);
    (l.1 - l.0).max(a.1 - a.0).max(b.1 - b.0)
}

fn extents(box_: &[Oklab]) -> ((f32, f32), (f32, f32), (f32, f32)) {
    let mut l = (f32::MAX, f32::MIN);
    let mut a = (f32::MAX, f32::MIN);
    let mut b = (f32::MAX, f32::MIN);

    for colour in box_ {
        l = (l.0.min(colour.l), l.1.max(colour.l));
        a = (a.0.min(colour.a), a.1.max(colour.a));
        b = (b.0.min(colour.b), b.1.max(colour.b));
    }
    (l, a, b)
}

/// Split a box in two, at the widest gap along its widest axis.
///
/// ⚠️ At the **gap**, not at the median, and the difference is the whole
/// result. Textbook median cut halves by population, which with three colours
/// in the picture and three asked for tears one cluster down the middle and
/// averages each half with its neighbour: red, blue and yellow came back as
/// blue, orange and a muddy pink. Later cuts normally repair that, and there
/// are no later cuts when the count is already reached.
///
/// Splitting where the samples are furthest apart respects the clusters that
/// are actually there, and is just as deterministic.
fn cut(mut box_: Vec<Oklab>) -> (Vec<Oklab>, Vec<Oklab>) {
    let (l, a, b) = extents(&box_);
    let widths = [l.1 - l.0, a.1 - a.0, b.1 - b.0];

    let axis = widths
        .iter()
        .enumerate()
        .max_by(|(_, x), (_, y)| x.partial_cmp(y).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(index, _)| index)
        .unwrap_or(0);

    let key = |colour: &Oklab| match axis {
        0 => colour.l,
        1 => colour.a,
        _ => colour.b,
    };
    box_.sort_by(|x, y| key(x).partial_cmp(&key(y)).unwrap_or(std::cmp::Ordering::Equal));

    // The largest step between neighbours, which is where one cluster ends and
    // the next begins. Never at 0, so both sides keep at least one sample.
    let at = (1..box_.len())
        .max_by(|x, y| {
            let gap = |index: usize| key(&box_[index]) - key(&box_[index - 1]);
            gap(*x).partial_cmp(&gap(*y)).unwrap_or(std::cmp::Ordering::Equal)
        })
        .unwrap_or(box_.len() / 2)
        .max(1);

    let tail = box_.split_off(at);
    (box_, tail)
}

/// The mean of a box — safe here, unlike over a whole image, because a box is
/// by construction a cluster of colours already close together.
fn centre(box_: &[Oklab]) -> Oklab {
    let count = box_.len().max(1) as f32;
    let sum = box_.iter().fold((0.0, 0.0, 0.0), |acc, colour| {
        (acc.0 + colour.l, acc.1 + colour.a, acc.2 + colour.b)
    });
    Oklab {
        l: sum.0 / count,
        a: sum.1 / count,
        b: sum.2 / count,
    }
}

/// Base64, written out rather than depended on: it is twenty lines and this
/// crate has one caller.
fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let block = u32::from(chunk[0]) << 16
            | u32::from(chunk.get(1).copied().unwrap_or(0)) << 8
            | u32::from(chunk.get(2).copied().unwrap_or(0));

        for slot in 0..4 {
            if slot <= chunk.len() {
                out.push(ALPHABET[(block >> (18 - slot * 6) & 0x3f) as usize] as char);
            } else {
                out.push('=');
            }
        }
    }
    out
}
